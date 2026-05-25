import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  loadSquads, loadDivisions, loadPlayers,
  loadEventDays, loadEventInstances, loadPools, loadFixtures,
} from '../../../lib/data';
import type { Fixture, Pool } from '../../../lib/league';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function computePoolStandings(squadIds: string[], fixtures: Fixture[]) {
  const stats: Record<string, { p: number; w: number; d: number; l: number; pts: number }> = {};
  for (const id of squadIds) stats[id] = { p: 0, w: 0, d: 0, l: 0, pts: 0 };
  for (const fx of fixtures) {
    if (fx.scoreA === undefined || fx.scoreB === undefined) continue;
    const a = stats[fx.squadAId];
    const b = stats[fx.squadBId];
    if (!a || !b) continue;
    a.p++; b.p++;
    if (fx.scoreA > fx.scoreB)      { a.w++; a.pts += 3; b.l++; }
    else if (fx.scoreB > fx.scoreA) { b.w++; b.pts += 3; a.l++; }
    else                            { a.d++; a.pts += 1; b.d++; b.pts += 1; }
  }
  return Object.entries(stats)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w);
}

function getSquadEventPoints(
  squadId: string,
  instanceFixtures: Fixture[],
  instancePools: Pool[],
): number {
  const finalFx = instanceFixtures.find(f => f.round === 'final');
  const thirdFx = instanceFixtures.find(f => f.round === '3rd-4th');
  const poolFxs = instanceFixtures.filter(f => f.round === 'pool');

  if (finalFx?.scoreA !== undefined && finalFx?.scoreB !== undefined) {
    if (finalFx.squadAId === squadId) return finalFx.scoreA > finalFx.scoreB ? 8 : 6;
    if (finalFx.squadBId === squadId) return finalFx.scoreB > finalFx.scoreA ? 8 : 6;
  }

  if (thirdFx?.scoreA !== undefined && thirdFx?.scoreB !== undefined) {
    if (thirdFx.squadAId === squadId) return thirdFx.scoreA > thirdFx.scoreB ? 4 : 3;
    if (thirdFx.squadBId === squadId) return thirdFx.scoreB > thirdFx.scoreA ? 4 : 3;
  }

  const pool = instancePools.find(p => p.squadIds.includes(squadId));
  if (!pool) return 0;
  const pFxs = poolFxs.filter(f => f.poolId === pool.id);
  if (!pFxs.every(f => f.scoreA !== undefined && f.scoreB !== undefined)) return 0;
  const standings = computePoolStandings(pool.squadIds, pFxs);
  return standings.findIndex(s => s.id === squadId) === 2 ? 1 : 0;
}

const ROUND_LABEL: Record<string, string> = {
  pool: 'Pool', semi: 'Semi-Final', final: 'Final', '3rd-4th': '3rd / 4th',
};

export default async function SquadPage({ params }: { params: { squadId: string } }) {
  const [squads, divisions, players, eventDays, eventInstances, pools, fixtures] = await Promise.all([
    loadSquads(),
    loadDivisions(),
    loadPlayers(),
    loadEventDays(),
    loadEventInstances(),
    loadPools(),
    loadFixtures(),
  ]);

  const squad = squads.find(s => s.id === params.squadId);
  if (!squad) notFound();

  const division  = divisions.find(d => d.id === squad.divisionId);
  const roster    = players.filter(p => p.squadId === squad.id);
  const isPremier = division?.name.toLowerCase().includes('premier') ?? false;

  const squadMap     = Object.fromEntries(squads.map(s => [s.id, s]));
  const eventDayById = Object.fromEntries(eventDays.map(d => [d.id, d]));

  const divisionInstances = eventInstances.filter(i => i.divisionId === squad.divisionId);

  const today = new Date().toISOString().split('T')[0];

  // Past events: eventDay.date < today
  const pastInstances = divisionInstances.filter(inst => {
    const day = eventDayById[inst.eventDayId];
    return day && day.date < today;
  });

  // Upcoming events: eventDay.date >= today
  const upcomingInstances = divisionInstances
    .filter(inst => {
      const day = eventDayById[inst.eventDayId];
      return day && day.date >= today;
    })
    .sort((a, b) => {
      const da = eventDayById[a.eventDayId]?.date ?? '';
      const db = eventDayById[b.eventDayId]?.date ?? '';
      return da.localeCompare(db);
    });

  // Cumulative season points
  let totalPoints = 0;
  for (const inst of divisionInstances) {
    totalPoints += getSquadEventPoints(
      squad.id,
      fixtures.filter(f => f.eventInstanceId === inst.id),
      pools.filter(p => p.eventInstanceId === inst.id),
    );
  }

  // Division rank
  const divSquads = squads.filter(s => s.divisionId === squad.divisionId);
  const ranked = divSquads
    .map(s => {
      let pts = 0;
      for (const inst of divisionInstances) {
        pts += getSquadEventPoints(
          s.id,
          fixtures.filter(f => f.eventInstanceId === inst.id),
          pools.filter(p => p.eventInstanceId === inst.id),
        );
      }
      return { id: s.id, pts };
    })
    .sort((a, b) => b.pts - a.pts);
  const divisionRank = ranked.findIndex(s => s.id === squad.id) + 1;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/squads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        ← Squads
      </Link>

      {/* Header */}
      <div className="mb-8 mt-4">
        <div className="mb-2 flex items-center gap-2">
          {division && (
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                isPremier
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-slate-600 bg-slate-800 text-slate-300'
              }`}
            >
              {division.name}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-white">{squad.name}</h1>
        <p className="mt-1 text-sm text-slate-400">2026 Season · {roster.length} players</p>
      </div>

      {/* Roster */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Roster</h2>
        <ol className="overflow-hidden rounded-xl border border-slate-700">
          {roster.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center gap-4 border-b border-slate-800 bg-charcoal px-5 py-3 last:border-0"
            >
              <span className="w-6 text-sm tabular-nums text-slate-500">{index + 1}</span>
              <span className="text-white">{player.name}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Season Standing */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Season Standing</h2>
        <div className="flex items-center gap-8 rounded-xl border border-slate-700 bg-charcoal px-6 py-5">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold tabular-nums text-accent">{totalPoints}</span>
            <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Points</span>
          </div>
          <div className="h-12 w-px bg-slate-700" />
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold tabular-nums text-white">#{divisionRank}</span>
            <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {division?.name ?? ''} Rank
            </span>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Results</h2>
        {pastInstances.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-sm text-slate-400">
            No results yet — season starts 6 June 2026.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pastInstances.map(inst => {
              const eventDay      = eventDayById[inst.eventDayId];
              const instFxs       = fixtures.filter(f => f.eventInstanceId === inst.id);
              const instPools     = pools.filter(p => p.eventInstanceId === inst.id);
              const squadFxs      = instFxs
                .filter(f => f.squadAId === squad.id || f.squadBId === squad.id)
                .sort((a, b) => a.sequence - b.sequence);
              const pool          = instPools.find(p => p.squadIds.includes(squad.id));
              const poolFxs       = instFxs.filter(f => f.round === 'pool' && f.poolId === pool?.id);
              const poolStandings = pool ? computePoolStandings(pool.squadIds, poolFxs) : [];
              const poolRank      = poolStandings.findIndex(s => s.id === squad.id);
              const pts           = getSquadEventPoints(squad.id, instFxs, instPools);

              return (
                <div key={inst.id} className="overflow-hidden rounded-xl border border-slate-700 bg-charcoal">
                  <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
                    <div>
                      <p className="font-semibold text-white">{inst.sport}</p>
                      <p className="text-xs text-slate-400">{eventDay ? formatDate(eventDay.date) : ''}</p>
                    </div>
                    <span className="text-lg font-bold text-accent">{pts} pts</span>
                  </div>

                  {pool && poolRank >= 0 && (
                    <div className="border-b border-slate-800 px-5 py-2 text-xs text-slate-400">
                      Pool {pool.name} finish:{' '}
                      <span className="font-semibold text-slate-200">
                        {['1st', '2nd', '3rd', '4th'][poolRank] ?? `${poolRank + 1}th`}
                      </span>
                    </div>
                  )}

                  {squadFxs.map(fx => {
                    const isA      = fx.squadAId === squad.id;
                    const opponent = squadMap[isA ? fx.squadBId : fx.squadAId];
                    const myScore  = isA ? fx.scoreA : fx.scoreB;
                    const oppScore = isA ? fx.scoreB : fx.scoreA;
                    const hasResult = myScore !== undefined && oppScore !== undefined;
                    const won  = hasResult && myScore! > oppScore!;
                    const lost = hasResult && myScore! < oppScore!;

                    return (
                      <div key={fx.id} className="flex items-center gap-3 border-t border-slate-800 px-5 py-3">
                        <span className="w-20 shrink-0 text-xs text-slate-500">
                          {ROUND_LABEL[fx.round] ?? fx.round}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium ${
                            hasResult
                              ? won  ? 'text-green-400'
                              : lost ? 'text-red-400'
                              : 'text-slate-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {squad.name}
                        </span>
                        <span className="w-14 shrink-0 text-center text-sm font-bold tabular-nums text-slate-300">
                          {hasResult ? `${myScore} – ${oppScore}` : 'vs'}
                        </span>
                        <span className="flex-1 text-right text-sm text-slate-400">
                          {opponent?.name ?? 'TBD'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Upcoming Fixtures</h2>
        {upcomingInstances.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-sm text-slate-400">
            No upcoming fixtures.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingInstances.map(inst => {
              const eventDay    = eventDayById[inst.eventDayId];
              const scheduledFxs = fixtures.filter(f =>
                f.eventInstanceId === inst.id &&
                (f.squadAId === squad.id || f.squadBId === squad.id),
              );

              return (
                <Link
                  key={inst.id}
                  href={`/schedule/${inst.id}`}
                  className="block rounded-xl border border-slate-700 bg-charcoal px-5 py-4 transition-colors hover:border-slate-500 hover:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{inst.sport}</p>
                      <p className="text-xs text-slate-400">
                        {eventDay ? `${formatDate(eventDay.date)} · ${eventDay.venues.join(', ')}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-slate-600">›</span>
                  </div>
                  {scheduledFxs.length > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {scheduledFxs.length} fixture{scheduledFxs.length !== 1 ? 's' : ''} scheduled
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

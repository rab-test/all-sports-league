import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  loadSquads, loadDivisions, loadPlayers,
  loadEventDays, loadEventInstances, loadPools, loadFixtures,
} from '../../../lib/data';
import type { Fixture, Pool } from '../../../lib/league';

const SPORT_BORDER: Record<string, string> = {
  'Padel':             'border-l-padel',
  'Touch Rugby':       'border-l-rugby',
  'Fives Soccer':      'border-l-soccer',
  '6-a-side Cricket':  'border-l-cricket',
  'Golf':              'border-l-golf',
};

const ROUND_LABEL: Record<string, string> = {
  pool: 'Pool', semi: 'Semi-Final', final: 'Final', '3rd-4th': '3rd / 4th',
};

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
  return computePoolStandings(pool.squadIds, pFxs).findIndex(s => s.id === squadId) === 2 ? 1 : 0;
}

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

  const pastInstances = divisionInstances.filter(inst => {
    const day = eventDayById[inst.eventDayId];
    return day && day.date < today;
  });

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

  let totalPoints = 0;
  for (const inst of divisionInstances) {
    totalPoints += getSquadEventPoints(
      squad.id,
      fixtures.filter(f => f.eventInstanceId === inst.id),
      pools.filter(p => p.eventInstanceId === inst.id),
    );
  }

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
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-navy"
      >
        ← Squads
      </Link>

      {/* Header card — navy background */}
      <div className="mb-8 mt-4 overflow-hidden rounded-xl bg-navy px-6 py-6 shadow-sm">
        <div className="mb-2">
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
              isPremier
                ? 'border-accent/50 bg-accent/20 text-accent'
                : 'border-white/20 bg-white/10 text-white/70'
            }`}
          >
            {division?.name ?? ''}
          </span>
        </div>
        <h1 className="text-4xl font-black text-white">{squad.name}</h1>
        <p className="mt-1 text-sm text-white/60">2026 Season · {roster.length} players</p>
      </div>

      {/* Season Standing */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Season Standing</h2>
        <div className="flex items-center gap-8 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black tabular-nums text-accent">{totalPoints}</span>
            <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-muted">Points</span>
          </div>
          <div className="h-12 w-px bg-gray-200" />
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black tabular-nums text-navy">#{divisionRank}</span>
            <span className="mt-0.5 text-xs font-bold uppercase tracking-wider text-muted">
              {division?.name ?? ''} Rank
            </span>
          </div>
        </div>
      </section>

      {/* Roster */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Roster</h2>
        <ol className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {roster.map((player, index) => (
            <li
              key={player.id}
              className={`flex items-center gap-4 border-t border-gray-100 px-5 py-3 first:border-0 ${
                index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              <span className="w-6 text-sm tabular-nums text-muted">{index + 1}</span>
              <span className="font-semibold text-navy">{player.name}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Results */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Results</h2>
        {pastInstances.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
            No results yet — season starts 6 June 2026.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pastInstances.map(inst => {
              const eventDay   = eventDayById[inst.eventDayId];
              const instFxs    = fixtures.filter(f => f.eventInstanceId === inst.id);
              const instPools  = pools.filter(p => p.eventInstanceId === inst.id);
              const squadFxs   = instFxs
                .filter(f => f.squadAId === squad.id || f.squadBId === squad.id)
                .sort((a, b) => a.sequence - b.sequence);
              const pool         = instPools.find(p => p.squadIds.includes(squad.id));
              const poolFxs      = instFxs.filter(f => f.round === 'pool' && f.poolId === pool?.id);
              const poolStandings = pool ? computePoolStandings(pool.squadIds, poolFxs) : [];
              const poolRank     = poolStandings.findIndex(s => s.id === squad.id);
              const pts          = getSquadEventPoints(squad.id, instFxs, instPools);
              const borderClass  = SPORT_BORDER[inst.sport] ?? 'border-l-gray-400';

              return (
                <div
                  key={inst.id}
                  className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm border-l-4 ${borderClass}`}
                >
                  <div className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-black text-navy">{inst.sport}</p>
                      <p className="text-xs text-muted">{eventDay ? formatDate(eventDay.date) : ''}</p>
                    </div>
                    <span className="text-xl font-black text-accent">{pts} pts</span>
                  </div>

                  {pool && poolRank >= 0 && (
                    <div className="border-t border-gray-100 px-5 py-2 text-xs text-muted">
                      Pool {pool.name} finish:{' '}
                      <span className="font-bold text-navy">
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
                      <div
                        key={fx.id}
                        className="flex items-center gap-3 border-t border-gray-100 px-5 py-3"
                      >
                        <span className="w-20 shrink-0 text-xs font-semibold text-muted">
                          {ROUND_LABEL[fx.round] ?? fx.round}
                        </span>
                        <span
                          className={`flex-1 text-sm font-bold ${
                            hasResult
                              ? won  ? 'text-success'
                              : lost ? 'text-red'
                              : 'text-navy'
                              : 'text-muted'
                          }`}
                        >
                          {squad.name}
                        </span>
                        <span
                          className={`w-14 shrink-0 text-center tabular-nums ${
                            hasResult ? 'text-base font-black text-accent' : 'text-sm font-semibold text-muted'
                          }`}
                        >
                          {hasResult ? `${myScore} – ${oppScore}` : 'vs'}
                        </span>
                        <span className="flex-1 text-right text-sm font-semibold text-navy">
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
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Upcoming Fixtures</h2>
        {upcomingInstances.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
            No upcoming fixtures.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingInstances.map(inst => {
              const eventDay     = eventDayById[inst.eventDayId];
              const scheduledFxs = fixtures.filter(f =>
                f.eventInstanceId === inst.id &&
                (f.squadAId === squad.id || f.squadBId === squad.id),
              );
              return (
                <Link
                  key={inst.id}
                  href={`/schedule/${inst.id}`}
                  className="block rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-navy">{inst.sport}</p>
                      <p className="text-xs text-muted">
                        {eventDay
                          ? `${formatDate(eventDay.date)} · ${eventDay.venues.join(', ')}`
                          : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted">›</span>
                  </div>
                  {scheduledFxs.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted">
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

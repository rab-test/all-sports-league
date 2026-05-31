import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  loadEventInstances, loadEventDays, loadDivisions,
  loadPools, loadFixtures, loadSquads, loadGolfScores,
} from '../../../lib/data';
import type { Fixture } from '../../../lib/league';

export const dynamic = 'force-dynamic';

const GOLF_EVENT_POINTS = [8, 6, 4, 3, 2, 2, 0, 0];

const SPORT_BADGE: Record<string, string> = {
  'Padel':             'bg-padel text-white',
  'Touch Rugby':       'bg-rugby text-white',
  'Fives Soccer':      'bg-soccer text-white',
  '6-a-side Cricket':  'bg-cricket text-white',
  'Golf':              'bg-golf text-white',
  'Finals Weekend':    'bg-accent text-white',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function gdCol(sport: string): string | null {
  if (sport === 'Fives Soccer')  return 'GD';
  if (sport === 'Touch Rugby')   return 'TD';
  if (sport === 'Padel')         return 'PD';
  return null; // 6-a-side Cricket and others: no column
}

function fmtGd(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

type StandingRow = { id: string; p: number; w: number; d: number; l: number; pts: number; gd: number };

function resolveGroup(group: StandingRow[], fixtures: Fixture[]): StandingRow[] {
  const gids = new Set(group.map(r => r.id));
  const h2h: Record<string, number> = {};
  for (const r of group) h2h[r.id] = 0;

  for (const fx of fixtures) {
    if (!gids.has(fx.squadAId) || !gids.has(fx.squadBId)) continue;
    if (fx.scoreA == null || fx.scoreB == null) continue;
    const sa = Number(fx.scoreA);
    const sb = Number(fx.scoreB);
    if (isNaN(sa) || isNaN(sb)) continue;
    if (sa > sb)      { h2h[fx.squadAId] += 2; }
    else if (sb > sa) { h2h[fx.squadBId] += 2; }
    else              { h2h[fx.squadAId]++; h2h[fx.squadBId]++; }
  }

  // Circular H2H or all-draws-among-group → fall back to overall GD
  const vals = group.map(r => h2h[r.id]);
  if (vals.every(v => v === vals[0])) {
    return [...group].sort((a, b) => b.gd - a.gd);
  }

  const sorted = [...group].sort((a, b) => h2h[b.id] - h2h[a.id]);
  const out: StandingRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && h2h[sorted[j].id] === h2h[sorted[i].id]) j++;
    const sub = sorted.slice(i, j);
    out.push(...(sub.length === 1 ? sub : sub.sort((a, b) => b.gd - a.gd)));
    i = j;
  }
  return out;
}

function computeStandings(squadIds: string[], fixtures: Fixture[]): StandingRow[] {
  const stats: Record<string, { p: number; w: number; d: number; l: number; pts: number; gf: number; ga: number }> = {};
  for (const id of squadIds) stats[id] = { p: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };

  for (const fx of fixtures) {
    if (fx.scoreA == null || fx.scoreB == null) continue;
    const sa = Number(fx.scoreA);
    const sb = Number(fx.scoreB);
    if (isNaN(sa) || isNaN(sb)) continue;
    const a = stats[fx.squadAId];
    const b = stats[fx.squadBId];
    if (!a || !b) continue;
    a.p++; b.p++;
    a.gf += sa; a.ga += sb;
    b.gf += sb; b.ga += sa;
    if (sa > sb)      { a.w++; a.pts += 2; b.l++; }
    else if (sb > sa) { b.w++; b.pts += 2; a.l++; }
    else              { a.d++; a.pts += 1; b.d++; b.pts += 1; }
  }

  const rows: StandingRow[] = Object.entries(stats)
    .map(([id, s]) => ({ id, p: s.p, w: s.w, d: s.d, l: s.l, pts: s.pts, gd: s.gf - s.ga }));

  rows.sort((a, b) => b.pts - a.pts);

  const result: StandingRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && rows[j].pts === rows[i].pts) j++;
    const group = rows.slice(i, j);
    result.push(...(group.length === 1 ? group : resolveGroup(group, fixtures)));
    i = j;
  }
  return result;
}

function FixtureRow({
  fx,
  squadMap,
  label,
  poolBadge,
  highlightFinal,
}: {
  fx: Fixture;
  squadMap: Record<string, { name: string }>;
  label?: string;
  poolBadge?: string;
  highlightFinal?: boolean;
}) {
  const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 ${
        highlightFinal ? 'border-red shadow-sm' : 'border-gray-200'
      }`}
    >
      {fx.startTime && (
        <span className="w-10 shrink-0 tabular-nums text-xs text-muted">{fx.startTime}</span>
      )}
      {label && (
        <span className="w-8 shrink-0 text-xs font-bold text-muted">{label}</span>
      )}
      {poolBadge && (
        <span className="shrink-0 rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
          {poolBadge}
        </span>
      )}
      <span className={`flex-1 text-sm font-bold ${hasResult ? 'text-navy' : 'text-muted'}`}>
        {squadMap[fx.squadAId]?.name || 'TBD'}
      </span>
      <span
        className={`shrink-0 tabular-nums ${
          hasResult
            ? 'text-base font-black text-accent'
            : 'text-sm font-semibold text-muted'
        }`}
      >
        {hasResult ? `${fx.scoreA} – ${fx.scoreB}` : 'vs'}
      </span>
      <span className={`flex-1 text-right text-sm font-bold ${hasResult ? 'text-navy' : 'text-muted'}`}>
        {squadMap[fx.squadBId]?.name || 'TBD'}
      </span>
    </div>
  );
}

export default async function EventInstancePage({ params }: { params: { eventId: string } }) {
  const [instances, eventDays, divisions, pools, fixtures, squads, allGolfScores] = await Promise.all([
    loadEventInstances(),
    loadEventDays(),
    loadDivisions(),
    loadPools(),
    loadFixtures(),
    loadSquads(),
    loadGolfScores(),
  ]);

  const instance = instances.find(i => i.id === params.eventId);
  if (!instance) notFound();

  const eventDay  = eventDays.find(d => d.id === instance.eventDayId)!;
  const division  = divisions.find(d => d.id === instance.divisionId)!;
  const squadMap  = Object.fromEntries(squads.map(s => [s.id, s]));

  const instancePools    = pools.filter(p => p.eventInstanceId === params.eventId);
  const instanceFixtures = fixtures.filter(f => f.eventInstanceId === params.eventId);
  const poolFixtures     = instanceFixtures.filter(f => f.round === 'pool');
  const knockoutFixtures = instanceFixtures.filter(f => f.round !== 'pool');

  const isGolf     = instance.sport === 'Golf';
  const badgeClass = SPORT_BADGE[instance.sport] ?? 'bg-gray-200 text-navy';

  const golfScores = allGolfScores
    .filter(g => g.eventInstanceId === params.eventId)
    .sort((a, b) => a.totalScore - b.totalScore)
    .map((gs, i) => ({
      squad: squadMap[gs.squadId],
      totalScore: gs.totalScore,
      eventPoints: GOLF_EVENT_POINTS[i] ?? 0,
      position: i + 1,
    }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">

      <Link href="/schedule" className="mb-6 inline-block text-sm font-semibold text-muted transition-colors hover:text-navy">
        ← Back to Schedule
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${badgeClass}`}>
            {instance.sport}
          </span>
          <span className="text-sm font-semibold text-muted">{division?.name ?? instance.divisionId} Division</span>
        </div>
        <p className="text-2xl font-black text-navy">{formatDate(eventDay.date)}</p>
        <p className="mt-1 text-sm text-muted">{eventDay.venues.join(' · ')}</p>
      </div>

      {isGolf ? (
        <section>
          <h2 className="mb-3 text-lg font-black text-navy">Leaderboard</h2>
          {golfScores.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
              Leaderboard published after round completion
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">#</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted">Squad</th>
                    <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">Score</th>
                    <th className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-accent">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {golfScores.map((row, i) => (
                    <tr
                      key={row.squad?.id ?? i}
                      className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <td className="px-4 py-2.5 text-center font-semibold text-muted">{row.position}</td>
                      <td className="px-4 py-2.5 font-semibold text-navy">{row.squad?.name ?? 'Unknown'}</td>
                      <td className="px-2 py-2.5 text-center text-muted">{row.totalScore}</td>
                      <td className="px-2 py-2.5 text-center font-black text-accent">{row.eventPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── Pools ── */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-black text-navy">Pools</h2>
            {instancePools.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
                Draw not yet generated
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {instancePools.map(pool => {
                  const standings = computeStandings(
                    pool.squadIds,
                    poolFixtures.filter(f => f.poolId === pool.id),
                  );
                  const diffLabel = gdCol(instance.sport);
                  return (
                    <div key={pool.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="bg-navy px-4 py-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                          Pool {pool.name}
                        </h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50">
                            <th className="w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted">Squad</th>
                            <th className="w-6 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">P</th>
                            <th className="w-6 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">W</th>
                            <th className="w-6 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">D</th>
                            <th className="w-6 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">L</th>
                            {diffLabel && (
                              <th className="w-10 px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted">{diffLabel}</th>
                            )}
                            <th className="w-8 px-1 pr-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-accent">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((row, i) => (
                            <tr
                              key={row.id}
                              className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                            >
                              <td className="px-4 py-2.5 font-semibold text-navy">
                                {squadMap[row.id]?.name ?? row.id}
                              </td>
                              <td className="px-1 py-2.5 text-center text-muted">{row.p}</td>
                              <td className="px-1 py-2.5 text-center text-muted">{row.w}</td>
                              <td className="px-1 py-2.5 text-center text-muted">{row.d}</td>
                              <td className="px-1 py-2.5 text-center text-muted">{row.l}</td>
                              {diffLabel && (
                                <td className="px-1 py-2.5 text-center text-muted">{fmtGd(row.gd)}</td>
                              )}
                              <td className="px-1 pr-3 py-2.5 text-center font-black text-accent">{row.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Pool Fixtures ── */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-black text-navy">Pool Fixtures</h2>
            {instancePools.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
                Fixtures not yet scheduled
              </div>
            ) : (() => {
              const poolNameMap = Object.fromEntries(instancePools.map(p => [p.id, `Pool ${p.name}`]));
              const merged = [...poolFixtures].sort((a, b) => {
                if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                if (a.startTime) return -1;
                if (b.startTime) return 1;
                return a.sequence - b.sequence;
              });
              return (
                <div className="flex flex-col gap-2">
                  {merged.map(fx => (
                    <FixtureRow
                      key={fx.id}
                      fx={fx}
                      squadMap={squadMap}
                      poolBadge={poolNameMap[fx.poolId ?? ''] ?? ''}
                    />
                  ))}
                </div>
              );
            })()}
          </section>

          {/* ── Knockout ── */}
          <section>
            <h2 className="mb-3 text-lg font-black text-navy">Knockout</h2>
            {knockoutFixtures.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
                Bracket published after pool stage
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {(() => {
                  const semis      = knockoutFixtures.filter(f => f.round === 'semi').sort((a, b) => a.sequence - b.sequence);
                  const finals     = knockoutFixtures.filter(f => f.round === 'final');
                  const thirdFourth = knockoutFixtures.filter(f => f.round === '3rd-4th');
                  return (
                    <>
                      {semis.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Semi-Finals</p>
                          <div className="flex flex-col gap-2">
                            {semis.map((fx, i) => (
                              <FixtureRow key={fx.id} fx={fx} squadMap={squadMap} label={`SF${i + 1}`} />
                            ))}
                          </div>
                        </div>
                      )}

                      {finals.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Final</p>
                          <div className="flex flex-col gap-2">
                            {finals.map(fx => (
                              <FixtureRow key={fx.id} fx={fx} squadMap={squadMap} highlightFinal />
                            ))}
                          </div>
                        </div>
                      )}

                      {thirdFourth.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">3rd / 4th Playoff</p>
                          <div className="flex flex-col gap-2">
                            {thirdFourth.map(fx => (
                              <FixtureRow key={fx.id} fx={fx} squadMap={squadMap} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

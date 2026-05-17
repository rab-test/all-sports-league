import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventInstances, loadEventDays, loadDivisions, loadPools, loadFixtures, loadSquads } from '../../../lib/data';
import type { Fixture } from '../../../lib/league';

const SPORT_BADGE: Record<string, string> = {
  'Padel':            'bg-padel text-white',
  'Touch Rugby':      'bg-rugby text-white',
  'Fives Soccer':     'bg-soccer text-white',
  '6-a-side Cricket': 'bg-cricket text-white',
  'Golf':             'bg-golf text-white',
  'Finals Weekend':   'bg-accent text-night',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function computeStandings(squadIds: string[], fixtures: Fixture[]) {
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

function ScoreDisplay({ fx }: { fx: Fixture }) {
  const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
  return (
    <span className="text-sm font-bold text-slate-500 shrink-0 tabular-nums">
      {hasResult ? `${fx.scoreA} – ${fx.scoreB}` : 'vs'}
    </span>
  );
}

export default async function EventInstancePage({ params }: { params: { eventId: string } }) {
  const [instances, eventDays, divisions, pools, fixtures, squads] = await Promise.all([
    loadEventInstances(),
    loadEventDays(),
    loadDivisions(),
    loadPools(),
    loadFixtures(),
    loadSquads(),
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
  const badgeClass = SPORT_BADGE[instance.sport] ?? 'bg-slate-700 text-white';

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">

      <Link href="/schedule" className="text-sm text-slate-400 hover:text-white mb-6 inline-block">
        ← Back to Schedule
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${badgeClass}`}>
            {instance.sport}
          </span>
          <span className="text-slate-400 text-sm">{division?.name ?? instance.divisionId} Division</span>
        </div>
        <p className="text-white text-xl font-semibold">{formatDate(eventDay.date)}</p>
        <p className="text-slate-400 text-sm mt-1">{eventDay.venues.join(' · ')}</p>
      </div>

      {isGolf ? (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Leaderboard</h2>
          <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-slate-400 text-sm">
            Leaderboard published after round completion
          </div>
        </section>
      ) : (
        <>
          {/* ── Pools ── */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">Pools</h2>
            {instancePools.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-slate-400 text-sm">
                Draw not yet generated
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {instancePools.map(pool => {
                  const standings = computeStandings(
                    pool.squadIds,
                    poolFixtures.filter(f => f.poolId === pool.id),
                  );
                  return (
                    <div key={pool.id} className="rounded-xl border border-slate-700 bg-charcoal overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Pool {pool.name}
                        </h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase">
                            <th className="px-4 py-2 text-left">Squad</th>
                            <th className="px-2 py-2 text-center">P</th>
                            <th className="px-2 py-2 text-center">W</th>
                            <th className="px-2 py-2 text-center">D</th>
                            <th className="px-2 py-2 text-center">L</th>
                            <th className="px-2 py-2 text-center text-accent">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map(row => (
                            <tr key={row.id} className="border-t border-slate-800">
                              <td className="px-4 py-2.5 text-white font-medium">
                                {squadMap[row.id]?.name ?? row.id}
                              </td>
                              <td className="px-2 py-2.5 text-center text-slate-400">{row.p}</td>
                              <td className="px-2 py-2.5 text-center text-slate-400">{row.w}</td>
                              <td className="px-2 py-2.5 text-center text-slate-400">{row.d}</td>
                              <td className="px-2 py-2.5 text-center text-slate-400">{row.l}</td>
                              <td className="px-2 py-2.5 text-center font-bold text-accent">{row.pts}</td>
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
            <h2 className="text-lg font-semibold text-white mb-3">Pool Fixtures</h2>
            {instancePools.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-slate-400 text-sm">
                Fixtures not yet scheduled
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {instancePools.map(pool => {
                  const pf = poolFixtures
                    .filter(f => f.poolId === pool.id)
                    .sort((a, b) => a.sequence - b.sequence);
                  return (
                    <div key={pool.id}>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Pool {pool.name} Fixtures
                      </p>
                      {pf.length === 0 ? (
                        <div className="rounded-xl border border-slate-700 bg-charcoal p-4 text-center text-slate-400 text-sm">
                          Fixtures not yet scheduled
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {pf.map(fx => {
                            const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
                            return (
                              <div
                                key={fx.id}
                                className="rounded-lg border border-slate-700 bg-night/60 px-4 py-3 flex items-center justify-between gap-2"
                              >
                                <span className={`text-sm font-medium flex-1 ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                  {squadMap[fx.squadAId]?.name ?? fx.squadAId}
                                </span>
                                <ScoreDisplay fx={fx} />
                                <span className={`text-sm font-medium flex-1 text-right ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                  {squadMap[fx.squadBId]?.name ?? fx.squadBId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Knockout ── */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Knockout</h2>
            {knockoutFixtures.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-charcoal p-5 text-center text-slate-400 text-sm">
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
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Semi-Finals</p>
                          <div className="flex flex-col gap-2">
                            {semis.map((fx, i) => {
                              const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
                              return (
                                <div key={fx.id} className="rounded-lg border border-slate-700 bg-night/60 px-4 py-3 flex items-center gap-2">
                                  <span className="text-xs text-slate-600 shrink-0 w-6">SF{i + 1}</span>
                                  <span className={`text-sm font-medium flex-1 ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadAId]?.name || 'TBD'}
                                  </span>
                                  <ScoreDisplay fx={fx} />
                                  <span className={`text-sm font-medium flex-1 text-right ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadBId]?.name || 'TBD'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {finals.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Final</p>
                          <div className="flex flex-col gap-2">
                            {finals.map(fx => {
                              const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
                              return (
                                <div key={fx.id} className="rounded-lg border border-accent/30 bg-night/60 px-4 py-3 flex items-center justify-between gap-2">
                                  <span className={`text-sm font-medium flex-1 ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadAId]?.name || 'TBD'}
                                  </span>
                                  <span className="text-sm font-bold text-accent shrink-0 tabular-nums">
                                    {hasResult ? `${fx.scoreA} – ${fx.scoreB}` : 'Final'}
                                  </span>
                                  <span className={`text-sm font-medium flex-1 text-right ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadBId]?.name || 'TBD'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {thirdFourth.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">3rd / 4th Playoff</p>
                          <div className="flex flex-col gap-2">
                            {thirdFourth.map(fx => {
                              const hasResult = fx.scoreA !== undefined && fx.scoreB !== undefined;
                              return (
                                <div key={fx.id} className="rounded-lg border border-slate-700 bg-night/60 px-4 py-3 flex items-center justify-between gap-2">
                                  <span className={`text-sm font-medium flex-1 ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadAId]?.name || 'TBD'}
                                  </span>
                                  <ScoreDisplay fx={fx} />
                                  <span className={`text-sm font-medium flex-1 text-right ${hasResult ? 'text-white' : 'text-slate-400'}`}>
                                    {squadMap[fx.squadBId]?.name || 'TBD'}
                                  </span>
                                </div>
                              );
                            })}
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

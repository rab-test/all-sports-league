import Link from 'next/link';
import {
  loadDivisions, loadSquads, loadPlayers,
  loadEventInstances, loadFixtures, loadPools,
} from '../../lib/data';
import type { Fixture, Pool } from '../../lib/league';

function computePoolStandings(squadIds: string[], fixtures: Fixture[]) {
  const stats: Record<string, { pts: number; w: number }> = {};
  for (const id of squadIds) stats[id] = { pts: 0, w: 0 };
  for (const fx of fixtures) {
    if (fx.scoreA === undefined || fx.scoreB === undefined) continue;
    const a = stats[fx.squadAId];
    const b = stats[fx.squadBId];
    if (!a || !b) continue;
    if (fx.scoreA > fx.scoreB)      { a.pts += 3; a.w++; }
    else if (fx.scoreB > fx.scoreA) { b.pts += 3; b.w++; }
    else                            { a.pts += 1; b.pts += 1; }
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

export default async function SquadsPage() {
  const [divisions, squads, players, eventInstances, fixtures, pools] = await Promise.all([
    loadDivisions(),
    loadSquads(),
    loadPlayers(),
    loadEventInstances(),
    loadFixtures(),
    loadPools(),
  ]);

  const squadPoints: Record<string, number> = {};
  for (const squad of squads) {
    const divInstances = eventInstances.filter(
      i => i.divisionId === squad.divisionId && i.sport !== 'Golf',
    );
    squadPoints[squad.id] = divInstances.reduce(
      (sum, inst) => sum + getSquadEventPoints(
        squad.id,
        fixtures.filter(f => f.eventInstanceId === inst.id),
        pools.filter(p => p.eventInstanceId === inst.id),
      ),
      0,
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Squads</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — 16 squads across 2 divisions</p>

      <div className="flex flex-col gap-10">
        {divisions.map(division => {
          const isPremier = division.name.toLowerCase().includes('premier');
          const divisionSquads = squads
            .filter(s => s.divisionId === division.id)
            .sort((a, b) => (squadPoints[b.id] ?? 0) - (squadPoints[a.id] ?? 0));

          return (
            <section key={division.id}>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    isPremier
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-gray-300 bg-gray-100 text-muted'
                  }`}
                >
                  {division.name}
                </span>
                <span className="text-xs text-muted">{divisionSquads.length} squads</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {divisionSquads.map(squad => {
                  const playerCount = players.filter(p => p.squadId === squad.id).length;
                  const points = squadPoints[squad.id] ?? 0;
                  return (
                    <Link
                      key={squad.id}
                      href={`/squads/${squad.id}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-navy">{squad.name}</span>
                        <span className="text-xs text-muted">{playerCount} players</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black tabular-nums text-accent">{points}</span>
                          <span className="text-xs text-muted">pts</span>
                        </div>
                        <span className="text-xs text-muted">›</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

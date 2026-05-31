import {
  loadDivisions, loadSquads, loadPlayers,
  loadEventInstances, loadFixtures, loadPools,
} from '../../lib/data';
import type { Fixture, Pool } from '../../lib/league';
import SquadsClient from './SquadsClient';

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

  const squadRows = squads
    .map(squad => {
      const divInstances = eventInstances.filter(
        i => i.divisionId === squad.divisionId && i.sport !== 'Golf',
      );
      const points = divInstances.reduce(
        (sum, inst) => sum + getSquadEventPoints(
          squad.id,
          fixtures.filter(f => f.eventInstanceId === inst.id),
          pools.filter(p => p.eventInstanceId === inst.id),
        ),
        0,
      );
      return {
        id: squad.id,
        name: squad.name,
        divisionId: squad.divisionId,
        playerCount: players.filter(p => p.squadId === squad.id).length,
        points,
      };
    })
    .sort((a, b) => b.points - a.points);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Squads</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — 16 squads across 2 divisions</p>
      <SquadsClient divisions={divisions} squads={squadRows} />
    </main>
  );
}

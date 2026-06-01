import type { Squad, EventInstance, Pool, Fixture, GolfScore } from './league';

export type SquadStanding = { played: number; points: number };

function sortedPoolStandings(squadIds: string[], fixtures: Fixture[]): string[] {
  const stats: Record<string, { pts: number; gf: number; ga: number }> = {};
  for (const id of squadIds) stats[id] = { pts: 0, gf: 0, ga: 0 };

  for (const fx of fixtures) {
    const sA = fx.scoreA ?? undefined;
    const sB = fx.scoreB ?? undefined;
    if (sA === undefined || sB === undefined) continue;
    const a = stats[fx.squadAId];
    const b = stats[fx.squadBId];
    if (!a || !b) continue;
    a.gf += sA; a.ga += sB;
    b.gf += sB; b.ga += sA;
    if (sA > sB)      { a.pts += 2; }
    else if (sB > sA) { b.pts += 2; }
    else              { a.pts++; b.pts++; }
  }

  return Object.entries(stats)
    .sort(([, a], [, b]) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return (b.gf - b.ga) - (a.gf - a.ga);
    })
    .map(([id]) => id);
}

export function computeStandings(
  squads: Squad[],
  instances: EventInstance[],
  pools: Pool[],
  fixtures: Fixture[],
  golfScores: (GolfScore & { _recordId: string })[],
): Record<string, SquadStanding> {
  const result: Record<string, SquadStanding> = {};
  for (const s of squads) result[s.id] = { played: 0, points: 0 };

  for (const instance of instances) {
    const divSquads = squads.filter(s => s.divisionId === instance.divisionId);
    const instFx = fixtures.filter(f => f.eventInstanceId === instance.id);

    if (instance.sport === 'Golf') {
      const scores = golfScores.filter(g => g.eventInstanceId === instance.id);
      if (scores.length === 0) continue;
      if (!divSquads.every(s => scores.some(g => g.squadId === s.id))) continue;

      const sorted = [...scores].sort((a, b) => a.totalScore - b.totalScore);
      const placementPts = [8, 6, 4, 3];
      for (let i = 0; i < sorted.length; i++) {
        const sq = result[sorted[i].squadId];
        if (sq) { sq.played++; sq.points += placementPts[i] ?? 0; }
      }
      continue;
    }

    // Preset A: only award points when the final and 3rd/4th are both scored
    const finalFx = instFx.find(f => f.round === 'final');
    const thirdFx = instFx.find(f => f.round === '3rd-4th');
    if (!finalFx || finalFx.scoreA == null || finalFx.scoreB == null) continue;
    if (!thirdFx || thirdFx.scoreA == null || thirdFx.scoreB == null) continue;

    const poolFx = instFx.filter(f => f.round === 'pool');
    const instPools = pools.filter(p => p.eventInstanceId === instance.id);

    const fA = finalFx.scoreA ?? 0, fB = finalFx.scoreB ?? 0;
    const finalWinner = fA > fB ? finalFx.squadAId : finalFx.squadBId;
    const finalLoser  = fA > fB ? finalFx.squadBId : finalFx.squadAId;

    const tA = thirdFx.scoreA ?? 0, tB = thirdFx.scoreB ?? 0;
    const thirdWinner = tA > tB ? thirdFx.squadAId : thirdFx.squadBId;
    const thirdLoser  = tA > tB ? thirdFx.squadBId : thirdFx.squadAId;

    const pointsMap: Record<string, number> = {
      [finalWinner]: 8,
      [finalLoser]:  6,
      [thirdWinner]: 4,
      [thirdLoser]:  3,
    };
    const knockoutSet = new Set(Object.keys(pointsMap));

    for (const pool of instPools) {
      const pFixtures = poolFx.filter(f => f.poolId === pool.id);
      const standing = sortedPoolStandings(pool.squadIds, pFixtures);
      for (let i = 2; i < standing.length; i++) {
        const sid = standing[i];
        if (!knockoutSet.has(sid) && !(sid in pointsMap)) {
          pointsMap[sid] = i === 2 ? 1 : 0;
        }
      }
    }

    for (const squad of divSquads) {
      const sq = result[squad.id];
      if (!sq) continue;
      const pts = pointsMap[squad.id];
      if (pts !== undefined) {
        sq.played++;
        sq.points += pts;
      }
    }
  }

  return result;
}

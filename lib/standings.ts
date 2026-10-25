import type { Squad, EventInstance, EventDay, Pool, Fixture, GolfScore } from './league';
import { GOLF_EVENT_POINTS } from './league';
import { EVENT_POINTS_OVERRIDES } from '../data/event-points-overrides';

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

// Points each squad in the division earned for a single event instance, or
// null if the instance hasn't concluded yet (results not fully captured).
function computeEventInstancePoints(
  instance: EventInstance,
  divSquads: Squad[],
  instFx: Fixture[],
  instPools: Pool[],
  golfScores: (GolfScore & { _recordId: string })[],
): Record<string, number> | null {
  const override = EVENT_POINTS_OVERRIDES[instance.id];
  if (override) return override;

  if (instance.sport === 'Golf') {
    const scores = golfScores.filter(g => g.eventInstanceId === instance.id);
    if (scores.length === 0) return null;
    if (!divSquads.every(s => scores.some(g => g.squadId === s.id))) return null;

    const sorted = [...scores].sort((a, b) => a.totalScore - b.totalScore);
    const pointsMap: Record<string, number> = {};
    for (let i = 0; i < sorted.length; i++) {
      pointsMap[sorted[i].squadId] = GOLF_EVENT_POINTS[i] ?? 0;
    }
    return pointsMap;
  }

  // Preset A: only award points when the final and 3rd/4th are both scored
  const finalFx = instFx.find(f => f.round === 'final');
  const thirdFx = instFx.find(f => f.round === '3rd-4th');
  if (!finalFx || finalFx.scoreA == null || finalFx.scoreB == null) return null;
  if (!thirdFx || thirdFx.scoreA == null || thirdFx.scoreB == null) return null;

  const poolFx = instFx.filter(f => f.round === 'pool');

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

  return pointsMap;
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
    const instPools = pools.filter(p => p.eventInstanceId === instance.id);

    const pointsMap = computeEventInstancePoints(instance, divSquads, instFx, instPools, golfScores);
    if (!pointsMap) continue;

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

// ── Season-long history, for the standings trend chart ───────────────────────

export type DivisionHistory = {
  // One entry per concluded event instance, chronological.
  events: { id: string; date: string; sport: string }[];
  // squadId -> cumulative points after each event in `events` (same length/order).
  cumulative: Record<string, number[]>;
};

export function computeStandingsHistory(
  squads: Squad[],
  instances: EventInstance[],
  eventDays: EventDay[],
  pools: Pool[],
  fixtures: Fixture[],
  golfScores: (GolfScore & { _recordId: string })[],
): Record<string, DivisionHistory> {
  const dayById = new Map(eventDays.map(d => [d.id, d]));
  const sortedInstances = [...instances].sort((a, b) => {
    const da = dayById.get(a.eventDayId)?.date ?? '';
    const db = dayById.get(b.eventDayId)?.date ?? '';
    return da.localeCompare(db);
  });

  const result: Record<string, DivisionHistory> = {};
  const running: Record<string, number> = {};
  for (const s of squads) running[s.id] = 0;

  for (const instance of sortedInstances) {
    const divSquads = squads.filter(s => s.divisionId === instance.divisionId);
    const instFx = fixtures.filter(f => f.eventInstanceId === instance.id);
    const instPools = pools.filter(p => p.eventInstanceId === instance.id);

    const pointsMap = computeEventInstancePoints(instance, divSquads, instFx, instPools, golfScores);
    if (!pointsMap) continue;

    for (const squad of divSquads) {
      running[squad.id] = (running[squad.id] ?? 0) + (pointsMap[squad.id] ?? 0);
    }

    if (!result[instance.divisionId]) {
      const cumulative: Record<string, number[]> = {};
      for (const s of divSquads) cumulative[s.id] = [];
      result[instance.divisionId] = { events: [], cumulative };
    }
    const history = result[instance.divisionId];
    history.events.push({
      id: instance.id,
      date: dayById.get(instance.eventDayId)?.date ?? '',
      sport: instance.sport,
    });
    for (const squad of divSquads) {
      history.cumulative[squad.id].push(running[squad.id]);
    }
  }

  return result;
}

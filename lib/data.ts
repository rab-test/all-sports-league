import { fetchTable } from './airtable';
import type { Season, Division, Squad, Player, EventDay, EventInstance, Pool, Fixture, GolfScore } from './league';

function parseArr(val: unknown): string[] {
  if (!val || typeof val !== 'string') return [];
  try { return JSON.parse(val); } catch { return []; }
}

export async function loadSeasons(): Promise<Season[]> {
  return fetchTable<Season>('Seasons');
}

export async function loadDivisions(): Promise<Division[]> {
  return fetchTable<Division>('Divisions');
}

export async function loadSquads(): Promise<Squad[]> {
  return fetchTable<Squad>('Squads');
}

export async function loadPlayers(): Promise<Player[]> {
  return fetchTable<Player>('Players');
}

export async function loadEventDays(): Promise<EventDay[]> {
  const records = await fetchTable<Record<string, unknown>>('EventDays');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map(r => ({ ...r, venues: parseArr(r.venues) })) as unknown as EventDay[];
}

export async function loadEventInstances(): Promise<EventInstance[]> {
  const records = await fetchTable<Record<string, unknown>>('EventInstances');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map(r => ({ ...r, locked: r.locked === true })) as unknown as EventInstance[];
}

export async function loadPools(): Promise<Pool[]> {
  const records = await fetchTable<Record<string, unknown>>('Pools');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return records.map(r => ({ ...r, squadIds: parseArr(r.squadIds) })) as unknown as Pool[];
}

export async function loadFixtures(): Promise<Fixture[]> {
  const records = await fetchTable<Record<string, unknown>>('Fixtures');
  return records.map(r => ({
    ...r,
    poolId: r.poolId || null,
    scoreA: typeof r.scoreA === 'number' ? r.scoreA : undefined,
    scoreB: typeof r.scoreB === 'number' ? r.scoreB : undefined,
    pair1A: typeof r.pair1A === 'number' ? r.pair1A : undefined,
    pair1B: typeof r.pair1B === 'number' ? r.pair1B : undefined,
    pair2A: typeof r.pair2A === 'number' ? r.pair2A : undefined,
    pair2B: typeof r.pair2B === 'number' ? r.pair2B : undefined,
    pair3A: typeof r.pair3A === 'number' ? r.pair3A : undefined,
    pair3B: typeof r.pair3B === 'number' ? r.pair3B : undefined,
    locked: r.locked === true,
    sfOverride: r.sfOverride === true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as unknown as Fixture[];
}

export async function loadGolfScores(): Promise<(GolfScore & { _recordId: string })[]> {
  const records = await fetchTable<Record<string, unknown>>('GolfScores');
  return records.map(r => ({
    _recordId: r._recordId as string,
    eventInstanceId: r.eventInstanceId as string,
    squadId: r.squadId as string,
    totalScore: r.totalScore as number,
  }));
}

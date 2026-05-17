import { NextResponse } from 'next/server';
import { fetchTable, createRecords, deleteRecords } from '../../../../lib/airtable';
import { loadEventInstances, loadSquads } from '../../../../lib/data';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRoundRobin(
  squadIds: string[],
  eventInstanceId: string,
  poolId: string,
  poolLabel: string,
) {
  const fixtures: Record<string, unknown>[] = [];
  let seq = 0;
  for (let i = 0; i < squadIds.length; i++) {
    for (let j = i + 1; j < squadIds.length; j++) {
      seq++;
      fixtures.push({
        id: `fixture-${eventInstanceId}-${poolLabel.toLowerCase()}-${seq}`,
        eventInstanceId,
        poolId,
        squadAId: squadIds[i],
        squadBId: squadIds[j],
        round: 'pool',
        sequence: seq,
      });
    }
  }
  return fixtures;
}

export async function POST(request: Request) {
  const { eventInstanceId } = await request.json();

  const [instances, squads, existingPools, existingFixtures] = await Promise.all([
    loadEventInstances(),
    loadSquads(),
    fetchTable<Record<string, unknown>>('Pools'),
    fetchTable<Record<string, unknown>>('Fixtures'),
  ]);

  const instance = instances.find(i => i.id === eventInstanceId);
  if (!instance) {
    return NextResponse.json({ error: 'Event instance not found' }, { status: 404 });
  }

  const divisionSquads = squads.filter(s => s.divisionId === instance.divisionId);
  const shuffled       = shuffle(divisionSquads);
  const half           = Math.ceil(shuffled.length / 2);

  const poolAId       = `pool-${eventInstanceId}-a`;
  const poolBId       = `pool-${eventInstanceId}-b`;
  const poolASquadIds = shuffled.slice(0, half).map(s => s.id);
  const poolBSquadIds = shuffled.slice(half).map(s => s.id);

  // Delete existing pools and fixtures for this event instance
  const poolsToDelete    = existingPools.filter(p => p.eventInstanceId === eventInstanceId);
  const fixturesToDelete = existingFixtures.filter(f => f.eventInstanceId === eventInstanceId);

  await Promise.all([
    poolsToDelete.length > 0
      ? deleteRecords('Pools', poolsToDelete.map(p => p._recordId as string))
      : Promise.resolve(),
    fixturesToDelete.length > 0
      ? deleteRecords('Fixtures', fixturesToDelete.map(f => f._recordId as string))
      : Promise.resolve(),
  ]);

  // Create new pools
  await createRecords('Pools', [
    { id: poolAId, eventInstanceId, name: 'A', squadIds: JSON.stringify(poolASquadIds) },
    { id: poolBId, eventInstanceId, name: 'B', squadIds: JSON.stringify(poolBSquadIds) },
  ]);

  // Create fixtures
  const newFixtureFields = [
    ...buildRoundRobin(poolASquadIds, eventInstanceId, poolAId, 'A'),
    ...buildRoundRobin(poolBSquadIds, eventInstanceId, poolBId, 'B'),
  ];
  await createRecords('Fixtures', newFixtureFields);

  // Create knockout stubs so the bracket is visible immediately (squads fill in after pool results)
  const knockoutStubs = [
    { id: `sf1-${eventInstanceId}`,    eventInstanceId, poolId: '', squadAId: '', squadBId: '', round: 'semi',    sequence: 1 },
    { id: `sf2-${eventInstanceId}`,    eventInstanceId, poolId: '', squadAId: '', squadBId: '', round: 'semi',    sequence: 2 },
    { id: `final-${eventInstanceId}`,  eventInstanceId, poolId: '', squadAId: '', squadBId: '', round: 'final',   sequence: 1 },
    { id: `3rd4th-${eventInstanceId}`, eventInstanceId, poolId: '', squadAId: '', squadBId: '', round: '3rd-4th', sequence: 1 },
  ];
  await createRecords('Fixtures', knockoutStubs);

  return NextResponse.json({
    success: true,
    pools: [
      { id: poolAId, eventInstanceId, name: 'A', squadIds: poolASquadIds },
      { id: poolBId, eventInstanceId, name: 'B', squadIds: poolBSquadIds },
    ],
    fixtures: [...newFixtureFields, ...knockoutStubs],
  });
}

import { NextResponse } from 'next/server';
import { loadJson } from '../../../../lib/data';
import type { EventInstance, Squad, Pool, Fixture } from '../../../../lib/league';
import fs from 'fs';
import path from 'path';

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(process.cwd(), 'data', filename), JSON.stringify(data, null, 2));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roundRobin(pool: Pool, eventInstanceId: string): Fixture[] {
  const out: Fixture[] = [];
  const ids = pool.squadIds;
  let seq = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      seq++;
      out.push({
        id: `fixture-${eventInstanceId}-${pool.label.toLowerCase()}-${seq}`,
        eventInstanceId,
        poolId: pool.id,
        squadAId: ids[i],
        squadBId: ids[j],
        round: 'pool',
        sequence: seq,
      });
    }
  }
  return out;
}

export async function POST(request: Request) {
  const { eventInstanceId } = await request.json();

  const instances = loadJson<EventInstance[]>('event-instances.json');
  const instance  = instances.find(i => i.id === eventInstanceId);
  if (!instance) {
    return NextResponse.json({ error: 'Event instance not found' }, { status: 404 });
  }

  const squads         = loadJson<Squad[]>('squads.json');
  const divisionSquads = squads.filter(s => s.divisionId === instance.divisionId);
  const shuffled       = shuffle(divisionSquads);
  const half           = Math.ceil(shuffled.length / 2);

  const poolA: Pool = {
    id: `pool-${eventInstanceId}-a`,
    eventInstanceId,
    label: 'A',
    squadIds: shuffled.slice(0, half).map(s => s.id),
  };
  const poolB: Pool = {
    id: `pool-${eventInstanceId}-b`,
    eventInstanceId,
    label: 'B',
    squadIds: shuffled.slice(half).map(s => s.id),
  };

  const newFixtures = [...roundRobin(poolA, eventInstanceId), ...roundRobin(poolB, eventInstanceId)];

  const existingPools    = loadJson<Pool[]>('pools.json');
  const existingFixtures = loadJson<Fixture[]>('fixtures.json');

  const updatedPools    = [...existingPools.filter(p => p.eventInstanceId !== eventInstanceId), poolA, poolB];
  const updatedFixtures = [...existingFixtures.filter(f => f.eventInstanceId !== eventInstanceId), ...newFixtures];

  writeJson('pools.json', updatedPools);
  writeJson('fixtures.json', updatedFixtures);

  return NextResponse.json({ success: true, pools: [poolA, poolB], fixtures: newFixtures });
}

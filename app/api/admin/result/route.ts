import { NextResponse } from 'next/server';
import { fetchTable, updateRecord } from '../../../../lib/airtable';
import { loadPools } from '../../../../lib/data';

type RawFx = Record<string, unknown> & { _recordId: string };

function poolStandings(squadIds: string[], fixtures: RawFx[]) {
  const stats: Record<string, { pts: number; w: number }> = {};
  for (const id of squadIds) stats[id] = { pts: 0, w: 0 };

  for (const fx of fixtures) {
    const sA = typeof fx.scoreA === 'number' ? fx.scoreA : undefined;
    const sB = typeof fx.scoreB === 'number' ? fx.scoreB : undefined;
    if (sA === undefined || sB === undefined) continue;
    const a = stats[fx.squadAId as string];
    const b = stats[fx.squadBId as string];
    if (!a || !b) continue;
    if (sA > sB)      { a.pts += 2; a.w++; }
    else if (sB > sA) { b.pts += 2; b.w++; }
    else              { a.pts++;    b.pts++; }
  }

  return Object.entries(stats)
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w);
}

async function maybeUpdateSemis(eid: string, allFx: RawFx[]) {
  const poolFx    = allFx.filter(f => f.eventInstanceId === eid && f.round === 'pool');
  const allScored = poolFx.length > 0 && poolFx.every(
    f => typeof f.scoreA === 'number' && typeof f.scoreB === 'number'
  );
  if (!allScored) return;

  const pools    = await loadPools();
  const poolA    = pools.find(p => p.eventInstanceId === eid && p.name === 'A');
  const poolB    = pools.find(p => p.eventInstanceId === eid && p.name === 'B');
  if (!poolA || !poolB) return;

  const pAStand = poolStandings(poolA.squadIds, poolFx.filter(f => f.poolId === poolA.id));
  const pBStand = poolStandings(poolB.squadIds, poolFx.filter(f => f.poolId === poolB.id));
  if (pAStand.length < 2 || pBStand.length < 2) return;

  const sf1 = allFx.find(f => f.id === `sf1-${eid}`);
  const sf2 = allFx.find(f => f.id === `sf2-${eid}`);
  await Promise.all([
    sf1 && !sf1.sfOverride ? updateRecord('Fixtures', sf1._recordId, { squadAId: pAStand[0].id, squadBId: pBStand[1].id }) : null,
    sf2 && !sf2.sfOverride ? updateRecord('Fixtures', sf2._recordId, { squadAId: pBStand[0].id, squadBId: pAStand[1].id }) : null,
  ]);
}

async function maybeUpdateFinal(eid: string, allFx: RawFx[]) {
  const semis = allFx.filter(f => f.eventInstanceId === eid && f.round === 'semi');
  if (semis.length !== 2) return;
  const allScored = semis.every(
    f => typeof f.scoreA === 'number' && typeof f.scoreB === 'number'
  );
  if (!allScored) return;

  const sf1 = semis.find(f => (f.sequence as number) === 1)!;
  const sf2 = semis.find(f => (f.sequence as number) === 2)!;

  const winner = (fx: RawFx) =>
    (fx.scoreA as number) >= (fx.scoreB as number)
      ? fx.squadAId as string
      : fx.squadBId as string;
  const loser = (fx: RawFx) =>
    (fx.scoreA as number) >= (fx.scoreB as number)
      ? fx.squadBId as string
      : fx.squadAId as string;

  const final = allFx.find(f => f.id === `final-${eid}`);
  const third = allFx.find(f => f.id === `3rd4th-${eid}`);
  await Promise.all([
    final ? updateRecord('Fixtures', final._recordId, { squadAId: winner(sf1), squadBId: winner(sf2) }) : null,
    third ? updateRecord('Fixtures', third._recordId, { squadAId: loser(sf1),  squadBId: loser(sf2)  }) : null,
  ]);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { fixtureId } = body;

  const allFx  = await fetchTable<Record<string, unknown>>('Fixtures') as RawFx[];
  const fixture = allFx.find(f => f.id === fixtureId);
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  const updateFields: Record<string, unknown> = {};
  let scoreA: number;
  let scoreB: number;

  if (body.pair1A !== undefined) {
    // Padel: calculate pairs won from pair scores
    const pairs: [number, number][] = [
      [Number(body.pair1A), Number(body.pair1B)],
      [Number(body.pair2A), Number(body.pair2B)],
      [Number(body.pair3A), Number(body.pair3B)],
    ];
    scoreA = pairs.filter(([a, b]) => a > b).length;
    scoreB = pairs.filter(([a, b]) => b > a).length;
    Object.assign(updateFields, {
      pair1A: pairs[0][0], pair1B: pairs[0][1],
      pair2A: pairs[1][0], pair2B: pairs[1][1],
      pair3A: pairs[2][0], pair3B: pairs[2][1],
    });
  } else {
    scoreA = Number(body.scoreA);
    scoreB = Number(body.scoreB);
  }

  updateFields.scoreA = scoreA;
  updateFields.scoreB = scoreB;

  await updateRecord('Fixtures', fixture._recordId, updateFields);

  const updated = allFx.map(f => f.id === fixtureId ? { ...f, ...updateFields } : f) as RawFx[];
  const round   = fixture.round as string;
  const eid     = fixture.eventInstanceId as string;

  if (round === 'pool') await maybeUpdateSemis(eid, updated);
  if (round === 'semi') await maybeUpdateFinal(eid, updated);

  return NextResponse.json({ success: true });
}

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
    if (sA > sB)      { a.pts += 3; a.w++; }
    else if (sB > sA) { b.pts += 3; b.w++; }
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
    sf1 ? updateRecord('Fixtures', sf1._recordId, { squadAId: pAStand[0].id, squadBId: pBStand[1].id }) : null,
    sf2 ? updateRecord('Fixtures', sf2._recordId, { squadAId: pBStand[0].id, squadBId: pAStand[1].id }) : null,
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
  const { fixtureId, scoreA, scoreB } = await request.json();

  const allFx  = await fetchTable<Record<string, unknown>>('Fixtures') as RawFx[];
  const fixture = allFx.find(f => f.id === fixtureId);
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  await updateRecord('Fixtures', fixture._recordId, { scoreA, scoreB });

  // Apply score locally so progression checks see the updated value without a re-fetch
  const updated = allFx.map(f => f.id === fixtureId ? { ...f, scoreA, scoreB } : f) as RawFx[];
  const round   = fixture.round as string;
  const eid     = fixture.eventInstanceId as string;

  if (round === 'pool') await maybeUpdateSemis(eid, updated);
  if (round === 'semi') await maybeUpdateFinal(eid, updated);

  return NextResponse.json({ success: true });
}

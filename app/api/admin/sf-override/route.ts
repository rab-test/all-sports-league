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

export async function POST(request: Request) {
  const { fixtureId, sfOverride, squadAId, squadBId } = await request.json();

  const allFx  = await fetchTable<Record<string, unknown>>('Fixtures') as RawFx[];
  const fixture = allFx.find(f => f.id === fixtureId);
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  if (sfOverride) {
    await updateRecord('Fixtures', fixture._recordId, { sfOverride: true, squadAId, squadBId });
  } else {
    // Disable override and recalculate from pool standings
    await updateRecord('Fixtures', fixture._recordId, { sfOverride: false });

    const eid      = fixture.eventInstanceId as string;
    const sequence = fixture.sequence as number;
    const pools    = await loadPools();
    const poolA    = pools.find(p => p.eventInstanceId === eid && p.name === 'A');
    const poolB    = pools.find(p => p.eventInstanceId === eid && p.name === 'B');

    if (poolA && poolB) {
      const poolFx = allFx.filter(f => f.eventInstanceId === eid && f.round === 'pool');
      const allScored = poolFx.length > 0 && poolFx.every(
        f => typeof f.scoreA === 'number' && typeof f.scoreB === 'number'
      );
      if (allScored) {
        const pAStand = poolStandings(poolA.squadIds, poolFx.filter(f => f.poolId === poolA.id));
        const pBStand = poolStandings(poolB.squadIds, poolFx.filter(f => f.poolId === poolB.id));
        if (pAStand.length >= 2 && pBStand.length >= 2) {
          const newSquadA = sequence === 1 ? pAStand[0].id : pBStand[0].id;
          const newSquadB = sequence === 1 ? pBStand[1].id : pAStand[1].id;
          await updateRecord('Fixtures', fixture._recordId, { squadAId: newSquadA, squadBId: newSquadB });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}

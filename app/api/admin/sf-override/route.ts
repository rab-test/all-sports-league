import { NextResponse } from 'next/server';
import { fetchTable, updateRecord } from '../../../../lib/airtable';
import { loadPools } from '../../../../lib/data';

type RawFx = Record<string, unknown> & { _recordId: string };

function h2hPts(idA: string, idB: string, fixtures: RawFx[]): number {
  let pA = 0, pB = 0;
  for (const fx of fixtures) {
    const fA = fx.squadAId as string, fB = fx.squadBId as string;
    if ((fA !== idA || fB !== idB) && (fA !== idB || fB !== idA)) continue;
    const sA = typeof fx.scoreA === 'number' ? fx.scoreA : undefined;
    const sB = typeof fx.scoreB === 'number' ? fx.scoreB : undefined;
    if (sA === undefined || sB === undefined) continue;
    if (fA === idA) {
      if (sA > sB) pA += 2; else if (sB > sA) pB += 2; else { pA++; pB++; }
    } else {
      if (sB > sA) pA += 2; else if (sA > sB) pB += 2; else { pA++; pB++; }
    }
  }
  return pA - pB;
}

function poolStandings(squadIds: string[], fixtures: RawFx[]) {
  const stats: Record<string, { pts: number; gf: number; ga: number }> = {};
  for (const id of squadIds) stats[id] = { pts: 0, gf: 0, ga: 0 };

  for (const fx of fixtures) {
    const sA = typeof fx.scoreA === 'number' ? fx.scoreA : undefined;
    const sB = typeof fx.scoreB === 'number' ? fx.scoreB : undefined;
    if (sA === undefined || sB === undefined) continue;
    const a = stats[fx.squadAId as string];
    const b = stats[fx.squadBId as string];
    if (!a || !b) continue;
    a.gf += sA; a.ga += sB;
    b.gf += sB; b.ga += sA;
    if (sA > sB)      { a.pts += 2; }
    else if (sB > sA) { b.pts += 2; }
    else              { a.pts++; b.pts++; }
  }

  return Object.entries(stats)
    .map(([id, s]) => ({ id, ...s, gd: s.gf - s.ga }))
    .sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      const h2h = h2hPts(a.id, b.id, fixtures);
      if (h2h !== 0) return -h2h;
      return b.gd - a.gd;
    });
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

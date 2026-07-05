import { NextResponse } from 'next/server';
import { fetchTable, updateRecord } from '../../../../lib/airtable';
import { loadPools } from '../../../../lib/data';

type RawFx = Record<string, unknown> & { _recordId: string };
type StRow = { id: string; pts: number; gd: number };

function poolStandings(squadIds: string[], fixtures: RawFx[]) {
  const stats: Record<string, { pts: number; gf: number; ga: number }> = {};
  for (const id of squadIds) stats[id] = { pts: 0, gf: 0, ga: 0 };

  for (const fx of fixtures) {
    const sA = fx.scoreA != null ? Number(fx.scoreA) : NaN;
    const sB = fx.scoreB != null ? Number(fx.scoreB) : NaN;
    if (isNaN(sA) || isNaN(sB)) continue;
    const a = stats[fx.squadAId as string];
    const b = stats[fx.squadBId as string];
    if (!a || !b) continue;
    a.gf += sA; a.ga += sB;
    b.gf += sB; b.ga += sA;
    if (sA > sB)      { a.pts += 2; }
    else if (sB > sA) { b.pts += 2; }
    else              { a.pts++; b.pts++; }
  }

  const rows: StRow[] = Object.entries(stats).map(([id, s]) => ({ id, ...s, gd: s.gf - s.ga }));
  rows.sort((a, b) => b.pts - a.pts);
  return applyTiebreakers(rows, fixtures);
}

function applyTiebreakers(rows: StRow[], fixtures: RawFx[]): StRow[] {
  const result: StRow[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && rows[j].pts === rows[i].pts) j++;
    const group = rows.slice(i, j);
    result.push(...(group.length === 1 ? group : resolveGroup(group, fixtures)));
    i = j;
  }
  return result;
}

function resolveGroup(group: StRow[], fixtures: RawFx[]): StRow[] {
  const gids = new Set(group.map(r => r.id));
  const h2h: Record<string, number> = {};
  for (const r of group) h2h[r.id] = 0;

  for (const fx of fixtures) {
    const idA = fx.squadAId as string;
    const idB = fx.squadBId as string;
    if (!gids.has(idA) || !gids.has(idB)) continue;
    const sa = fx.scoreA != null ? Number(fx.scoreA) : NaN;
    const sb = fx.scoreB != null ? Number(fx.scoreB) : NaN;
    if (isNaN(sa) || isNaN(sb)) continue;
    if (sa > sb)      { h2h[idA] += 2; }
    else if (sb > sa) { h2h[idB] += 2; }
    else              { h2h[idA]++; h2h[idB]++; }
  }

  // If all H2H pts equal (circular / all draws), fall back to GD
  const vals = group.map(r => h2h[r.id]);
  if (vals.every(v => v === vals[0])) {
    return [...group].sort((a, b) => b.gd - a.gd);
  }

  // H2H can separate at least some — sort by H2H, then GD within sub-ties
  const sorted = [...group].sort((a, b) => h2h[b.id] - h2h[a.id]);
  const out: StRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && h2h[sorted[j].id] === h2h[sorted[i].id]) j++;
    const sub = sorted.slice(i, j);
    out.push(...(sub.length === 1 ? sub : sub.sort((a, b) => b.gd - a.gd)));
    i = j;
  }
  return out;
}

// Returns an updated copy of allFx reflecting the new SF squad assignments,
// so the caller can immediately pass it to maybeUpdateFinal.
async function maybeUpdateSemis(eid: string, allFx: RawFx[]): Promise<RawFx[]> {
  const poolFx = allFx.filter(f => f.eventInstanceId === eid && f.round === 'pool');
  if (poolFx.length === 0) return allFx;

  const pools = await loadPools();
  const poolA = pools.find(p => p.eventInstanceId === eid && p.name === 'A');
  const poolB = pools.find(p => p.eventInstanceId === eid && p.name === 'B');
  if (!poolA || !poolB) return allFx;

  const pAStand = poolStandings(poolA.squadIds, poolFx.filter(f => f.poolId === poolA.id));
  const pBStand = poolStandings(poolB.squadIds, poolFx.filter(f => f.poolId === poolB.id));
  if (pAStand.length < 2 || pBStand.length < 2) return allFx;

  const sf1 = allFx.find(f => f.id === `sf1-${eid}`);
  const sf2 = allFx.find(f => f.id === `sf2-${eid}`);
  await Promise.all([
    sf1 && !sf1.sfOverride
      ? updateRecord('Fixtures', sf1._recordId, { squadAId: pAStand[0].id, squadBId: pBStand[1].id })
      : null,
    sf2 && !sf2.sfOverride
      ? updateRecord('Fixtures', sf2._recordId, { squadAId: pBStand[0].id, squadBId: pAStand[1].id })
      : null,
  ]);

  // Reflect new SF squad IDs in-memory so maybeUpdateFinal sees them
  return allFx.map(f => {
    if (f.id === `sf1-${eid}` && sf1 && !sf1.sfOverride)
      return { ...f, squadAId: pAStand[0].id, squadBId: pBStand[1].id };
    if (f.id === `sf2-${eid}` && sf2 && !sf2.sfOverride)
      return { ...f, squadAId: pBStand[0].id, squadBId: pAStand[1].id };
    return f;
  });
}

async function maybeUpdateFinal(eid: string, allFx: RawFx[]) {
  const semis = allFx.filter(f => f.eventInstanceId === eid && f.round === 'semi');
  if (semis.length !== 2) return;
  if (!semis.every(f => f.scoreA != null && f.scoreA !== '' && f.scoreB != null && f.scoreB !== '')) return;

  const sf1 = semis.find(f => Number(f.sequence) === 1);
  const sf2 = semis.find(f => Number(f.sequence) === 2);
  if (!sf1 || !sf2) return;

  const sA1 = Number(sf1.scoreA), sB1 = Number(sf1.scoreB);
  const sA2 = Number(sf2.scoreA), sB2 = Number(sf2.scoreB);

  const sf1Winner = sA1 > sB1 ? sf1.squadAId as string : sf1.squadBId as string;
  const sf1Loser  = sA1 > sB1 ? sf1.squadBId as string : sf1.squadAId as string;
  const sf2Winner = sA2 > sB2 ? sf2.squadAId as string : sf2.squadBId as string;
  const sf2Loser  = sA2 > sB2 ? sf2.squadBId as string : sf2.squadAId as string;

  const final = allFx.find(f => f.id === `final-${eid}`);
  const third = allFx.find(f => f.id === `3rd4th-${eid}`);
  await Promise.all([
    final ? updateRecord('Fixtures', final._recordId, { squadAId: sf1Winner, squadBId: sf2Winner }) : null,
    third ? updateRecord('Fixtures', third._recordId, { squadAId: sf1Loser,  squadBId: sf2Loser  }) : null,
  ]);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { fixtureId } = body;

  const allFx  = await fetchTable<Record<string, unknown>>('Fixtures') as RawFx[];
  const fixture = allFx.find(f => f.id === fixtureId);
  if (!fixture) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });

  const updateFields: Record<string, unknown> = {};
  let scoreA: number, scoreB: number;

  if (body.pair1A !== undefined) {
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

  if (round === 'pool') {
    // Update SF team assignments from new pool standings, then cascade to Final/3rd-4th
    const updatedWithSemis = await maybeUpdateSemis(eid, updated);
    await maybeUpdateFinal(eid, updatedWithSemis);
  }
  if (round === 'semi') await maybeUpdateFinal(eid, updated);

  return NextResponse.json({ success: true });
}

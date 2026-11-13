import { NextResponse } from 'next/server';
import { fetchTable, updateRecord, createRecords, deleteRecords } from '../../../../lib/airtable';
import { loadEventInstances, loadSquads } from '../../../../lib/data';
import { PRESET_RANKED, PRESET_FINALS, RANKED_EVENT_POINTS } from '../../../../lib/league';

// Saves the admin-entered 1st-6th ranking for a ranked event (Challenger cricket)
// and seeds the same division's Finals Weekend fixtures from it:
// 1v2, 3v4 and 5v6 become tie sequences 1, 2 and 3.
export async function POST(request: Request) {
  const { eventInstanceId, squadIds } = await request.json() as { eventInstanceId: string; squadIds: string[] };

  const [instances, squads] = await Promise.all([loadEventInstances(), loadSquads()]);
  const instance = instances.find(i => i.id === eventInstanceId);
  if (!instance || instance.formatPresetId !== PRESET_RANKED) {
    return NextResponse.json({ error: 'Not a ranked event' }, { status: 404 });
  }
  if (instance.locked) {
    return NextResponse.json({ error: 'Event is locked' }, { status: 403 });
  }

  const divisionIds = new Set(squads.filter(s => s.divisionId === instance.divisionId).map(s => s.id));
  const valid =
    Array.isArray(squadIds) &&
    squadIds.length === RANKED_EVENT_POINTS.length &&
    new Set(squadIds).size === squadIds.length &&
    squadIds.every(id => divisionIds.has(id));
  if (!valid) {
    return NextResponse.json({ error: 'Pick six different squads from this division' }, { status: 400 });
  }

  const existing = (await fetchTable<Record<string, unknown>>('Placements'))
    .filter(p => p.eventInstanceId === eventInstanceId);
  if (existing.length > 0) {
    await deleteRecords('Placements', existing.map(p => p._recordId as string));
  }
  await createRecords('Placements', squadIds.map((squadId, i) => ({
    id: `placement-${eventInstanceId}-${i + 1}`,
    eventInstanceId,
    squadId,
    position: i + 1,
  })));

  // Seed the division's Finals Weekend fixtures (skip any that already have a result)
  const finalsIds = new Set(
    instances
      .filter(i => i.divisionId === instance.divisionId && i.formatPresetId === PRESET_FINALS)
      .map(i => i.id),
  );
  const fixtures = await fetchTable<Record<string, unknown>>('Fixtures');
  const updates = fixtures
    .filter(f => finalsIds.has(f.eventInstanceId as string) && f.round === 'tie')
    .filter(f => f.scoreA == null && f.scoreB == null)
    .map(f => {
      const seq = Number(f.sequence);
      return updateRecord('Fixtures', f._recordId as string, {
        squadAId: squadIds[seq * 2 - 2],
        squadBId: squadIds[seq * 2 - 1],
      });
    });
  await Promise.all(updates);

  return NextResponse.json({ success: true, seeded: updates.length });
}

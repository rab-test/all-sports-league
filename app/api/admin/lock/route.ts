import { NextResponse } from 'next/server';
import { fetchTable, updateRecord } from '../../../../lib/airtable';

export async function POST(request: Request) {
  const { eventInstanceId, locked } = await request.json();

  const instances = await fetchTable<Record<string, unknown>>('EventInstances');
  const instance  = instances.find(i => i.id === eventInstanceId);
  if (!instance) {
    return NextResponse.json({ error: 'Event instance not found' }, { status: 404 });
  }

  await updateRecord('EventInstances', instance._recordId, { locked });
  return NextResponse.json({ success: true });
}

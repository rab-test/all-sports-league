import { NextResponse } from 'next/server';
import { loadJson } from '../../../../lib/data';
import type { EventInstance } from '../../../../lib/league';
import fs from 'fs';
import path from 'path';

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(process.cwd(), 'data', filename), JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  const { eventInstanceId, locked } = await request.json();

  const instances = loadJson<EventInstance[]>('event-instances.json');
  const idx       = instances.findIndex(i => i.id === eventInstanceId);
  if (idx === -1) {
    return NextResponse.json({ error: 'Event instance not found' }, { status: 404 });
  }

  instances[idx] = { ...instances[idx], locked };
  writeJson('event-instances.json', instances);

  return NextResponse.json({ success: true });
}

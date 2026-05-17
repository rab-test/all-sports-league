import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(process.cwd(), 'data', filename), JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  const { fixtureId, scoreA, scoreB } = await request.json();

  const fixturesPath = path.join(process.cwd(), 'data', 'fixtures.json');
  const fixtures: Record<string, unknown>[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  const idx = fixtures.findIndex(f => f.id === fixtureId);
  if (idx === -1) {
    return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
  }

  fixtures[idx] = { ...fixtures[idx], scoreA, scoreB };
  writeJson('fixtures.json', fixtures);

  return NextResponse.json({ success: true, fixture: fixtures[idx] });
}

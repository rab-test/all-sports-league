import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir).filter((name) => name.endsWith('.json'));
  const payload: Record<string, unknown> = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    payload[file.replace('.json', '')] = JSON.parse(content);
  }
  return NextResponse.json(payload);
}

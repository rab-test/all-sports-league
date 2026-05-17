import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type GolfScore = { eventInstanceId: string; squadId: string; totalScore: number };

function getFilePath() {
  return path.join(process.cwd(), 'data', 'golf-scores.json');
}

function loadGolfScores(): GolfScore[] {
  const fp = getFilePath();
  return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : [];
}

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(process.cwd(), 'data', filename), JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  const { eventInstanceId, squadId, totalScore } = await request.json();

  const scores = loadGolfScores();
  const idx    = scores.findIndex(s => s.eventInstanceId === eventInstanceId && s.squadId === squadId);

  if (idx === -1) {
    scores.push({ eventInstanceId, squadId, totalScore });
  } else {
    scores[idx] = { ...scores[idx], totalScore };
  }

  writeJson('golf-scores.json', scores);
  return NextResponse.json({ success: true });
}

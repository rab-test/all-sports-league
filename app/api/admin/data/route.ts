import { NextResponse } from 'next/server';
import { loadJson } from '../../../../lib/data';
import type { EventInstance, EventDay, Division, Pool, Squad } from '../../../../lib/league';
import fs from 'fs';
import path from 'path';

type GolfScore = { eventInstanceId: string; squadId: string; totalScore: number };

export async function GET() {
  const instances  = loadJson<EventInstance[]>('event-instances.json');
  const eventDays  = loadJson<EventDay[]>('event-days.json');
  const divisions  = loadJson<Division[]>('divisions.json');
  const pools      = loadJson<Pool[]>('pools.json');
  const squads     = loadJson<Squad[]>('squads.json');

  // fixtures may have extra scoreA/scoreB fields written by the result route
  const fixturesPath = path.join(process.cwd(), 'data', 'fixtures.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  const golfPath = path.join(process.cwd(), 'data', 'golf-scores.json');
  const golfScores: GolfScore[] = fs.existsSync(golfPath)
    ? JSON.parse(fs.readFileSync(golfPath, 'utf-8'))
    : [];

  const eventDayMap  = Object.fromEntries(eventDays.map(d => [d.id, d]));
  const divisionMap  = Object.fromEntries(divisions.map(d => [d.id, d]));

  const joinedInstances = instances.map(i => ({
    ...i,
    eventDay: eventDayMap[i.eventDayId] ?? null,
    division: divisionMap[i.divisionId] ?? null,
  }));

  return NextResponse.json({ instances: joinedInstances, pools, fixtures, squads, golfScores });
}

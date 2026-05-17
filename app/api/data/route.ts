import { NextResponse } from 'next/server';
import { fetchTable } from '../../../lib/airtable';

export async function GET() {
  const [seasons, divisions, squads, players, eventDays, eventInstances, pools, fixtures, golfScores] =
    await Promise.all([
      fetchTable('Seasons'),
      fetchTable('Divisions'),
      fetchTable('Squads'),
      fetchTable('Players'),
      fetchTable('EventDays'),
      fetchTable('EventInstances'),
      fetchTable('Pools'),
      fetchTable('Fixtures'),
      fetchTable('GolfScores'),
    ]);

  return NextResponse.json({
    seasons, divisions, squads, players,
    eventDays, eventInstances, pools, fixtures, golfScores,
  });
}

import { NextResponse } from 'next/server';
import { loadEventInstances, loadEventDays, loadDivisions, loadPools, loadSquads, loadFixtures, loadGolfScores } from '../../../../lib/data';

export async function GET() {
  const [instances, eventDays, divisions, pools, squads, fixtures, golfScores] = await Promise.all([
    loadEventInstances(),
    loadEventDays(),
    loadDivisions(),
    loadPools(),
    loadSquads(),
    loadFixtures(),
    loadGolfScores(),
  ]);

  const eventDayMap = Object.fromEntries(eventDays.map(d => [d.id, d]));
  const divisionMap = Object.fromEntries(divisions.map(d => [d.id, d]));

  const joinedInstances = instances.map(i => ({
    ...i,
    eventDay: eventDayMap[i.eventDayId] ?? null,
    division: divisionMap[i.divisionId] ?? null,
  }));

  return NextResponse.json({ instances: joinedInstances, pools, fixtures, squads, golfScores });
}

import { NextResponse } from 'next/server';
import { loadGolfScores } from '../../../../lib/data';
import { createRecord, updateRecord } from '../../../../lib/airtable';

export async function POST(request: Request) {
  const { eventInstanceId, squadId, totalScore } = await request.json();

  const scores   = await loadGolfScores();
  const existing = scores.find(
    s => s.eventInstanceId === eventInstanceId && s.squadId === squadId
  );

  if (existing) {
    await updateRecord('GolfScores', existing._recordId, { totalScore });
  } else {
    await createRecord('GolfScores', {
      id: `golf-${eventInstanceId}-${squadId}`,
      eventInstanceId,
      squadId,
      totalScore,
    });
  }

  return NextResponse.json({ success: true });
}

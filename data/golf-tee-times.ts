// Tee sheet for the 13 September 2026 golf day (Boschenmeer / Kuilsrivier).
// Squad names are matched against live Squad records by name at render time;
// this file only holds the fixed schedule, not squad IDs.

export type TeeSlot = {
  time: string;
  tee1: string | null;
  tee10: string | null;
};

export type TeeSheet = {
  course: string;
  teeLabels: [string, string];
  slots: TeeSlot[];
};

export const GOLF_TEE_TIMES: Record<string, TeeSheet> = {
  // Premier League — Boschenmeer
  'event-instance-7': {
    course: 'Boschenmeer',
    teeLabels: ['Tee 1', 'Tee 10'],
    slots: [
      { time: '11:36', tee1: 'BombSquad + JOATs',            tee10: 'Heuwels van Touchies + Gaviscon Gladiators' },
      { time: '11:45', tee1: 'BombSquad + JOATs',            tee10: 'Heuwels van Touchies + Gaviscon Gladiators' },
      { time: '11:54', tee1: 'BombSquad + JOATs',            tee10: 'Heuwels van Touchies + Gaviscon Gladiators' },
      { time: '12:03', tee1: 'BombSquad + JOATs',            tee10: 'Heuwels van Touchies + Multi-Sport Mavericks' },
      { time: '12:12', tee1: 'BombSquad + JOATs',            tee10: 'Heuwels van Touchies + Ball of Duty' },
      { time: '12:21', tee1: 'Hangover Heroes + Pitchside Pints', tee10: 'Multi-Sport Mavericks + Ball of Duty' },
      { time: '12:30', tee1: 'Hangover Heroes + Pitchside Pints', tee10: 'Multi-Sport Mavericks + Ball of Duty' },
      { time: '12:39', tee1: 'Hangover Heroes + Pitchside Pints', tee10: 'Multi-Sport Mavericks + Ball of Duty' },
    ],
  },
  // Challenger League — Kuilsrivier
  'event-instance-8': {
    course: 'Kuilsrivier',
    teeLabels: ['Tee 1', 'Tee 10'],
    slots: [
      { time: '11:30', tee1: 'Bowled & the Beautiful + Sunrise Strikers', tee10: 'Die Bosmossel Boere + Hostile Takeover' },
      { time: '11:38', tee1: 'Bowled & the Beautiful + Sunrise Strikers', tee10: 'Die Bosmossel Boere + Hostile Takeover' },
      { time: '11:46', tee1: 'Bowled & the Beautiful + Sunrise Strikers', tee10: 'Die Bosmossel Boere + Hostile Takeover' },
      { time: '11:54', tee1: 'Bowled & the Beautiful + Scoregasms', tee10: 'Goats & Co + The Kwaggas' },
      { time: '12:02', tee1: 'Scoregasms + Gompoue',              tee10: 'Goats & Co + The Kwaggas' },
      { time: '12:10', tee1: 'Scoregasms + Gompoue',              tee10: 'Goats & Co + The Kwaggas' },
      { time: '12:18', tee1: 'Scoregasms + Gompoue',              tee10: null },
      { time: '12:26', tee1: 'Scoregasms + Gompoue',              tee10: null },
    ],
  },
};

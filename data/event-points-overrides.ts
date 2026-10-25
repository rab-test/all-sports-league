// Final event points entered directly, for events where scoring was done
// outside the app (e.g. 6-a-side Cricket is scored on CricHeroes) or where the
// standard placement points don't apply (a tied 3rd/4th playoff splits 4 + 3).
// When an event instance appears here, these points are used as-is instead of
// being derived from fixture scores.

export const EVENT_POINTS_OVERRIDES: Record<string, Record<string, number>> = {
  // Premier League — 6-a-side Cricket, 24 October 2026
  'event-instance-10': {
    'squad-premier-7': 8,   // BombSquad
    'squad-premier-6': 6,   // Multi-Sport Mavericks
    'squad-premier-8': 3.5, // Ball of Duty
    'squad-premier-1': 3.5, // Pitchside Pints
    'squad-premier-3': 1,   // Jan of All Trades
    'squad-premier-2': 1,   // Hangover Heroes
    'squad-premier-4': 0,   // Heuwels van Touchies
    'squad-premier-5': 0,   // Gaviscon Gladiators
  },
};

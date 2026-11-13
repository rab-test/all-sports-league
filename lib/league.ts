export type Organisation = {
  id: string;
  name: string;
};

export type Brand = {
  id: string;
  organisationId: string;
  name: string;
};

export type Season = {
  id: string;
  name: string;
};

export type Division = {
  id: string;
  seasonId: string;
  name: string;
  // squadIds removed — derive via squads.filter(s => s.divisionId === division.id)
};

export type Squad = {
  id: string;
  divisionId: string;
  name: string;
  logoUrl?: string;
  captain?: string;
  rosterSize?: number;
};

export type Player = {
  id: string;
  squadId: string;
  name: string;
};

export type EventDay = {
  id: string;
  seasonId: string;
  date: string;
  venues: string[];
};

export type EventInstance = {
  id: string;
  eventDayId: string;
  divisionId: string;
  sport: string;
  formatPresetId: string;
  pointsSchemeId: string;
  locked: boolean;
};

export type PointsScheme = {
  id: string;
  name: string;
  sportType: string;
  placementPoints: Record<string, number>;
  bonusPoints?: Record<string, number>;
};

export type FormatPreset = {
  id: string;
  name: string;
  type: 'preset-a' | 'preset-b';
  description: string;
};

export type Pool = {
  id: string;
  eventInstanceId: string;
  name: string; // 'A' | 'B'
  squadIds: string[];
};

export type Fixture = {
  id: string;
  eventInstanceId: string;
  poolId: string | null;
  squadAId: string;
  squadBId: string;
  scoreA?: number;
  scoreB?: number;
  pair1A?: number;
  pair1B?: number;
  pair2A?: number;
  pair2B?: number;
  pair3A?: number;
  pair3B?: number;
  round: 'pool' | 'semi' | 'final' | '3rd-4th' | 'tie';
  sequence: number;
  startTime?: string;
  locked?: boolean;
  sfOverride?: boolean;
};

// A squad's finishing position in an event, entered directly by the admin
// (used for the Challenger cricket pools, where 1st-6th is keyed in).
export type Placement = {
  eventInstanceId: string;
  squadId: string;
  position: number;
};

export type GolfScore = {
  eventInstanceId: string;
  squadId: string;
  totalScore: number;
};

// Points awarded per golf leaderboard placement (1st through 8th).
// Kept as a single shared constant so the per-event leaderboard and season
// standings calculation can never drift apart.
export const GOLF_EVENT_POINTS = [8, 6, 4, 3, 2, 2, 0, 0];

// Challenger cricket (two pools of 3): 1st-4th as normal, both pool-last teams
// (5th and 6th) get 1 point.
export const RANKED_EVENT_POINTS = [8, 6, 4, 3, 1, 1];

// Format presets that aren't scored from pool/knockout fixtures.
export const PRESET_RANKED = 'preset-c'; // pools of 3, admin enters the 1-6 ranking
export const PRESET_FINALS = 'preset-d'; // Finals Weekend ties, no season points

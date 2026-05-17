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
  brandId: string;
  year: number;
  name: string;
};

export type Division = {
  id: string;
  seasonId: string;
  name: string;
  squadIds: string[];
};

export type Squad = {
  id: string;
  divisionId: string;
  name: string;
  captain?: string;
  rosterSize: number;
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
  label: string; // 'A' | 'B'
  squadIds: string[];
};

export type Fixture = {
  id: string;
  eventInstanceId: string;
  poolId: string | null; // null for knockout rounds
  squadAId: string;
  squadBId: string;
  round: 'pool' | 'semi' | 'final' | '3rd-4th';
  sequence: number; // order within the round
};

export type Result = {
  id: string;
  fixtureId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null; // null = draw
};

// Runtime join of Fixture + its Result — not stored, computed from the above
export type Match = Fixture & {
  result: Result | null;
};

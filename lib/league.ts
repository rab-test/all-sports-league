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
  round: 'pool' | 'semi' | 'final' | '3rd-4th';
  sequence: number;
  startTime?: string;
  locked?: boolean;
  sfOverride?: boolean;
};

export type GolfScore = {
  eventInstanceId: string;
  squadId: string;
  totalScore: number;
};

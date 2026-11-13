export const dynamic = 'force-dynamic';

import {
  loadDivisions, loadSquads, loadEventDays, loadEventInstances, loadPools, loadFixtures, loadGolfScores, loadPlacements,
} from '../../lib/data';
import { computeStandings, computeStandingsHistory } from '../../lib/standings';
import type { SquadStanding } from '../../lib/standings';
import StandingsClient from './StandingsClient';

export type { SquadStanding };

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StandingsPage() {
  const [divisions, squads, eventDays, instances, pools, fixtures, golfScores, placements] = await Promise.all([
    loadDivisions(),
    loadSquads(),
    loadEventDays(),
    loadEventInstances(),
    loadPools(),
    loadFixtures(),
    loadGolfScores(),
    loadPlacements(),
  ]);

  const standings = computeStandings(squads, instances, pools, fixtures, golfScores, placements);
  const history = computeStandingsHistory(squads, instances, eventDays, pools, fixtures, golfScores, placements);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Standings</h1>
      <p className="mb-8 text-sm text-muted">2026 Season</p>
      <StandingsClient divisions={divisions} squads={squads} standings={standings} history={history} />
    </main>
  );
}

export const dynamic = 'force-dynamic';

import {
  loadDivisions, loadSquads, loadPlayers,
  loadEventInstances, loadFixtures, loadPools, loadGolfScores,
} from '../../lib/data';
import { computeStandings } from '../../lib/standings';
import SquadsClient from './SquadsClient';

export default async function SquadsPage() {
  const [divisions, squads, players, eventInstances, fixtures, pools, golfScores] = await Promise.all([
    loadDivisions(),
    loadSquads(),
    loadPlayers(),
    loadEventInstances(),
    loadFixtures(),
    loadPools(),
    loadGolfScores(),
  ]);

  const standings = computeStandings(squads, eventInstances, pools, fixtures, golfScores);

  const squadRows = squads
    .map(squad => ({
      id: squad.id,
      name: squad.name,
      divisionId: squad.divisionId,
      playerCount: players.filter(p => p.squadId === squad.id).length,
      points: standings[squad.id]?.points ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Squads</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — 16 squads across 2 divisions</p>
      <SquadsClient divisions={divisions} squads={squadRows} />
    </main>
  );
}

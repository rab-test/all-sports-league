import { loadDivisions, loadSquads } from '../../lib/data';
import StandingsClient from './StandingsClient';

export default async function StandingsPage() {
  const [divisions, squads] = await Promise.all([loadDivisions(), loadSquads()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Standings</h1>
      <p className="mb-8 text-sm text-muted">2026 Season</p>
      <StandingsClient divisions={divisions} squads={squads} />
    </main>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadJson } from '../../../lib/data';
import type { Squad, Division, Player } from '../../../lib/league';

export default function SquadPage({ params }: { params: { squadId: string } }) {
  const squads    = loadJson<Squad[]>('squads.json');
  const divisions = loadJson<Division[]>('divisions.json');
  const players   = loadJson<Player[]>('players.json');

  const squad = squads.find(s => s.id === params.squadId);
  if (!squad) notFound();

  const division = divisions.find(d => d.id === squad.divisionId);
  const roster   = players.filter(p => p.squadId === squad.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Back */}
      <Link
        href="/squads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Squads
      </Link>

      {/* Squad header */}
      <div className="mb-8 mt-4">
        <div className="mb-2 flex items-center gap-2">
          {division && (
            <span className="rounded-full border border-slate-600 px-3 py-0.5 text-xs font-semibold text-slate-300">
              {division.name}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-white">{squad.name}</h1>
        <p className="mt-1 text-sm text-slate-400">2026 Season · {roster.length} players</p>
      </div>

      {/* Roster */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Roster</h2>
        <ol className="overflow-hidden rounded-xl border border-slate-700">
          {roster.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center gap-4 border-b border-slate-800 bg-charcoal px-5 py-3 last:border-0"
            >
              <span className="w-6 text-sm tabular-nums text-slate-500">{index + 1}</span>
              <span className="text-white">{player.name}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

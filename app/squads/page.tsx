import Link from 'next/link';
import { loadDivisions, loadSquads } from '../../lib/data';

export default async function SquadsPage() {
  const [divisions, squads] = await Promise.all([loadDivisions(), loadSquads()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold text-white">Squads</h1>
      <p className="mb-8 text-sm text-slate-400">2026 Season — 16 squads across 2 divisions</p>

      <div className="flex flex-col gap-8">
        {divisions.map(division => {
          const divisionSquads = squads.filter(s => s.divisionId === division.id);

          return (
            <section key={division.id}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                {division.name} Division
              </h2>
              <ul className="flex flex-col gap-2">
                {divisionSquads.map((squad, index) => (
                  <li key={squad.id}>
                    <Link
                      href={`/squads/${squad.id}`}
                      className="flex items-center gap-4 rounded-xl border border-slate-700 bg-charcoal px-5 py-3.5 hover:border-slate-500 hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="w-6 text-sm tabular-nums text-slate-500">{index + 1}</span>
                      <span className="flex-1 font-medium text-white">{squad.name}</span>
                      <span className="text-slate-600 text-xs">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}

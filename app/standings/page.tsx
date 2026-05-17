import Link from 'next/link';
import { loadJson } from '../../lib/data';
import type { Division, Squad } from '../../lib/league';

export default function StandingsPage() {
  const divisions = loadJson<Division[]>('divisions.json');
  const squads    = loadJson<Squad[]>('squads.json');

  const squadById = Object.fromEntries(squads.map(s => [s.id, s]));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold text-white">Standings</h1>
      <p className="mb-8 text-sm text-slate-400">2026 Season — Somerset West League</p>

      <div className="flex flex-col gap-8">
        {divisions.map(division => {
          const divisionSquads = division.squadIds
            .map(id => squadById[id])
            .filter(Boolean);

          return (
            <section key={division.id}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                {division.name} Division
              </h2>

              <div className="overflow-hidden rounded-xl border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-charcoal">
                      <th className="w-8 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Squad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Played</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-5">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionSquads.map((squad, index) => (
                      <tr
                        key={squad.id}
                        className="border-b border-slate-800 bg-charcoal last:border-0 hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 tabular-nums">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/squads/${squad.id}`}
                            className="font-medium text-white hover:text-accent transition-colors"
                          >
                            {squad.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">0</td>
                        <td className="px-4 py-3 pr-5 text-right tabular-nums font-bold text-white">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

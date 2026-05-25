import Link from 'next/link';
import { loadDivisions, loadSquads } from '../../lib/data';

export default async function StandingsPage() {
  const [divisions, squads] = await Promise.all([loadDivisions(), loadSquads()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Standings</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — Somerset West League</p>

      <div className="flex flex-col gap-8">
        {divisions.map(division => {
          const divisionSquads = squads.filter(s => s.divisionId === division.id);
          const isPremier = division.name.toLowerCase().includes('premier');

          return (
            <section key={division.id}>
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    isPremier
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-gray-300 bg-gray-100 text-muted'
                  }`}
                >
                  {division.name}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy">
                      <th className="w-8 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white/60">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white">Squad</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-white/60">Played</th>
                      <th className="px-4 py-3 pr-5 text-right text-xs font-bold uppercase tracking-wider text-accent">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionSquads.map((squad, index) => (
                      <tr
                        key={squad.id}
                        className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${
                          index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold tabular-nums text-muted">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/squads/${squad.id}`}
                            className="font-bold text-navy transition-colors hover:text-accent"
                          >
                            {squad.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">0</td>
                        <td className="px-4 py-3 pr-5 text-right font-black tabular-nums text-accent">0</td>
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

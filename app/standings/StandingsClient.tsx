'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Division, Squad } from '../../lib/league';
import type { SquadStanding } from '../../lib/standings';

export default function StandingsClient({
  divisions,
  squads,
  standings,
}: {
  divisions: Division[];
  squads: Squad[];
  standings: Record<string, SquadStanding>;
}) {
  const premier = divisions.find(d => d.name.toLowerCase().includes('premier'));
  const [selectedId, setSelectedId] = useState(premier?.id ?? divisions[0]?.id ?? '');

  const divisionSquads = squads
    .filter(s => s.divisionId === selectedId)
    .map(s => ({ ...s, ...(standings[s.id] ?? { played: 0, points: 0 }) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return (
    <>
      <div className="mb-6 flex gap-2">
        {divisions.map(div => {
          const isPremier = div.name.toLowerCase().includes('premier');
          const isSelected = div.id === selectedId;
          return (
            <button
              key={div.id}
              type="button"
              onClick={() => setSelectedId(div.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                isSelected
                  ? isPremier
                    ? 'border-accent bg-accent text-white'
                    : 'border-navy bg-navy text-white'
                  : 'border-gray-300 bg-white text-muted hover:border-gray-400'
              }`}
            >
              {div.name}
            </button>
          );
        })}
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
                <td className="px-4 py-3 text-right tabular-nums text-muted">{squad.played}</td>
                <td className="px-4 py-3 pr-5 text-right font-black tabular-nums text-accent">{squad.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

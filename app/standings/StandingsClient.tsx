'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Division, Squad } from '../../lib/league';
import type { DivisionHistory, SquadStanding } from '../../lib/standings';
import TrendChart from './TrendChart';

export default function StandingsClient({
  divisions,
  squads,
  standings,
  history,
}: {
  divisions: Division[];
  squads: Squad[];
  standings: Record<string, SquadStanding>;
  history: Record<string, DivisionHistory>;
}) {
  const premier = divisions.find(d => d.name.toLowerCase().includes('premier'));
  const [selectedDivisionId, setSelectedDivisionId] = useState(premier?.id ?? divisions[0]?.id ?? '');
  const [highlightedSquadId, setHighlightedSquadId] = useState<string | null>(null);

  const divisionSquads = squads
    .filter(s => s.divisionId === selectedDivisionId)
    .map(s => ({ ...s, ...(standings[s.id] ?? { played: 0, points: 0 }) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Default the trend highlight to the division leader whenever the division changes.
  useEffect(() => {
    setHighlightedSquadId(divisionSquads[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivisionId]);

  return (
    <>
      <div className="mb-6 flex gap-2">
        {divisions.map(div => {
          const isPremier = div.name.toLowerCase().includes('premier');
          const isSelected = div.id === selectedDivisionId;
          return (
            <button
              key={div.id}
              type="button"
              onClick={() => setSelectedDivisionId(div.id)}
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

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
            {divisionSquads.map((squad, index) => {
              const isHighlighted = squad.id === highlightedSquadId;
              return (
                <tr
                  key={squad.id}
                  onClick={() => setHighlightedSquadId(squad.id)}
                  className={`cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50 ${
                    isHighlighted ? 'bg-accent/10' : index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-3 font-semibold tabular-nums text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${isHighlighted ? 'bg-accent' : 'bg-gray-200'}`}
                      />
                      <Link
                        href={`/squads/${squad.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-bold text-navy transition-colors hover:text-accent"
                      >
                        {squad.name}
                      </Link>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{squad.played}</td>
                  <td className="px-4 py-3 pr-5 text-right font-black tabular-nums text-accent">{squad.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TrendChart
        history={history[selectedDivisionId]}
        squads={divisionSquads}
        selectedId={highlightedSquadId}
        onSelect={setHighlightedSquadId}
      />
    </>
  );
}

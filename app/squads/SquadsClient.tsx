'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Division } from '../../lib/league';

type SquadRow = {
  id: string;
  name: string;
  divisionId: string;
  playerCount: number;
  points: number;
};

export default function SquadsClient({
  divisions,
  squads,
}: {
  divisions: Division[];
  squads: SquadRow[];
}) {
  const premier = divisions.find(d => d.name.toLowerCase().includes('premier'));
  const [selectedId, setSelectedId] = useState(premier?.id ?? divisions[0]?.id ?? '');

  const divisionSquads = squads.filter(s => s.divisionId === selectedId);

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {divisionSquads.map(squad => (
          <Link
            key={squad.id}
            href={`/squads/${squad.id}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-navy">{squad.name}</span>
              <span className="text-xs text-muted">{squad.playerCount} players</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xl font-black tabular-nums text-accent">{squad.points}</span>
                <span className="text-xs text-muted">pts</span>
              </div>
              <span className="text-xs text-muted">›</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

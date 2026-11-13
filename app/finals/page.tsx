import Link from 'next/link';
import {
  loadDivisions, loadSquads, loadEventInstances, loadPools, loadFixtures, loadGolfScores, loadPlacements,
} from '../../lib/data';
import { computeStandings } from '../../lib/standings';
import { computeTies, computeFinalStandings } from '../../lib/finals';
import type { Tie } from '../../lib/finals';

export const dynamic = 'force-dynamic';

const SPORT_BADGE: Record<string, string> = {
  'Padel':            'bg-padel text-white',
  'Touch Rugby':      'bg-rugby text-white',
  '6-a-side Cricket': 'bg-cricket text-white',
};

function TieCard({ tie, names }: { tie: Tie; names: Record<string, string> }) {
  const nameA = names[tie.squadAId] ?? 'TBD';
  const nameB = names[tie.squadBId] ?? 'TBD';
  const anyPlayed = tie.winsA + tie.winsB > 0;

  let status = 'Not started';
  if (tie.winnerId) {
    status = `${names[tie.winnerId]} win${tie.decidedBy === 'cricket-ranking' ? ' on cricket ranking' : ''}`;
  } else if (anyPlayed && tie.winsA !== tie.winsB) {
    status = `${tie.winsA > tie.winsB ? nameA : nameB} 1 up`;
  } else if (anyPlayed) {
    status = 'All square';
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${tie.sequence === 1 ? 'border-red' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
          {tie.label}
        </span>
        <span className={`flex-1 text-sm font-bold ${tie.winnerId === tie.squadAId ? 'text-accent' : 'text-navy'}`}>{nameA}</span>
        <span className="shrink-0 text-lg font-black tabular-nums text-navy">{tie.winsA} – {tie.winsB}</span>
        <span className={`flex-1 text-right text-sm font-bold ${tie.winnerId === tie.squadBId ? 'text-accent' : 'text-navy'}`}>{nameB}</span>
      </div>

      <ul>
        {tie.fixtures.map(({ sport, fixture, winnerId }) => {
          const hasResult = fixture.scoreA != null && fixture.scoreB != null;
          return (
            <li key={fixture.id} className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 first:border-0">
              <span className="w-10 shrink-0 text-xs tabular-nums text-muted">{fixture.startTime}</span>
              <span className={`w-24 shrink-0 rounded px-2 py-0.5 text-center text-[11px] font-bold ${SPORT_BADGE[sport] ?? 'bg-gray-200 text-navy'}`}>
                {sport.replace('6-a-side ', '')}
              </span>
              <span className="flex-1 text-sm text-navy">
                {hasResult
                  ? <>
                      <span className="font-black tabular-nums text-accent">{fixture.scoreA} – {fixture.scoreB}</span>
                      {winnerId && <span className="ml-2 text-muted">{names[winnerId]}</span>}
                    </>
                  : <span className="text-muted">vs</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-muted">{status}</p>
    </div>
  );
}

export default async function FinalsPage() {
  const [divisions, squads, instances, pools, fixtures, golfScores, placements] = await Promise.all([
    loadDivisions(), loadSquads(), loadEventInstances(), loadPools(), loadFixtures(), loadGolfScores(), loadPlacements(),
  ]);

  const names = Object.fromEntries(squads.map(s => [s.id, s.name]));
  const seasonPoints = computeStandings(squads, instances, pools, fixtures, golfScores, placements);
  const pointsBySquad = Object.fromEntries(Object.entries(seasonPoints).map(([id, s]) => [id, s.points]));

  const sections = divisions
    .map(d => {
      const ties = computeTies(d.id, instances, fixtures, placements);
      const divSquadIds = squads.filter(s => s.divisionId === d.id).map(s => s.id);
      return { division: d, ties, standings: computeFinalStandings(ties, divSquadIds, pointsBySquad) };
    })
    .filter(s => s.ties.length > 0)
    .sort((a, b) => b.division.id.localeCompare(a.division.id)); // Premier first

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/schedule" className="mb-6 inline-block text-sm font-semibold text-muted transition-colors hover:text-navy">
        ← Back to Schedule
      </Link>
      <h1 className="mb-1 text-3xl font-black text-navy">Finals Weekend</h1>
      <p className="mb-8 text-sm text-muted">
        Saturday 14 November 2026 · Win a sport to go 1 up, win the majority to take the higher position.
      </p>

      {sections.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-muted shadow-sm">
          Finals fixtures not yet published
        </div>
      )}

      {sections.map(({ division, ties, standings }) => (
        <section key={division.id} className="mb-10">
          <h2 className="mb-4 text-xl font-black text-navy">{division.name}</h2>

          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Final Standings</h3>
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.position} className={`border-t border-gray-100 first:border-0 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="w-10 px-4 py-2.5 text-center font-semibold text-muted">{row.position}</td>
                    <td className={`px-4 py-2.5 font-semibold ${row.squadId ? 'text-navy' : 'text-gray-300'}`}>
                      {row.squadId ? names[row.squadId] : 'TBD'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted">{row.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Ties</h3>
          <div className="flex flex-col gap-3">
            {[...ties].sort((a, b) => a.sequence - b.sequence).map(t => <TieCard key={t.sequence} tie={t} names={names} />)}
          </div>
        </section>
      ))}
    </main>
  );
}

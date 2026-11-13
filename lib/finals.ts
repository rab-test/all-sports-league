import type { EventInstance, Fixture, Placement } from './league';
import { PRESET_FINALS, PRESET_RANKED } from './league';

// Finals Weekend: each pairing (1v2, 3v4, ...) is a "tie" played over several
// sports. Win a sport and you are 1 up; win the majority (2-1 / 3-0 over three
// sports) and you take the higher position. A 1-1 split over two sports (the
// Challenger) is settled by the cricket ranking.

export type TieFixture = { sport: string; fixture: Fixture; winnerId: string | null };

export type Tie = {
  sequence: number;               // 1 = 1v2, 2 = 3v4, 3 = 5v6, 4 = 7v8
  label: string;
  positions: [number, number];    // the two finishing positions this tie decides
  squadAId: string;
  squadBId: string;
  fixtures: TieFixture[];         // chronological
  winsA: number;
  winsB: number;
  winnerId: string | null;        // null until the tie is decided
  decidedBy: 'sports' | 'cricket-ranking' | null;
};

export type FinalRow = { position: number; squadId: string | null; note?: string };

export function tieLabel(sequence: number): string {
  const hi = sequence * 2 - 1;
  return `${hi}v${hi + 1}`;
}

function sportWinner(fx: Fixture): string | null {
  if (fx.scoreA == null || fx.scoreB == null) return null;
  if (fx.scoreA > fx.scoreB) return fx.squadAId;
  if (fx.scoreB > fx.scoreA) return fx.squadBId;
  return null;
}

export function computeTies(
  divisionId: string,
  instances: EventInstance[],
  fixtures: Fixture[],
  placements: Placement[],
): Tie[] {
  const finalsInstances = instances.filter(
    i => i.divisionId === divisionId && i.formatPresetId === PRESET_FINALS,
  );
  const rankedInstance = instances.find(
    i => i.divisionId === divisionId && i.formatPresetId === PRESET_RANKED,
  );
  const cricketRank = (squadId: string) =>
    placements.find(p => p.eventInstanceId === rankedInstance?.id && p.squadId === squadId)?.position ?? 99;

  const bySequence = new Map<number, TieFixture[]>();
  for (const inst of finalsInstances) {
    for (const fx of fixtures.filter(f => f.eventInstanceId === inst.id && f.round === 'tie')) {
      const list = bySequence.get(fx.sequence) ?? [];
      list.push({ sport: inst.sport, fixture: fx, winnerId: sportWinner(fx) });
      bySequence.set(fx.sequence, list);
    }
  }

  return [...bySequence.entries()]
    .sort(([a], [b]) => a - b)
    .map(([sequence, list]) => {
      const sorted = [...list].sort((a, b) => (a.fixture.startTime ?? '').localeCompare(b.fixture.startTime ?? ''));
      const squadAId = sorted.find(t => t.fixture.squadAId)?.fixture.squadAId ?? '';
      const squadBId = sorted.find(t => t.fixture.squadBId)?.fixture.squadBId ?? '';
      const winsA = sorted.filter(t => t.winnerId && t.winnerId === squadAId).length;
      const winsB = sorted.filter(t => t.winnerId && t.winnerId === squadBId).length;
      const allPlayed = sorted.every(t => t.fixture.scoreA != null && t.fixture.scoreB != null);

      let winnerId: string | null = null;
      let decidedBy: Tie['decidedBy'] = null;
      if (squadAId && squadBId) {
        const needed = Math.floor(sorted.length / 2) + 1;
        if (winsA >= needed)      { winnerId = squadAId; decidedBy = 'sports'; }
        else if (winsB >= needed) { winnerId = squadBId; decidedBy = 'sports'; }
        else if (allPlayed && winsA === winsB) {
          // Level after every sport: higher cricket ranking wins
          winnerId = cricketRank(squadAId) < cricketRank(squadBId) ? squadAId : squadBId;
          decidedBy = 'cricket-ranking';
        }
      }

      return {
        sequence,
        label: tieLabel(sequence),
        positions: [sequence * 2 - 1, sequence * 2] as [number, number],
        squadAId, squadBId,
        fixtures: sorted,
        winsA, winsB, winnerId, decidedBy,
      };
    });
}

// Positions decided by the ties; any squad not in the finals (the two Challenger
// squads that didn't compete) fills the remaining places, best season points first.
export function computeFinalStandings(
  ties: Tie[],
  divisionSquadIds: string[],
  seasonPoints: Record<string, number>,
): FinalRow[] {
  const rows: FinalRow[] = [];
  for (const tie of ties) {
    const loserId = tie.winnerId === tie.squadAId ? tie.squadBId : tie.squadAId;
    rows.push({ position: tie.positions[0], squadId: tie.winnerId });
    rows.push({ position: tie.positions[1], squadId: tie.winnerId ? loserId : null });
  }

  // Until every tie has its squads (Challenger awaits the cricket ranking), we can't tell who's absent
  if (ties.some(t => !t.squadAId || !t.squadBId)) return rows.sort((a, b) => a.position - b.position);

  const inTies = new Set(ties.flatMap(t => [t.squadAId, t.squadBId]).filter(Boolean));
  const absent = divisionSquadIds
    .filter(id => !inTies.has(id))
    .sort((a, b) => (seasonPoints[b] ?? 0) - (seasonPoints[a] ?? 0));
  let next = rows.length + 1;
  for (const id of absent) rows.push({ position: next++, squadId: id, note: 'Did not compete in finals' });

  return rows.sort((a, b) => a.position - b.position);
}

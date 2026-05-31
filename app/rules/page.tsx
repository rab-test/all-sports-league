export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">Rules</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — Somerset West League</p>

      <div className="flex flex-col gap-5">

        {/* Overview */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-navy">Overview</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-navy/80">
              Two parallel leagues: Premier and Challenger. Each league has 8 teams split into 2 pools of 4.
              Five sports played across the season: Padel, Touch Rugby, Soccer, Cricket, and Golf.
              League standings accumulate points across all events and determine Finals Weekend seeding.
            </p>
          </div>
        </section>

        {/* Pool & Knockout Structure */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-navy">Pool & Knockout Structure</h2>
            <p className="mt-1 text-xs text-muted">All sports except Golf</p>
          </div>
          <ul className="divide-y divide-gray-100 px-5">
            {[
              '8 teams per league, split into Pool A and Pool B (4 teams each)',
              'Round robin within each pool',
              'Match points: Win = 2, Draw = 1, Loss = 0',
              'Top 2 from each pool advance to semi-finals',
              'SF1: Pool A 1st vs Pool B 2nd | SF2: Pool B 1st vs Pool A 2nd',
              'SF winners play the Final | SF losers play 3rd/4th playoff',
              'Tiebreakers (in order): 1) Head to head  2) Score difference  3) Admin override',
            ].map((rule, i) => (
              <li key={i} className="py-3 text-sm text-navy/80">{rule}</li>
            ))}
          </ul>
        </section>

        {/* Event Points */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-navy">Event Points</h2>
            <p className="mt-1 text-xs text-muted">League standings</p>
          </div>
          <div className="px-5 py-4">
            <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[
                { place: '1st', pts: 8 },
                { place: '2nd', pts: 6 },
                { place: '3rd', pts: 4 },
                { place: '4th', pts: 3 },
                { place: 'Pool 3rd', pts: 1 },
                { place: 'Pool 4th', pts: 0 },
              ].map(({ place, pts }) => (
                <div key={place} className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-3 text-center">
                  <p className="text-xs text-muted">{place}</p>
                  <p className="text-lg font-black text-accent">{pts}pts</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              Pool match points (2/1/0) are used only to rank teams within the pool and do not carry into league standings.
            </p>
          </div>
        </section>

        {/* Sports */}
        {[
          {
            title: 'Golf',
            borderClass: 'border-l-golf',
            headerTextClass: 'text-golf',
            rules: [
              'Each team fields 6 players split into 3 pairs',
              'Format: Scramble — each pair plays one team ball, always hitting from the better shot',
              'Continue selecting the preferred shot after every stroke until the ball is holed',
              'No gimmes — every putt must be holed',
              'Triple Bogey is the maximum on any hole',
              'Each pair\'s total strokes make up their pair score',
              'Add all 3 pair scores per team — lowest combined total wins',
              'Results ranked lowest to highest',
            ],
          },
          {
            title: '6-a-side Cricket',
            borderClass: 'border-l-cricket',
            headerTextClass: 'text-cricket',
            rules: [
              '6 players allowed on the field per team',
              '2 super subs allowed: 1 batting sub (bat only, no bowl) and 1 bowling sub (bowl only, no bat)',
              'Each team must provide 1 scorer and 1 umpire. The two teams that just played umpire the next game',
              '5 overs per innings, max 1 over per player (excluding wicketkeeper)',
              'Wicketkeeper must be nominated before the game and cannot change during the innings',
              'Wides and no-balls = 4 runs (not re-bowled unless in the final 2 balls of the last over). If a wide goes for 4, that is 8 runs total',
              'All leg-side deliveries are wides; off-side line is the second line',
              'No-balls: front-foot, full toss above hip height, or anything over the head. No-balls result in a free hit',
              'Batsman retires on 30 runs (off the bat only — extras do not count). Retired batsman may return once all others are out',
              'Last man standing format. No LBW. Batsman can be stumped off a wide but not off a no-ball',
              'Innings bowled from one side only. Captains toss to decide bat/bowl first or which end to bowl from',
              'Next 2 teams must toss during the innings break of the preceding match and be ready immediately when the previous game ends',
              'Scoring: Win = 2pts, Tie = 1pt each, Loss = 0pts',
              'Tiebreakers: 1) Head-to-head  2) Most runs scored  3) Fewest runs conceded  4) Coin toss',
            ],
          },
          {
            title: 'Fives Soccer',
            borderClass: 'border-l-soccer',
            headerTextClass: 'text-soccer',
            rules: [
              'Standard rules, time-limited matches',
            ],
          },
          {
            title: 'Touch Rugby',
            borderClass: 'border-l-rugby',
            headerTextClass: 'text-rugby',
            rules: [
              'Standard rules, time-limited matches',
            ],
          },
          {
            title: 'Padel',
            borderClass: 'border-l-padel',
            headerTextClass: 'text-padel',
            rules: [
              'Standard rules',
              'Each pair plays to win a set — squad vs squad result ends 3-0 or 2-1',
              'If a set is tied, a tiebreak is played to 7 (win by 2)',
              'Tiebreakers: 1) Head-to-head  2) Sets won',
            ],
          },
        ].map(sport => (
          <section
            key={sport.title}
            className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm border-l-4 ${sport.borderClass}`}
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className={`text-sm font-black uppercase tracking-widest ${sport.headerTextClass}`}>
                {sport.title}
              </h2>
            </div>
            <ul className="divide-y divide-gray-100 px-5">
              {sport.rules.map((rule, i) => (
                <li key={i} className="py-3 text-sm text-navy/80">{rule}</li>
              ))}
            </ul>
          </section>
        ))}

        {/* General League Rules */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-navy">General League Rules</h2>
          </div>
          <ul className="divide-y divide-gray-100 px-5">
            {[
              'Each squad of 12 is locked in before the first event. No substitutions or additions throughout the season.',
              'If a team cannot field enough players, they forfeit their chance of progressing to the playoffs.',
              'All played in good spirit.',
            ].map((rule, i) => (
              <li key={i} className="py-3 text-sm text-navy/80">{rule}</li>
            ))}
          </ul>
        </section>

        {/* Finals Weekend */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-navy">Finals Weekend</h2>
          </div>
          <ul className="divide-y divide-gray-100 px-5">
            {[
              'Based on final league standings',
              'Matchups: 1st vs 2nd, 3rd vs 4th, 5th vs 6th, 7th vs 8th',
              'Best of 3 sports',
              'Winner of 1st vs 2nd is league champion',
              'Managed manually outside the app',
            ].map((rule, i) => (
              <li key={i} className="py-3 text-sm text-navy/80">{rule}</li>
            ))}
          </ul>
        </section>

      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Rules subject to change. Final decisions rest with the league organisers.
      </p>
    </main>
  );
}

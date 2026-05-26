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
            title: 'Padel',
            borderClass: 'border-l-padel',
            headerTextClass: 'text-padel',
            rules: [
              'Each squad fields 3 pairs against 3 opposition pairs',
              'Each pair plays one set, 30-minute time limit',
              'Squad wins the match if they win 2 or more pairs',
              'Score difference tiebreaker: total games won minus total games lost across all 3 pairs',
            ],
          },
          {
            title: 'Touch Rugby',
            borderClass: 'border-l-rugby',
            headerTextClass: 'text-rugby',
            rules: [
              'Time-limited match, draws valid',
              'Win = 2pts, Draw = 1pt, Loss = 0pts',
              'Score difference: tries scored minus tries conceded',
            ],
          },
          {
            title: 'Soccer (5-a-side)',
            borderClass: 'border-l-soccer',
            headerTextClass: 'text-soccer',
            rules: [
              'Time-limited match, draws valid',
              'Win = 2pts, Draw = 1pt, Loss = 0pts',
              'Score difference: goals scored minus goals conceded',
            ],
          },
          {
            title: '6-a-side Cricket',
            borderClass: 'border-l-cricket',
            headerTextClass: 'text-cricket',
            rules: [
              'Result entered manually (win or loss)',
              'No score difference tracked',
              'Tiebreakers resolved by admin override',
            ],
          },
          {
            title: 'Golf',
            borderClass: 'border-l-golf',
            headerTextClass: 'text-golf',
            rules: [
              'No pool stage or head-to-head matchups',
              'All 8 teams play simultaneously, 18 holes',
              'Format: 3 pairs per team playing better ball',
              'Team score = sum of all 3 pair net scores, lowest total wins',
              'Points: 1st=8, 2nd=6, 3rd=4, 4th=3, 5th=2, 6th=2, 7th=0, 8th=0',
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

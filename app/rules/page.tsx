type SportSection = {
  title: string;
  colorClass: string;
  rules: string[];
};

const SPORTS: SportSection[] = [
  {
    title: 'Padel',
    colorClass: 'text-padel border-padel/40',
    rules: [
      '4v4 teams.',
      'Each fixture: 4 singles matches + 1 doubles match.',
      'First to 6 games, tiebreak at 6-6.',
      'Match winner determined by most individual match wins.',
    ],
  },
  {
    title: 'Fives Soccer',
    colorClass: 'text-soccer border-soccer/40',
    rules: [
      '6-a-side.',
      '20 minute matches.',
      'Standard football rules, no offside.',
      'Draws allowed in pool stage; extra time in knockouts.',
    ],
  },
  {
    title: 'Touch Rugby',
    colorClass: 'text-rugby border-rugby/40',
    rules: [
      '6-a-side.',
      '20 minute matches.',
      '6 touches before turnover.',
      'No tackles — a touch counts as a tackle.',
      'Tries only, no conversions.',
    ],
  },
  {
    title: '6-a-side Cricket',
    colorClass: 'text-cricket border-cricket/40',
    rules: [
      '6-a-side.',
      '6 overs per innings.',
      'Standard cricket rules apply.',
      'Each player must bowl at least 1 over.',
    ],
  },
  {
    title: 'Golf',
    colorClass: 'text-golf border-golf/40',
    rules: [
      'Individual stroke play.',
      'Each squad submits 6 scores.',
      'Total squad score determines ranking.',
      'Lowest score wins.',
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold text-white">Rules</h1>
      <p className="mb-8 text-sm text-slate-400">2026 Season — Somerset West League</p>

      <div className="flex flex-col gap-5">

        {/* General */}
        <section className="overflow-hidden rounded-xl border border-slate-700 bg-charcoal">
          <div className="border-b border-slate-700 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-accent">General</h2>
          </div>
          <ul className="divide-y divide-slate-800 px-5">
            {[
              '16 squads split into Premier and Challenger divisions.',
              '8 squads per division, split into 2 pools of 4.',
              'Round-robin pool stage: every team plays every other team in their pool.',
              'Top 2 from each pool advance to semi-finals.',
              'SF1: Pool A 1st vs Pool B 2nd. SF2: Pool B 1st vs Pool A 2nd.',
              'Finals: SF winners play the Final; SF losers play the 3rd / 4th playoff.',
              'Points per event: 1st = 8, 2nd = 6, 3rd = 4, 4th = 3, Pool 3rd = 1, Pool 4th = 0.',
              'Overall league winner determined by cumulative points across all events.',
            ].map((rule, i) => (
              <li key={i} className="py-3 text-sm text-slate-300">{rule}</li>
            ))}
          </ul>
        </section>

        {/* Sports */}
        {SPORTS.map(sport => (
          <section key={sport.title} className="overflow-hidden rounded-xl border border-slate-700 bg-charcoal">
            <div className={`border-b border-slate-700 px-5 py-4 border-l-2 ${sport.colorClass}`}>
              <h2 className={`text-sm font-bold uppercase tracking-widest ${sport.colorClass.split(' ')[0]}`}>
                {sport.title}
              </h2>
            </div>
            <ul className="divide-y divide-slate-800 px-5">
              {sport.rules.map((rule, i) => (
                <li key={i} className="py-3 text-sm text-slate-300">{rule}</li>
              ))}
            </ul>
          </section>
        ))}

      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        Rules subject to change. Final decisions rest with the league organisers.
      </p>
    </main>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { loadEventDays, loadEventInstances, loadDivisions } from '../lib/data';

function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function HomePage() {
  const [eventDays, eventInstances, divisions] = await Promise.all([
    loadEventDays(),
    loadEventInstances(),
    loadDivisions(),
  ]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = [...eventDays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find(d => d.date >= today);

  const upcomingInstances = upcoming
    ? eventInstances.filter(i => i.eventDayId === upcoming.id)
    : [];

  const divisionById = Object.fromEntries(divisions.map(d => [d.id, d]));

  return (
    <main className="min-h-screen bg-night text-slate-100">

      {/* Hero */}
      <section className="flex flex-col items-center px-4 pb-10 pt-14 text-center">
        <Image
          src="/logo.png"
          alt="Ultimate Sports League"
          width={320}
          height={128}
          className="mx-auto mb-8 h-auto w-56 object-contain md:w-72"
          priority
        />
        <h1 className="text-4xl font-bold text-white md:text-5xl">
          Ultimate Sports League 2026
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Somerset West's premier multi-sport competition
        </p>

        {/* Stats bar */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 rounded-2xl border border-accent/30 bg-charcoal px-8 py-5">
          {([
            ['16',  'Teams'],
            ['190', 'Players'],
            ['5',   'Sports'],
            ['7',   'Events'],
          ] as const).map(([num, label]) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-3xl font-bold tabular-nums text-accent">{num}</span>
              <span className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Next event */}
      <section className="mx-auto max-w-2xl px-4 pb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Next Event</h2>
        {upcoming ? (
          <div className="rounded-2xl border border-accent/30 bg-charcoal p-6">
            <p className="text-lg font-bold text-white">{formatEventDate(upcoming.date)}</p>
            <p className="mt-1 text-sm text-slate-400">{upcoming.venues.join(' · ')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {upcomingInstances.map(inst => (
                <Link
                  key={inst.id}
                  href={`/schedule/${inst.id}`}
                  className="rounded-lg border border-slate-600 bg-night/60 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:border-accent/60 hover:text-white"
                >
                  {inst.sport} · {divisionById[inst.divisionId]?.name ?? inst.divisionId}
                </Link>
              ))}
            </div>
            <Link
              href="/schedule"
              className="mt-4 inline-flex items-center gap-1 text-sm text-accent transition-colors hover:text-accent/80"
            >
              Full schedule →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-charcoal p-6 text-center text-slate-400">
            Season complete. Check back for 2027.
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Explore</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { href: '/schedule',  title: 'Schedule',  desc: 'All 7 events, dates, venues and sports.' },
            { href: '/standings', title: 'Standings', desc: 'Premier and Challenger division tables.' },
            { href: '/squads',    title: 'Squads',    desc: 'All 16 squads, rosters and results.' },
          ].map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 rounded-2xl border border-slate-700 bg-charcoal px-5 py-5 transition-colors hover:border-accent/50 hover:bg-slate-800/60"
            >
              <span className="font-bold text-white transition-colors group-hover:text-accent">{card.title}</span>
              <span className="text-sm text-slate-400">{card.desc}</span>
              <span className="mt-auto text-sm text-accent">→</span>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}

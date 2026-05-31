import Image from 'next/image';
import Link from 'next/link';
import { loadEventDays, loadEventInstances, loadDivisions } from '../lib/data';

const SPORT_STYLES: Record<string, string> = {
  'Padel':             'bg-padel text-white',
  'Touch Rugby':       'bg-rugby text-white',
  'Fives Soccer':      'bg-soccer text-white',
  '6-a-side Cricket':  'bg-cricket text-white',
  'Golf':              'bg-golf text-white',
  'Finals Weekend':    'bg-accent text-white',
};

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
    <main className="min-h-screen bg-surface">

      {/* Hero */}
      <section className="border-b border-gray-200 bg-white px-4 pb-12 pt-12 text-center">
        <Image
          src="/logo.png"
          alt="Ultimate Sports League"
          width={320}
          height={128}
          className="mx-auto mb-8 h-auto w-52 object-contain md:w-64"
          priority
        />
        <h1 className="text-4xl font-black text-navy md:text-5xl">
          Ultimate Sports League
        </h1>
        <p className="mt-3 text-lg font-semibold text-accent">
          Season 2 — All Rounders Sport League
        </p>

        {/* Stats — four separate cards */}
        <div className="mx-auto mt-10 grid max-w-sm grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-4">
          {([
            ['192', 'Players'],
            ['5',   'Sports'],
            ['6',   'Weekends'],
            ['1',   'Champion'],
          ] as const).map(([num, label]) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl bg-navy px-4 py-5 shadow-sm"
            >
              <span className="text-3xl font-black tabular-nums text-accent">{num}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-widest text-white">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Next event */}
      <section className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Next Event</h2>
        {upcoming ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-l-4 border-l-red px-6 py-5">
              <p className="text-xl font-black text-navy">{formatEventDate(upcoming.date)}</p>
              <p className="mt-1 text-sm text-muted">{upcoming.venues.join(' · ')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {upcomingInstances.map(inst => {
                  const pillStyle = SPORT_STYLES[inst.sport] ?? 'bg-gray-200 text-navy';
                  return (
                    <Link
                      key={inst.id}
                      href={`/schedule/${inst.id}`}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-opacity hover:opacity-80 ${pillStyle}`}
                    >
                      {inst.sport} · {divisionById[inst.divisionId]?.name ?? inst.divisionId}
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/schedule"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:opacity-80"
              >
                Full schedule →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-muted shadow-sm">
            Season complete. Check back for 2027.
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Explore</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { href: '/schedule',  title: 'Schedule',  desc: 'All 7 events, dates, venues and sports.' },
            { href: '/standings', title: 'Standings', desc: 'Premier and Challenger division tables.' },
            { href: '/squads',    title: 'Squads',    desc: 'All 16 squads, rosters and results.' },
          ].map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-lg font-black text-navy">{card.title}</span>
              <span className="text-sm text-muted">{card.desc}</span>
              <span className="mt-auto text-sm font-bold text-accent">→</span>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}

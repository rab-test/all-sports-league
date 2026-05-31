import Link from 'next/link';
import { loadEventDays, loadEventInstances, loadDivisions } from '../../lib/data';

const SPORT_STYLES: Record<string, string> = {
  'Padel':             'bg-padel text-white',
  'Touch Rugby':       'bg-rugby text-white',
  'Fives Soccer':      'bg-soccer text-white',
  '6-a-side Cricket':  'bg-cricket text-white',
  'Golf':              'bg-golf text-white',
  'Finals Weekend':    'bg-accent text-white',
};

function formatDate(iso: string): { weekday: string; date: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString('en-GB', { weekday: 'long' }),
    date: `${d} ${dt.toLocaleDateString('en-GB', { month: 'long' })} ${y}`,
  };
}

export default async function SchedulePage() {
  const [eventDays, eventInstances, divisions] = await Promise.all([
    loadEventDays(),
    loadEventInstances(),
    loadDivisions(),
  ]);

  const divisionById = Object.fromEntries(divisions.map(d => [d.id, d]));
  const sorted = [...eventDays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-black text-navy">2026 Schedule</h1>
      <p className="mb-8 text-sm text-muted">2026 Season — 7 Events</p>

      <ol className="flex flex-col gap-4">
        {sorted.map((day, index) => {
          const instances = eventInstances.filter(i => i.eventDayId === day.id);
          const { weekday, date } = formatDate(day.date);

          return (
            <li key={day.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Date bar */}
              <div className="flex items-start gap-4 border-b border-gray-100 px-5 py-4">
                <span className="min-w-[2.5rem] text-3xl font-black tabular-nums leading-none text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">{weekday}</p>
                  <p className="text-base font-black text-navy">{date}</p>
                </div>
              </div>

              {/* Venue */}
              <div className="px-5 pb-1 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Venue</p>
                <p className="mt-0.5 text-sm text-navy/70">{day.venues.join(' · ')}</p>
              </div>

              {/* Event instances */}
              <ul className="flex flex-col gap-2 px-5 pb-4 pt-3">
                {instances.map(instance => {
                  const division   = divisionById[instance.divisionId];
                  const sportStyle = SPORT_STYLES[instance.sport] ?? 'bg-gray-200 text-navy';
                  return (
                    <li key={instance.id}>
                      <Link
                        href={`/schedule/${instance.id}`}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-surface px-3 py-2.5 transition-all hover:border-gray-300 hover:shadow-sm"
                      >
                        <span className={`shrink-0 rounded px-2.5 py-1 text-xs font-bold ${sportStyle}`}>
                          {instance.sport}
                        </span>
                        <span className="text-sm font-semibold text-navy">
                          {division?.name ?? instance.divisionId}
                        </span>
                        <span className="ml-auto text-xs text-muted">›</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

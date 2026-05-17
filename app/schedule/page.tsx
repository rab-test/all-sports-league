import Link from 'next/link';
import { loadEventDays, loadEventInstances, loadDivisions } from '../../lib/data';

const SPORT_STYLES: Record<string, string> = {
  'Padel':             'bg-padel text-white',
  'Touch Rugby':       'bg-rugby text-white',
  'Fives Soccer':      'bg-soccer text-white',
  '6-a-side Cricket':  'bg-cricket text-white',
  'Golf':              'bg-golf text-white',
  'Finals Weekend':    'bg-accent text-night',
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
      <h1 className="mb-1 text-3xl font-bold text-white">2026 Schedule</h1>
      <p className="mb-8 text-sm text-slate-400">Somerset West League — 7 events</p>

      <ol className="flex flex-col gap-4">
        {sorted.map((day, index) => {
          const instances = eventInstances.filter(i => i.eventDayId === day.id);
          const { weekday, date } = formatDate(day.date);

          return (
            <li key={day.id} className="rounded-xl border border-slate-700 bg-charcoal overflow-hidden">
              {/* Date bar */}
              <div className="flex items-baseline gap-3 border-b border-slate-700 px-5 py-4">
                <span className="text-2xl font-bold text-white tabular-nums leading-none">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {weekday}
                  </p>
                  <p className="text-base font-semibold text-white">{date}</p>
                </div>
              </div>

              {/* Venue */}
              <div className="px-5 pt-3 pb-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Venue</p>
                <p className="mt-0.5 text-sm text-slate-300">{day.venues.join(' · ')}</p>
              </div>

              {/* Event instances */}
              <ul className="px-5 pb-4 pt-3 flex flex-col gap-2">
                {instances.map(instance => {
                  const division = divisionById[instance.divisionId];
                  const sportStyle = SPORT_STYLES[instance.sport] ?? 'bg-slate-700 text-white';
                  return (
                    <li key={instance.id}>
                      <Link
                        href={`/schedule/${instance.id}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-700 bg-night/60 px-3 py-2.5 hover:border-slate-500 hover:bg-night transition-colors"
                      >
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${sportStyle}`}>
                          {instance.sport}
                        </span>
                        <span className="text-sm text-slate-300">
                          {division?.name ?? instance.divisionId}
                        </span>
                        <span className="ml-auto text-slate-600 text-xs">›</span>
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

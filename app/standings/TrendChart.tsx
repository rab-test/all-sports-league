'use client';

import { useMemo, useRef, useState } from 'react';
import type { DivisionHistory } from '../../lib/standings';

// Matches the SPORT_STYLES accent colours used on the schedule page, as hex
// values (an inline SVG can't read Tailwind's bg-* classes).
const SPORT_DOT: Record<string, string> = {
  'Padel':            '#2563EB',
  'Touch Rugby':       '#DC2626',
  'Fives Soccer':      '#16A34A',
  '6-a-side Cricket':  '#D97706',
  'Golf':              '#475569',
};
const DEFAULT_DOT = '#1B2A4A'; // Finals Weekend / anything else

const ACCENT = '#B8972E';
const DE_EMPHASIS = '#DADEE6';

function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function TrendChart({
  history,
  squads,
  selectedId,
  onSelect,
}: {
  history: DivisionHistory | undefined;
  squads: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const events = history?.events ?? [];
  const n = events.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeIndex = hoverIndex ?? (n > 0 ? n - 1 : null);

  const width = 600;
  const height = 240;
  const marginLeft = 30;
  const marginRight = 10;
  const marginTop = 14;
  const marginBottom = 34;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const maxVal = useMemo(() => {
    let m = 0;
    if (history) {
      for (const arr of Object.values(history.cumulative)) {
        for (const v of arr) m = Math.max(m, v);
      }
    }
    return m;
  }, [history]);

  const step = maxVal <= 20 ? 5 : 10;
  const niceMax = Math.max(step, Math.ceil(maxVal / step) * step);
  const yTicks: number[] = [];
  for (let v = 0; v <= niceMax; v += step) yTicks.push(v);

  const xFor = (i: number) => (n <= 1 ? marginLeft + plotW / 2 : marginLeft + (i / (n - 1)) * plotW);
  const yFor = (v: number) => marginTop + plotH - (v / niceMax) * plotH;

  const updateHoverFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const fraction = (clientX - rect.left) / rect.width;
    const i = n <= 1 ? 0 : Math.round(fraction * (n - 1));
    setHoverIndex(Math.min(n - 1, Math.max(0, i)));
  };

  if (n === 0) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-muted shadow-sm">
        The points trend will appear here once the first event is scored.
      </div>
    );
  }

  const selected = squads.find(s => s.id === selectedId) ?? null;

  const snapshot = activeIndex === null
    ? []
    : squads
        .map(s => ({ id: s.id, name: s.name, value: history?.cumulative[s.id]?.[activeIndex] ?? 0 }))
        .sort((a, b) => b.value - a.value);

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wider text-navy">Points Trend</h2>
        {selected && (() => {
          const values = history?.cumulative[selected.id] ?? [];
          const total = values[values.length - 1] ?? 0;
          return (
            <p className="truncate text-xs text-muted">
              <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: ACCENT }} />
              <span className="font-bold text-navy">{selected.name}</span>
              {' · '}
              <span className="font-bold text-navy">{total} pts</span>
            </p>
          );
        })()}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none select-none"
        style={{ height: 'auto' }}
        onPointerMove={e => updateHoverFromClientX(e.clientX)}
        onPointerDown={e => updateHoverFromClientX(e.clientX)}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Gridlines + y-axis ticks */}
        {yTicks.map(v => (
          <g key={v}>
            <line
              x1={marginLeft} x2={width - marginRight} y1={yFor(v)} y2={yFor(v)}
              stroke="#EEF0F3" strokeWidth={1}
            />
            <text x={marginLeft - 6} y={yFor(v)} dy="0.32em" textAnchor="end" fontSize="9" fill="#9AA1AC">
              {v}
            </text>
          </g>
        ))}

        {/* X-axis labels: sport dot + short date */}
        {events.map((ev, i) => (
          <g key={ev.id}>
            <circle cx={xFor(i)} cy={height - marginBottom + 10} r={3} fill={SPORT_DOT[ev.sport] ?? DEFAULT_DOT} />
            <text x={xFor(i)} y={height - marginBottom + 24} textAnchor="middle" fontSize="9" fill="#9AA1AC">
              {shortDate(ev.date)}
            </text>
          </g>
        ))}

        {/* Crosshair */}
        {activeIndex !== null && (
          <line
            x1={xFor(activeIndex)} x2={xFor(activeIndex)}
            y1={marginTop} y2={marginTop + plotH}
            stroke="#DADEE6" strokeWidth={1}
          />
        )}

        {/* De-emphasised lines first, selected line drawn last so it's on top */}
        {squads
          .filter(s => s.id !== selectedId)
          .map(s => {
            const values = history?.cumulative[s.id] ?? [];
            const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(v)}`).join(' ');
            return <path key={s.id} d={d} fill="none" stroke={DE_EMPHASIS} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
          })}

        {selected && (() => {
          const values = history?.cumulative[selected.id] ?? [];
          const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i)},${yFor(v)}`).join(' ');
          const last = values[values.length - 1] ?? 0;
          return (
            <g>
              <path d={d} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xFor(values.length - 1)} cy={yFor(last)} r={4} fill={ACCENT} stroke="#fff" strokeWidth={2} />
              <text
                x={xFor(values.length - 1) - 8}
                y={yFor(last)}
                dy="-0.6em"
                textAnchor="end"
                fontSize="10"
                fontWeight="700"
                fill="#1B2A4A"
              >
                {last}
              </text>
            </g>
          );
        })()}

        {/* Hover dots for every squad at the active index */}
        {activeIndex !== null && squads.map(s => {
          const v = history?.cumulative[s.id]?.[activeIndex];
          if (v === undefined) return null;
          const isSelected = s.id === selectedId;
          return (
            <circle
              key={s.id}
              cx={xFor(activeIndex)} cy={yFor(v)}
              r={isSelected ? 4 : 2.5}
              fill={isSelected ? ACCENT : '#B7BDC8'}
              stroke="#fff" strokeWidth={isSelected ? 2 : 1}
            />
          );
        })}
      </svg>

      {/* Snapshot panel — the accessible, always-reachable twin of the hover tooltip */}
      {activeIndex !== null && (
        <div className="mt-3 rounded-lg bg-surface/60 p-3">
          <p className="mb-2 text-xs font-bold text-navy">
            {events[activeIndex].sport} &middot; {shortDate(events[activeIndex].date)}
          </p>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {snapshot.map(row => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: row.id === selectedId ? ACCENT : DE_EMPHASIS }}
                    />
                    <span className={`truncate ${row.id === selectedId ? 'font-bold text-navy' : 'text-muted'}`}>
                      {row.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-navy">{row.value}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const CORRECT_PIN = '2374';
const CAPTAIN_PIN = '7823';
// event-instance-5 and event-instance-6 are the two 1 August 2026 Fives Soccer events
const CAPTAIN_EVENT_IDS = new Set(['event-instance-5', 'event-instance-6']);

const SPORT_BADGE: Record<string, string> = {
  'Padel':            'bg-padel text-white',
  'Touch Rugby':      'bg-rugby text-white',
  'Fives Soccer':     'bg-soccer text-white',
  '6-a-side Cricket': 'bg-cricket text-white',
  'Golf':             'bg-golf text-white',
  'Finals Weekend':   'bg-accent text-night',
};

// ── Types ────────────────────────────────────────────────────────────────────

type GolfScore = { eventInstanceId: string; squadId: string; totalScore: number };

type StoredFixture = {
  id: string; eventInstanceId: string; poolId: string | null;
  squadAId: string; squadBId: string; round: string; sequence: number;
  scoreA?: number | null; scoreB?: number | null;
  pair1A?: number | null; pair1B?: number | null;
  pair2A?: number | null; pair2B?: number | null;
  pair3A?: number | null; pair3B?: number | null;
  startTime?: string;
  sfOverride?: boolean;
};

type Pool     = { id: string; eventInstanceId: string; name: string; squadIds: string[] };
type Squad    = { id: string; divisionId: string; name: string };
type EventDay = { id: string; date: string; venues: string[] };
type Division = { id: string; name: string };

type JoinedInstance = {
  id: string; divisionId: string; sport: string;
  formatPresetId: string; locked: boolean;
  eventDay: EventDay; division: Division;
};

type AdminData = {
  instances: JoinedInstance[];
  pools: Pool[];
  fixtures: StoredFixture[];
  squads: Squad[];
  golfScores: GolfScore[];
};

type PadelInput = { p1a: string; p1b: string; p2a: string; p2b: string; p3a: string; p3b: string };
type SfOverrideState = { enabled: boolean; squadAId: string; squadBId: string };
type EventStatus = 'draw-pending' | 'in-progress' | 'complete' | 'locked';

// ── Status helpers ───────────────────────────────────────────────────────────

function getEventStatus(
  instance: JoinedInstance,
  pools: Pool[],
  fixtures: StoredFixture[],
  golfScores: GolfScore[],
  divisionSquads: Squad[],
): EventStatus {
  if (instance.locked) return 'locked';

  if (instance.sport === 'Golf') {
    const scored = golfScores.filter(g => g.eventInstanceId === instance.id);
    if (scored.length === 0) return 'draw-pending';
    return scored.length >= divisionSquads.length ? 'complete' : 'in-progress';
  }

  const hasPools = pools.some(p => p.eventInstanceId === instance.id);
  if (!hasPools) return 'draw-pending';

  const fxs    = fixtures.filter(f => f.eventInstanceId === instance.id);
  const poolFx = fxs.filter(f => f.round === 'pool');
  const finalFx = fxs.find(f => f.round === 'final');

  const allPool  = poolFx.length > 0 && poolFx.every(f => f.scoreA != null && f.scoreB != null);
  const finalDone = finalFx != null && finalFx.scoreA != null && finalFx.scoreB != null;

  return allPool && finalDone ? 'complete' : 'in-progress';
}

const STATUS_CONFIG: Record<EventStatus, { label: string; cls: string }> = {
  'draw-pending': { label: 'Draw Pending', cls: 'bg-gray-100 text-gray-500' },
  'in-progress':  { label: 'In Progress',  cls: 'bg-amber-100 text-amber-700' },
  'complete':     { label: 'Complete',     cls: 'bg-green-100 text-green-700' },
  'locked':       { label: 'Locked',       cls: 'bg-red-100 text-red-600' },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [pin,      setPin]      = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [mode,     setMode]     = useState<'admin' | 'captain'>('admin');

  const [data,    setData]    = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { a: string; b: string }>>({});
  const [padelInputs, setPadelInputs] = useState<Record<string, PadelInput>>({});
  const [sfOverrides, setSfOverrides] = useState<Record<string, SfOverrideState>>({});
  const [golfInputs,  setGolfInputs]  = useState<Record<string, string>>({});

  // UI expand/collapse state
  const [expandedCards,   setExpandedCards]   = useState<Set<string>>(new Set());
  const [expandedPadelFx, setExpandedPadelFx] = useState<Set<string>>(new Set());
  const [expandedSfOver,  setExpandedSfOver]  = useState<Set<string>>(new Set());

  // Saving state
  const [savingFx,   setSavingFx]   = useState<string | null>(null);
  const [savingGolf, setSavingGolf] = useState<string | null>(null);
  const [savingSfo,  setSavingSfo]  = useState<string | null>(null);
  const [genDraw,    setGenDraw]    = useState<string | null>(null);
  const [lockingEv,  setLockingEv]  = useState<string | null>(null);
  const [savedKeys,  setSavedKeys]  = useState<Set<string>>(new Set());

  // ── Input initialisation ──────────────────────────────────────────────────
  //
  // Uses functional setState so we can read `prev` at apply-time rather than
  // at call-time.  The rule for every input type:
  //   • If the user has already typed something (non-empty), KEEP IT.
  //   • Only write a value from Airtable when the slot is still empty.
  // This prevents background fetchData calls from clobbering in-progress edits.

  function initInputs(d: AdminData) {
    const instMap = Object.fromEntries(d.instances.map(i => [i.id, i]));

    // ── score inputs ────────────────────────────────────────────────────────
    setScoreInputs(prev => {
      const next = { ...prev };
      for (const fx of d.fixtures) {
        const existing = prev[fx.id];
        // Only initialise when both slots are empty (user hasn't touched them)
        if (!existing || (existing.a === '' && existing.b === '')) {
          next[fx.id] = {
            a: fx.scoreA != null ? String(fx.scoreA) : '',
            b: fx.scoreB != null ? String(fx.scoreB) : '',
          };
        }
      }
      return next;
    });

    // ── padel pair inputs ───────────────────────────────────────────────────
    setPadelInputs(prev => {
      const next = { ...prev };
      for (const fx of d.fixtures) {
        if (instMap[fx.eventInstanceId]?.sport !== 'Padel') continue;
        const existing = prev[fx.id];
        const hasAny = existing && Object.values(existing).some(v => v !== '');
        if (!hasAny) {
          next[fx.id] = {
            p1a: fx.pair1A != null ? String(fx.pair1A) : '',
            p1b: fx.pair1B != null ? String(fx.pair1B) : '',
            p2a: fx.pair2A != null ? String(fx.pair2A) : '',
            p2b: fx.pair2B != null ? String(fx.pair2B) : '',
            p3a: fx.pair3A != null ? String(fx.pair3A) : '',
            p3b: fx.pair3B != null ? String(fx.pair3B) : '',
          };
        }
      }
      return next;
    });

    // ── SF overrides — always refresh (not user-typed free-form values) ─────
    const sfo: Record<string, SfOverrideState> = {};
    for (const fx of d.fixtures) {
      if (fx.round === 'semi') {
        sfo[fx.id] = {
          enabled:  fx.sfOverride ?? false,
          squadAId: fx.squadAId ?? '',
          squadBId: fx.squadBId ?? '',
        };
      }
    }
    setSfOverrides(sfo);

    // ── golf inputs ─────────────────────────────────────────────────────────
    setGolfInputs(prev => {
      const next = { ...prev };
      for (const gs of d.golfScores) {
        const key = `${gs.eventInstanceId}-${gs.squadId}`;
        if (!prev[key]) {
          next[key] = String(gs.totalScore);
        }
      }
      return next;
    });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data', { cache: 'no-store' });
      const d: AdminData = await res.json();
      setData(d);
      initInputs(d);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (unlocked) fetchData(); }, [unlocked, fetchData]);

  // ── Actions ───────────────────────────────────────────────────────────────

  function handlePin() {
    if (pin === CORRECT_PIN)   { setMode('admin');   setUnlocked(true); setPinError(false); }
    else if (pin === CAPTAIN_PIN) { setMode('captain'); setUnlocked(true); setPinError(false); }
    else { setPinError(true); setPin(''); }
  }

  async function generateDraw(eid: string, hasPools: boolean) {
    if (hasPools && !window.confirm('Regenerate draw? Existing pools and fixtures will be overwritten.')) return;
    setGenDraw(eid);
    try {
      await fetch('/api/admin/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId: eid }),
      });
      await fetchData();
    } finally {
      setGenDraw(null);
    }
  }

  async function saveScore(fxId: string) {
    const inp = scoreInputs[fxId];
    if (!inp || inp.a === '' || inp.b === '') return;
    setSavingFx(fxId);
    try {
      await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId: fxId, scoreA: Number(inp.a), scoreB: Number(inp.b) }),
      });
      await fetchData();
      markSaved(fxId);
    } finally {
      setSavingFx(null);
    }
  }

  async function savePadelScore(fxId: string) {
    const inp = padelInputs[fxId];
    if (!inp) return;
    if ([inp.p1a, inp.p1b, inp.p2a, inp.p2b, inp.p3a, inp.p3b].some(v => v === '')) return;
    setSavingFx(fxId);
    try {
      await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId: fxId,
          pair1A: Number(inp.p1a), pair1B: Number(inp.p1b),
          pair2A: Number(inp.p2a), pair2B: Number(inp.p2b),
          pair3A: Number(inp.p3a), pair3B: Number(inp.p3b),
        }),
      });
      await fetchData();
      markSaved(fxId);
    } finally {
      setSavingFx(null);
    }
  }

  async function saveSfOverride(fxId: string) {
    const state = sfOverrides[fxId];
    if (!state) return;
    setSavingSfo(fxId);
    try {
      await fetch('/api/admin/sf-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId: fxId,
          sfOverride: state.enabled,
          squadAId:   state.squadAId,
          squadBId:   state.squadBId,
        }),
      });
      await fetchData();
    } finally {
      setSavingSfo(null);
    }
  }

  async function saveGolfScore(eid: string, squadId: string) {
    const key = `${eid}-${squadId}`;
    const val = golfInputs[key];
    if (!val) return;
    setSavingGolf(key);
    try {
      await fetch('/api/admin/golf-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId: eid, squadId, totalScore: Number(val) }),
      });
      await fetchData();
      markSaved(key);
    } finally {
      setSavingGolf(null);
    }
  }

  async function toggleLock(eid: string, locked: boolean) {
    setLockingEv(eid);
    try {
      await fetch('/api/admin/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId: eid, locked }),
      });
      await fetchData();
    } finally {
      setLockingEv(null);
    }
  }

  function markSaved(key: string) {
    setSavedKeys(prev => new Set(prev).add(key));
    setTimeout(() => setSavedKeys(prev => { const s = new Set(prev); s.delete(key); return s; }), 2000);
  }

  function toggleCard(id: string) {
    setExpandedCards(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function togglePadelFx(id: string) {
    setExpandedPadelFx(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleSfOver(id: string) {
    setExpandedSfOver(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // ── Fixture row renderers (closures over state) ───────────────────────────

  function renderPoolRow(fx: StoredFixture, isPadel: boolean, isLocked: boolean, squadMap: Record<string, Squad>) {
    const hasResult = fx.scoreA != null && fx.scoreB != null;
    const aWins = hasResult && (fx.scoreA ?? 0) > (fx.scoreB ?? 0);
    const bWins = hasResult && (fx.scoreB ?? 0) > (fx.scoreA ?? 0);
    const clsA = aWins ? 'font-bold text-accent' : bWins ? 'text-gray-400' : 'font-medium text-navy';
    const clsB = bWins ? 'font-bold text-accent' : aWins ? 'text-gray-400' : 'font-medium text-navy';

    if (isPadel) {
      const pi       = padelInputs[fx.id] ?? { p1a:'', p1b:'', p2a:'', p2b:'', p3a:'', p3b:'' };
      const expanded = expandedPadelFx.has(fx.id);
      return (
        <div key={fx.id} className="rounded-lg border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 bg-white px-3 py-2.5">
            <span className={`flex-1 text-sm ${clsA}`}>{squadMap[fx.squadAId]?.name ?? '?'}</span>
            <span className={`shrink-0 tabular-nums text-sm ${hasResult ? 'font-bold text-accent' : 'text-gray-300'}`}>
              {hasResult ? `${fx.scoreA} – ${fx.scoreB}` : 'vs'}
            </span>
            <span className={`flex-1 text-right text-sm ${clsB}`}>{squadMap[fx.squadBId]?.name ?? '?'}</span>
            <button
              onClick={() => togglePadelFx(fx.id)}
              className="ml-2 shrink-0 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:border-navy hover:text-navy transition-colors"
            >
              {expanded ? '▲ Pairs' : '▼ Pairs'}
            </button>
          </div>
          {expanded && (
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
              {([1, 2, 3] as const).map(n => {
                const ak = `p${n}a` as keyof PadelInput;
                const bk = `p${n}b` as keyof PadelInput;
                return (
                  <div key={n} className="mb-2 flex items-center gap-2">
                    <span className="w-12 text-xs text-gray-400">Pair {n}</span>
                    <input
                      type="number" min="0" placeholder="0" disabled={isLocked}
                      value={pi[ak]}
                      onChange={e => setPadelInputs(p => ({ ...p, [fx.id]: { ...(p[fx.id] ?? pi), [ak]: e.target.value } }))}
                      onBlur={() => savePadelScore(fx.id)}
                      className="w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                    />
                    <span className="text-xs text-gray-300">–</span>
                    <input
                      type="number" min="0" placeholder="0" disabled={isLocked}
                      value={pi[bk]}
                      onChange={e => setPadelInputs(p => ({ ...p, [fx.id]: { ...(p[fx.id] ?? pi), [bk]: e.target.value } }))}
                      onBlur={() => savePadelScore(fx.id)}
                      className="w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                    />
                  </div>
                );
              })}
              <div className="mt-2 flex justify-end">
                <span className="text-xs font-medium text-green-600">
                  {savedKeys.has(fx.id) ? 'Saved ✓' : savingFx === fx.id ? '…' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    const inp = scoreInputs[fx.id] ?? { a: '', b: '' };
    return (
      <div key={fx.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5">
        <span className={`flex-1 min-w-0 truncate text-sm ${clsA}`}>{squadMap[fx.squadAId]?.name ?? '?'}</span>
        <input
          type="number" min="0" placeholder="0" disabled={isLocked}
          value={inp.a}
          onChange={e => setScoreInputs(p => ({ ...p, [fx.id]: { ...p[fx.id], a: e.target.value } }))}
          onBlur={() => saveScore(fx.id)}
          className="w-14 shrink-0 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
        />
        <span className="shrink-0 text-xs text-gray-300">–</span>
        <input
          type="number" min="0" placeholder="0" disabled={isLocked}
          value={inp.b}
          onChange={e => setScoreInputs(p => ({ ...p, [fx.id]: { ...p[fx.id], b: e.target.value } }))}
          onBlur={() => saveScore(fx.id)}
          className="w-14 shrink-0 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
        />
        <span className={`flex-1 min-w-0 truncate text-right text-sm ${clsB}`}>{squadMap[fx.squadBId]?.name ?? '?'}</span>
        <span className="ml-1 w-14 shrink-0 text-right text-xs font-medium text-green-600">
          {savedKeys.has(fx.id) ? 'Saved ✓' : savingFx === fx.id ? '…' : ''}
        </span>
      </div>
    );
  }

  function renderKnockoutRow(
    fx: StoredFixture,
    isPadel: boolean,
    isLocked: boolean,
    divisionSquads: Squad[],
    squadMap: Record<string, Squad>,
  ) {
    const label    = fx.round === 'semi' ? `SF${fx.sequence}` : fx.round === 'final' ? 'Final' : '3rd/4th';
    const isSemi   = fx.round === 'semi';
    const sfoOpen  = expandedSfOver.has(fx.id);
    const sfo      = sfOverrides[fx.id];

    // Derive display names from the fixture data (populated by the result route
    // once all pool scores are in, or from a manual SF override).
    const nameA = squadMap[fx.squadAId]?.name;
    const nameB = squadMap[fx.squadBId]?.name;
    const hasBoth = !!(nameA && nameB) ||
      !!(isSemi && sfo?.enabled && sfo.squadAId && sfo.squadBId);

    const hasResult = fx.scoreA != null && fx.scoreB != null;
    const aWins     = hasResult && (fx.scoreA ?? 0) > (fx.scoreB ?? 0);
    const bWins     = hasResult && (fx.scoreB ?? 0) > (fx.scoreA ?? 0);
    const clsA      = aWins ? 'font-bold text-accent' : bWins ? 'text-gray-400' : hasBoth ? 'font-medium text-navy' : 'text-gray-300 italic';
    const clsB      = bWins ? 'font-bold text-accent' : aWins ? 'text-gray-400' : hasBoth ? 'font-medium text-navy' : 'text-gray-300 italic';

    const scoreRow = (extraRight?: React.ReactNode) => {
      if (isPadel) {
        const pi       = padelInputs[fx.id] ?? { p1a:'', p1b:'', p2a:'', p2b:'', p3a:'', p3b:'' };
        const expanded = expandedPadelFx.has(fx.id);
        return (
          <>
            <div className="flex items-center gap-2 bg-white px-3 py-2.5">
              <span className="w-10 shrink-0 text-xs font-bold text-gray-400">{label}</span>
              <span className={`flex-1 text-sm ${clsA}`}>{nameA || 'TBD'}</span>
              <span className={`shrink-0 tabular-nums text-sm ${hasResult ? 'font-bold text-accent' : 'text-gray-300'}`}>
                {hasResult ? `${fx.scoreA} – ${fx.scoreB}` : 'vs'}
              </span>
              <span className={`flex-1 text-right text-sm ${clsB}`}>{nameB || 'TBD'}</span>
              {hasBoth && (
                <button
                  onClick={() => togglePadelFx(fx.id)}
                  className="ml-1 shrink-0 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:border-navy hover:text-navy transition-colors"
                >
                  {expanded ? '▲' : '▼'}
                </button>
              )}
              {extraRight}
            </div>
            {expanded && hasBoth && (
              <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
                {([1, 2, 3] as const).map(n => {
                  const ak = `p${n}a` as keyof PadelInput;
                  const bk = `p${n}b` as keyof PadelInput;
                  return (
                    <div key={n} className="mb-2 flex items-center gap-2">
                      <span className="w-12 text-xs text-gray-400">Pair {n}</span>
                      <input
                        type="number" min="0" placeholder="0" disabled={isLocked}
                        value={pi[ak]}
                        onChange={e => setPadelInputs(p => ({ ...p, [fx.id]: { ...(p[fx.id] ?? pi), [ak]: e.target.value } }))}
                        onBlur={() => savePadelScore(fx.id)}
                        className="w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                      />
                      <span className="text-xs text-gray-300">–</span>
                      <input
                        type="number" min="0" placeholder="0" disabled={isLocked}
                        value={pi[bk]}
                        onChange={e => setPadelInputs(p => ({ ...p, [fx.id]: { ...(p[fx.id] ?? pi), [bk]: e.target.value } }))}
                        onBlur={() => savePadelScore(fx.id)}
                        className="w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                      />
                    </div>
                  );
                })}
                <div className="mt-2 flex justify-end">
                  <span className="text-xs font-medium text-green-600">
                    {savedKeys.has(fx.id) ? 'Saved ✓' : savingFx === fx.id ? '…' : ''}
                  </span>
                </div>
              </div>
            )}
          </>
        );
      }

      const inp = scoreInputs[fx.id] ?? { a: '', b: '' };
      return (
        <div className="flex items-center gap-2 bg-white px-3 py-2.5">
          <span className="w-10 shrink-0 text-xs font-bold text-gray-400">{label}</span>
          <span className={`flex-1 min-w-0 truncate text-sm ${clsA}`}>{nameA || 'TBD'}</span>
          <input
            type="number" min="0" placeholder="0" disabled={isLocked}
            value={inp.a}
            onChange={e => setScoreInputs(p => ({ ...p, [fx.id]: { ...p[fx.id], a: e.target.value } }))}
            onBlur={() => saveScore(fx.id)}
            className="w-14 shrink-0 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
          />
          <span className="shrink-0 text-xs text-gray-300">–</span>
          <input
            type="number" min="0" placeholder="0" disabled={isLocked}
            value={inp.b}
            onChange={e => setScoreInputs(p => ({ ...p, [fx.id]: { ...p[fx.id], b: e.target.value } }))}
            onBlur={() => saveScore(fx.id)}
            className="w-14 shrink-0 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
          />
          <span className={`flex-1 min-w-0 truncate text-right text-sm ${clsB}`}>{nameB || 'TBD'}</span>
          <span className="ml-1 w-14 shrink-0 text-right text-xs font-medium text-green-600">
            {savedKeys.has(fx.id) ? 'Saved ✓' : savingFx === fx.id ? '…' : ''}
          </span>
          {extraRight}
        </div>
      );
    };

    const isCaptain = mode === 'captain';
    return (
      <div key={fx.id} className="rounded-lg border border-gray-100 overflow-hidden">
        {scoreRow(
          isSemi && !isCaptain ? (
            <button
              onClick={() => toggleSfOver(fx.id)}
              className="ml-1 shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-navy transition-colors"
            >
              {sfoOpen ? 'Close' : 'Override'}
            </button>
          ) : undefined
        )}

        {/* SF Override panel */}
        {isSemi && !isCaptain && sfoOpen && sfo && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={sfo.enabled}
                onChange={e => setSfOverrides(p => ({ ...p, [fx.id]: { ...p[fx.id], enabled: e.target.checked } }))}
                className="accent-accent disabled:cursor-not-allowed"
              />
              Override auto-selection
            </label>
            {sfo.enabled && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  disabled={isLocked}
                  value={sfo.squadAId}
                  onChange={e => setSfOverrides(p => ({ ...p, [fx.id]: { ...p[fx.id], squadAId: e.target.value } }))}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                >
                  <option value="">Squad A…</option>
                  {divisionSquads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span className="text-xs text-gray-400">vs</span>
                <select
                  disabled={isLocked}
                  value={sfo.squadBId}
                  onChange={e => setSfOverrides(p => ({ ...p, [fx.id]: { ...p[fx.id], squadBId: e.target.value } }))}
                  className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                >
                  <option value="">Squad B…</option>
                  {divisionSquads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  disabled={isLocked || savingSfo === fx.id || !sfo.squadAId || !sfo.squadBId}
                  onClick={() => saveSfOverride(fx.id)}
                  className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy/80 disabled:opacity-40 transition-colors"
                >
                  {savingSfo === fx.id ? '…' : 'Apply'}
                </button>
              </div>
            )}
            {!sfo.enabled && (
              <button
                disabled={isLocked || savingSfo === fx.id}
                onClick={() => saveSfOverride(fx.id)}
                className="rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:text-navy disabled:opacity-40 transition-colors"
              >
                {savingSfo === fx.id ? '…' : 'Reset to auto'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── PIN screen ────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-night px-4">
        <div className="w-full max-w-xs rounded-xl border border-slate-700 bg-charcoal p-8">
          <h1 className="mb-6 text-center text-xl font-bold text-white">Admin Access</h1>
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="PIN" autoComplete="off"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePin()}
            className="w-full rounded-lg border border-slate-600 bg-night px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-accent focus:outline-none"
          />
          {pinError && <p className="mt-2 text-center text-sm text-red-400">Incorrect PIN</p>}
          <button
            onClick={handlePin}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-bold text-night hover:bg-accent/90 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!data) return null;

  const isCaptain = mode === 'captain';

  // Filter to the captain's two events when in captain mode
  const sorted = [...data.instances]
    .filter(i => !isCaptain || CAPTAIN_EVENT_IDS.has(i.id))
    .sort((a, b) => a.eventDay.date.localeCompare(b.eventDay.date));

  // Map squads by both custom id AND Airtable _recordId so knockout
  // squadAId values resolve regardless of which format Airtable returns.
  const squadMap: Record<string, Squad> = {};
  for (const s of data.squads) {
    if (s.id) squadMap[s.id] = s;
    const rec = (s as Squad & { _recordId?: string })._recordId;
    if (rec) squadMap[rec] = s;
  }

  // ── Main panel ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-navy">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <h1 className="text-base font-bold text-white">
            {isCaptain ? 'Result Entry' : 'Ultimate Sports League — Admin'}
          </h1>
          <div className="flex items-center gap-4">
            {loading && <span className="text-xs text-slate-400">Saving…</span>}
            <button
              onClick={() => setUnlocked(false)}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Event cards */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col gap-3">

          {sorted.map(instance => {
            const divisionSquads = data.squads.filter(s => s.divisionId === instance.divisionId);
            const status         = getEventStatus(instance, data.pools, data.fixtures, data.golfScores, divisionSquads);
            const statusCfg      = STATUS_CONFIG[status];
            const isExpanded     = expandedCards.has(instance.id);
            const isPadel        = instance.sport === 'Padel';
            const isGolf         = instance.sport === 'Golf';
            const isLocked       = instance.locked;
            const badgeCls       = SPORT_BADGE[instance.sport] ?? 'bg-gray-400 text-white';

            const instancePools = data.pools.filter(p => p.eventInstanceId === instance.id);
            const allFx         = data.fixtures.filter(f => f.eventInstanceId === instance.id);
            const poolFx        = allFx.filter(f => f.round === 'pool');
            const knockoutFx    = allFx
              .filter(f => f.round !== 'pool')
              .sort((a, b) => {
                const o: Record<string, number> = { semi: 0, final: 1, '3rd-4th': 2 };
                return (o[a.round] ?? 9) - (o[b.round] ?? 9) || a.sequence - b.sequence;
              });

            return (
              <div key={instance.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                {/* ── Card header ─────────────────────────────────────── */}
                <button
                  type="button"
                  onClick={() => toggleCard(instance.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeCls}`}>
                      {instance.sport}
                    </span>
                    <span className="text-sm font-semibold text-navy">
                      {instance.division?.name} Division
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(instance.eventDay.date)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* ── Card body ────────────────────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-gray-100">

                    {isGolf ? (
                      /* ── Golf ── */
                      <div className="px-5 py-5">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Scores</p>
                        <div className="flex flex-col gap-1.5">
                          {divisionSquads.map(squad => {
                            const key = `${instance.id}-${squad.id}`;
                            const saved = data.golfScores.find(
                              g => g.eventInstanceId === instance.id && g.squadId === squad.id
                            );
                            return (
                              <div key={squad.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5">
                                <span className={`flex-1 text-sm font-medium ${saved ? 'text-navy' : 'text-gray-500'}`}>
                                  {squad.name}
                                </span>
                                <input
                                  type="number" min="0" placeholder="—" disabled={isLocked}
                                  value={golfInputs[key] ?? ''}
                                  onChange={e => setGolfInputs(p => ({ ...p, [key]: e.target.value }))}
                                  onBlur={() => saveGolfScore(instance.id, squad.id)}
                                  className="w-20 rounded border border-gray-200 px-2 py-1.5 text-center text-sm text-navy focus:border-accent focus:outline-none disabled:opacity-40"
                                />
                                <span className="w-14 shrink-0 text-right text-xs font-medium text-green-600">
                                  {savedKeys.has(key) ? 'Saved ✓' : savingGolf === key ? '…' : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    ) : (
                      /* ── Preset A ── */
                      <>
                        {/* SECTION 1 — DRAW (admin only) */}
                        {!isCaptain && <div className="border-b border-gray-100 px-5 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Draw</p>
                            {instancePools.length > 0 && (
                              <button
                                disabled={isLocked || genDraw === instance.id}
                                onClick={() => generateDraw(instance.id, true)}
                                className="text-xs text-gray-400 underline underline-offset-2 hover:text-navy disabled:opacity-40 transition-colors"
                              >
                                {genDraw === instance.id ? 'Regenerating…' : 'Regenerate Draw'}
                              </button>
                            )}
                          </div>

                          {instancePools.length === 0 ? (
                            <button
                              disabled={isLocked || genDraw === instance.id}
                              onClick={() => generateDraw(instance.id, false)}
                              className="w-full rounded-xl border-2 border-dashed border-gray-200 py-6 text-sm font-semibold text-gray-400 transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                            >
                              {genDraw === instance.id ? 'Generating…' : '+ Generate Draw'}
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {instancePools.map(pool => (
                                <div key={pool.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Pool {pool.name}
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {pool.squadIds.map(sid => (
                                      <span key={sid} className="truncate text-sm font-medium text-navy">
                                        {squadMap[sid]?.name ?? sid}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>}

                        {/* SECTION 2 — POOL RESULTS */}
                        {instancePools.length > 0 && (
                          <div className="border-b border-gray-100 px-5 py-4">
                            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Pool Results</p>
                            <div className="flex flex-col gap-5">
                              {instancePools.map(pool => {
                                const pf = poolFx
                                  .filter(f => f.poolId === pool.id)
                                  .sort((a, b) => {
                                    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                                    if (a.startTime) return -1;
                                    if (b.startTime) return 1;
                                    return a.sequence - b.sequence;
                                  });
                                return (
                                  <div key={pool.id}>
                                    <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Pool {pool.name}</p>
                                    <div className="flex flex-col gap-1.5">
                                      {pf.map(fx => renderPoolRow(fx, isPadel, isLocked, squadMap))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* SECTION 3 — KNOCKOUT */}
                        {knockoutFx.length > 0 && (
                          <div className="border-b border-gray-100 px-5 py-4">
                            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">Knockout</p>
                            <div className="flex flex-col gap-1.5">
                              {knockoutFx.map(fx =>
                                renderKnockoutRow(fx, isPadel, isLocked, divisionSquads, squadMap)
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* LOCK / UNLOCK (admin only) */}
                    {!isCaptain && <div className="px-5 py-4">
                      <button
                        disabled={lockingEv === instance.id}
                        onClick={() => toggleLock(instance.id, !isLocked)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                          isLocked
                            ? 'border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-navy'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        {lockingEv === instance.id ? 'Saving…' : isLocked ? 'Unlock Event' : 'Lock Event'}
                      </button>
                    </div>}

                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

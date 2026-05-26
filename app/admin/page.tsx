'use client';

import { useState, useEffect, useCallback } from 'react';

const CORRECT_PIN = '2374';

const SPORT_BADGE: Record<string, string> = {
  'Padel':            'bg-padel text-white',
  'Touch Rugby':      'bg-rugby text-white',
  'Fives Soccer':     'bg-soccer text-white',
  '6-a-side Cricket': 'bg-cricket text-white',
  'Golf':             'bg-golf text-white',
  'Finals Weekend':   'bg-accent text-night',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

type GolfScore    = { eventInstanceId: string; squadId: string; totalScore: number };
type StoredFixture = {
  id: string; eventInstanceId: string; poolId: string | null;
  squadAId: string; squadBId: string; round: string; sequence: number;
  scoreA?: number | null; scoreB?: number | null;
  pair1A?: number | null; pair1B?: number | null;
  pair2A?: number | null; pair2B?: number | null;
  pair3A?: number | null; pair3B?: number | null;
  sfOverride?: boolean;
};
type Pool     = { id: string; eventInstanceId: string; name: string; squadIds: string[] };
type Squad    = { id: string; divisionId: string; name: string };
type EventDay = { id: string; date: string; venues: string[] };
type Division = { id: string; name: string; squadIds: string[] };
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
type SfOverride = { enabled: boolean; squadAId: string; squadBId: string };

export default function AdminPage() {
  const [pin, setPin]           = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [data, setData]         = useState<AdminData | null>(null);
  const [loading, setLoading]   = useState(false);

  const [scoreInputs,  setScoreInputs]  = useState<Record<string, { a: string; b: string }>>({});
  const [padelInputs,  setPadelInputs]  = useState<Record<string, PadelInput>>({});
  const [sfOverrides,  setSfOverrides]  = useState<Record<string, SfOverride>>({});
  const [golfInputs,   setGolfInputs]   = useState<Record<string, string>>({});

  const [savingFixture,  setSavingFixture]  = useState<string | null>(null);
  const [savingGolf,     setSavingGolf]     = useState<string | null>(null);
  const [savingSfOver,   setSavingSfOver]   = useState<string | null>(null);
  const [generatingDraw, setGeneratingDraw] = useState<string | null>(null);
  const [lockingEvent,   setLockingEvent]   = useState<string | null>(null);

  function initInputs(d: AdminData) {
    const si: Record<string, { a: string; b: string }> = {};
    const pi: Record<string, PadelInput> = {};
    const sfo: Record<string, SfOverride> = {};

    const instanceMap = Object.fromEntries(d.instances.map(i => [i.id, i]));

    for (const fx of d.fixtures) {
      si[fx.id] = {
        a: fx.scoreA != null ? String(fx.scoreA) : '',
        b: fx.scoreB != null ? String(fx.scoreB) : '',
      };
      if (instanceMap[fx.eventInstanceId]?.sport === 'Padel') {
        pi[fx.id] = {
          p1a: fx.pair1A != null ? String(fx.pair1A) : '',
          p1b: fx.pair1B != null ? String(fx.pair1B) : '',
          p2a: fx.pair2A != null ? String(fx.pair2A) : '',
          p2b: fx.pair2B != null ? String(fx.pair2B) : '',
          p3a: fx.pair3A != null ? String(fx.pair3A) : '',
          p3b: fx.pair3B != null ? String(fx.pair3B) : '',
        };
      }
      if (fx.round === 'semi') {
        sfo[fx.id] = {
          enabled:  fx.sfOverride ?? false,
          squadAId: fx.squadAId ?? '',
          squadBId: fx.squadBId ?? '',
        };
      }
    }
    setScoreInputs(si);
    setPadelInputs(pi);
    setSfOverrides(sfo);

    const gi: Record<string, string> = {};
    for (const gs of d.golfScores) {
      gi[`${gs.eventInstanceId}-${gs.squadId}`] = String(gs.totalScore);
    }
    setGolfInputs(gi);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data');
      const d: AdminData = await res.json();
      setData(d);
      initInputs(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchData();
  }, [unlocked, fetchData]);

  function handlePin() {
    if (pin === CORRECT_PIN) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  }

  async function generateDraw(eventInstanceId: string, hasPools: boolean) {
    if (hasPools && !window.confirm('Regenerate draw? This will overwrite existing pools and fixtures.')) return;
    setGeneratingDraw(eventInstanceId);
    try {
      await fetch('/api/admin/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId }),
      });
      await fetchData();
    } finally {
      setGeneratingDraw(null);
    }
  }

  async function saveScore(fixtureId: string) {
    const inputs = scoreInputs[fixtureId];
    if (!inputs) return;
    setSavingFixture(fixtureId);
    try {
      await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixtureId, scoreA: Number(inputs.a), scoreB: Number(inputs.b) }),
      });
      setData(prev => prev && ({
        ...prev,
        fixtures: prev.fixtures.map(f =>
          f.id === fixtureId ? { ...f, scoreA: Number(inputs.a), scoreB: Number(inputs.b) } : f
        ),
      }));
    } finally {
      setSavingFixture(null);
    }
  }

  async function savePadelScore(fixtureId: string) {
    const inp = padelInputs[fixtureId];
    if (!inp) return;
    setSavingFixture(fixtureId);
    try {
      const pairs: [number, number][] = [
        [Number(inp.p1a), Number(inp.p1b)],
        [Number(inp.p2a), Number(inp.p2b)],
        [Number(inp.p3a), Number(inp.p3b)],
      ];
      const scoreA = pairs.filter(([a, b]) => a > b).length;
      const scoreB = pairs.filter(([a, b]) => b > a).length;
      await fetch('/api/admin/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId,
          pair1A: pairs[0][0], pair1B: pairs[0][1],
          pair2A: pairs[1][0], pair2B: pairs[1][1],
          pair3A: pairs[2][0], pair3B: pairs[2][1],
        }),
      });
      setData(prev => prev && ({
        ...prev,
        fixtures: prev.fixtures.map(f =>
          f.id === fixtureId ? {
            ...f, scoreA, scoreB,
            pair1A: pairs[0][0], pair1B: pairs[0][1],
            pair2A: pairs[1][0], pair2B: pairs[1][1],
            pair3A: pairs[2][0], pair3B: pairs[2][1],
          } : f
        ),
      }));
    } finally {
      setSavingFixture(null);
    }
  }

  async function saveSfOverride(fixtureId: string) {
    const state = sfOverrides[fixtureId];
    if (!state) return;
    setSavingSfOver(fixtureId);
    try {
      await fetch('/api/admin/sf-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId,
          sfOverride: state.enabled,
          squadAId: state.squadAId,
          squadBId: state.squadBId,
        }),
      });
      await fetchData();
    } finally {
      setSavingSfOver(null);
    }
  }

  async function saveGolfScore(eventInstanceId: string, squadId: string) {
    const key = `${eventInstanceId}-${squadId}`;
    const val = golfInputs[key];
    if (val === undefined || val === '') return;
    setSavingGolf(key);
    try {
      await fetch('/api/admin/golf-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId, squadId, totalScore: Number(val) }),
      });
      setData(prev => {
        if (!prev) return prev;
        const idx = prev.golfScores.findIndex(
          g => g.eventInstanceId === eventInstanceId && g.squadId === squadId
        );
        const updated = [...prev.golfScores];
        if (idx === -1) updated.push({ eventInstanceId, squadId, totalScore: Number(val) });
        else updated[idx] = { ...updated[idx], totalScore: Number(val) };
        return { ...prev, golfScores: updated };
      });
    } finally {
      setSavingGolf(null);
    }
  }

  async function toggleLock(eventInstanceId: string, locked: boolean) {
    setLockingEvent(eventInstanceId);
    try {
      await fetch('/api/admin/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventInstanceId, locked }),
      });
      setData(prev => prev && ({
        ...prev,
        instances: prev.instances.map(i =>
          i.id === eventInstanceId ? { ...i, locked } : i
        ),
      }));
    } finally {
      setLockingEvent(null);
    }
  }

  // ── PIN screen ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center px-4">
        <div className="bg-charcoal rounded-xl border border-slate-700 p-8 w-full max-w-xs">
          <h1 className="text-white text-xl font-bold mb-6 text-center">Admin Access</h1>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN"
            autoComplete="off"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePin()}
            className="w-full rounded-lg border border-slate-600 bg-night px-4 py-3 text-white text-center text-2xl tracking-[0.5em] focus:border-accent focus:outline-none"
          />
          {pinError && (
            <p className="text-red-400 text-sm mt-2 text-center">Incorrect PIN</p>
          )}
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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const sorted   = [...data.instances].sort((a, b) => a.eventDay.date.localeCompare(b.eventDay.date));
  const squadMap = Object.fromEntries(data.squads.map(s => [s.id, s]));

  // ── Admin panel ─────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Ultimate Sports League — Admin</h1>

      <div className="flex flex-col gap-6">
        {sorted.map(instance => {
          const instancePools    = data.pools.filter(p => p.eventInstanceId === instance.id);
          const instanceFixtures = data.fixtures.filter(
            f => f.eventInstanceId === instance.id && f.round === 'pool'
          );
          const knockoutFixtures = data.fixtures
            .filter(f => f.eventInstanceId === instance.id && f.round !== 'pool')
            .sort((a, b) => {
              const order: Record<string, number> = { semi: 0, final: 1, '3rd-4th': 2 };
              return (order[a.round] ?? 3) - (order[b.round] ?? 3) || a.sequence - b.sequence;
            });
          const divisionSquads   = data.squads.filter(s => s.divisionId === instance.divisionId);
          const isPadel          = instance.sport === 'Padel';
          const isGolf           = instance.sport === 'Golf';
          const isLocked         = instance.locked;
          const badgeClass       = SPORT_BADGE[instance.sport] ?? 'bg-slate-700 text-white';

          return (
            <div key={instance.id} className="rounded-xl border border-slate-700 bg-charcoal overflow-hidden">

              {/* Card header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-700">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
                    {instance.sport}
                  </span>
                  <span className="text-slate-300 text-sm font-medium">
                    {instance.division?.name} Division
                  </span>
                  <span className="text-slate-500 text-xs">
                    {formatDate(instance.eventDay.date)}
                  </span>
                </div>
                {isLocked && (
                  <span className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-400 whitespace-nowrap">
                    🔒 Locked
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="px-5 py-4">

                {isGolf ? (
                  /* ── Golf score entry ── */
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase">
                        <th className="py-2 text-left">Squad</th>
                        <th className="py-2 text-center w-28">Total Score</th>
                        <th className="py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {divisionSquads.map(squad => {
                        const key = `${instance.id}-${squad.id}`;
                        return (
                          <tr key={squad.id} className="border-t border-slate-800">
                            <td className="py-2.5 text-white">{squad.name}</td>
                            <td className="py-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="—"
                                disabled={isLocked}
                                value={golfInputs[key] ?? ''}
                                onChange={e => setGolfInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-24 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                disabled={isLocked || savingGolf === key}
                                onClick={() => saveGolfScore(instance.id, squad.id)}
                                className="rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {savingGolf === key ? '…' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                ) : (
                  /* ── Preset A: draw + fixtures ── */
                  <div>
                    <div className="mb-4">
                      <button
                        disabled={isLocked || generatingDraw === instance.id}
                        onClick={() => generateDraw(instance.id, instancePools.length > 0)}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingDraw === instance.id
                          ? 'Generating…'
                          : instancePools.length > 0
                          ? 'Regenerate Draw'
                          : 'Generate Draw'}
                      </button>
                    </div>

                    {instancePools.length === 0 ? (
                      <p className="text-slate-500 text-sm">No draw generated yet</p>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {instancePools.map(pool => {
                          const pf = instanceFixtures
                            .filter(f => f.poolId === pool.id)
                            .sort((a, b) => a.sequence - b.sequence);

                          return (
                            <div key={pool.id}>
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Pool {pool.name}
                              </p>

                              {/* Squad chips */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {pool.squadIds.map(sid => (
                                  <span
                                    key={sid}
                                    className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                                  >
                                    {squadMap[sid]?.name ?? sid}
                                  </span>
                                ))}
                              </div>

                              {/* Fixture rows */}
                              {pf.length === 0 ? (
                                <p className="text-slate-600 text-xs">No fixtures yet</p>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {pf.map(fx => {
                                    if (isPadel) {
                                      const pi = padelInputs[fx.id] ?? { p1a: '', p1b: '', p2a: '', p2b: '', p3a: '', p3b: '' };
                                      return (
                                        <div key={fx.id} className="rounded-lg border border-slate-700 bg-night/60 px-3 py-3">
                                          <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-slate-300 font-medium">{squadMap[fx.squadAId]?.name ?? fx.squadAId}</span>
                                            <span className="text-xs text-slate-500">vs</span>
                                            <span className="text-sm text-slate-300 font-medium">{squadMap[fx.squadBId]?.name ?? fx.squadBId}</span>
                                          </div>
                                          {([1, 2, 3] as const).map(pair => {
                                            const aKey = `p${pair}a` as keyof PadelInput;
                                            const bKey = `p${pair}b` as keyof PadelInput;
                                            return (
                                              <div key={pair} className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs text-slate-500 w-12">Pair {pair}</span>
                                                <input
                                                  type="number" min="0" placeholder="0"
                                                  disabled={isLocked}
                                                  value={pi[aKey]}
                                                  onChange={e => setPadelInputs(prev => ({
                                                    ...prev,
                                                    [fx.id]: { ...prev[fx.id], [aKey]: e.target.value },
                                                  }))}
                                                  className="w-14 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                />
                                                <span className="text-slate-600 text-xs">–</span>
                                                <input
                                                  type="number" min="0" placeholder="0"
                                                  disabled={isLocked}
                                                  value={pi[bKey]}
                                                  onChange={e => setPadelInputs(prev => ({
                                                    ...prev,
                                                    [fx.id]: { ...prev[fx.id], [bKey]: e.target.value },
                                                  }))}
                                                  className="w-14 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                />
                                              </div>
                                            );
                                          })}
                                          <div className="flex justify-end mt-2">
                                            <button
                                              disabled={isLocked || savingFixture === fx.id}
                                              onClick={() => savePadelScore(fx.id)}
                                              className="rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                            >
                                              {savingFixture === fx.id ? '…' : 'Save'}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }

                                    const inp = scoreInputs[fx.id] ?? { a: '', b: '' };
                                    return (
                                      <div
                                        key={fx.id}
                                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-night/60 px-3 py-2"
                                      >
                                        <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">
                                          {squadMap[fx.squadAId]?.name ?? fx.squadAId}
                                        </span>
                                        <input
                                          type="number" min="0" placeholder="0"
                                          disabled={isLocked}
                                          value={inp.a}
                                          onChange={e => setScoreInputs(prev => ({
                                            ...prev,
                                            [fx.id]: { ...prev[fx.id], a: e.target.value },
                                          }))}
                                          className="w-14 shrink-0 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-slate-600 text-xs shrink-0">–</span>
                                        <input
                                          type="number" min="0" placeholder="0"
                                          disabled={isLocked}
                                          value={inp.b}
                                          onChange={e => setScoreInputs(prev => ({
                                            ...prev,
                                            [fx.id]: { ...prev[fx.id], b: e.target.value },
                                          }))}
                                          className="w-14 shrink-0 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-sm text-slate-300 flex-1 min-w-0 truncate text-right">
                                          {squadMap[fx.squadBId]?.name ?? fx.squadBId}
                                        </span>
                                        <button
                                          disabled={isLocked || savingFixture === fx.id}
                                          onClick={() => saveScore(fx.id)}
                                          className="ml-1 shrink-0 rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {savingFixture === fx.id ? '…' : 'Save'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Knockout fixtures ── */}
                    {knockoutFixtures.length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Knockout</p>
                        <div className="flex flex-col gap-2">
                          {knockoutFixtures.map(fx => {
                            const label = fx.round === 'semi'
                              ? `SF${fx.sequence}`
                              : fx.round === 'final'
                              ? 'Final'
                              : '3rd/4th';
                            const hasBothSquads = !!fx.squadAId && !!fx.squadBId;
                            const isSemi        = fx.round === 'semi';
                            const sfo           = sfOverrides[fx.id];

                            if (isPadel) {
                              const pi = padelInputs[fx.id] ?? { p1a: '', p1b: '', p2a: '', p2b: '', p3a: '', p3b: '' };
                              return (
                                <div key={fx.id} className="rounded-lg border border-slate-700 bg-night/60 px-3 py-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-slate-500 shrink-0 w-12">{label}</span>
                                    <span className="text-sm text-slate-300 flex-1 font-medium">{squadMap[fx.squadAId]?.name || 'TBD'}</span>
                                    <span className="text-xs text-slate-500">vs</span>
                                    <span className="text-sm text-slate-300 flex-1 font-medium text-right">{squadMap[fx.squadBId]?.name || 'TBD'}</span>
                                  </div>
                                  {([1, 2, 3] as const).map(pair => {
                                    const aKey = `p${pair}a` as keyof PadelInput;
                                    const bKey = `p${pair}b` as keyof PadelInput;
                                    return (
                                      <div key={pair} className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xs text-slate-500 w-12">Pair {pair}</span>
                                        <input
                                          type="number" min="0" placeholder="0"
                                          disabled={isLocked || !hasBothSquads}
                                          value={pi[aKey]}
                                          onChange={e => setPadelInputs(prev => ({
                                            ...prev,
                                            [fx.id]: { ...prev[fx.id], [aKey]: e.target.value },
                                          }))}
                                          className="w-14 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-slate-600 text-xs">–</span>
                                        <input
                                          type="number" min="0" placeholder="0"
                                          disabled={isLocked || !hasBothSquads}
                                          value={pi[bKey]}
                                          onChange={e => setPadelInputs(prev => ({
                                            ...prev,
                                            [fx.id]: { ...prev[fx.id], [bKey]: e.target.value },
                                          }))}
                                          className="w-14 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                      </div>
                                    );
                                  })}
                                  <div className="flex justify-end mt-2">
                                    <button
                                      disabled={isLocked || !hasBothSquads || savingFixture === fx.id}
                                      onClick={() => savePadelScore(fx.id)}
                                      className="rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {savingFixture === fx.id ? '…' : 'Save'}
                                    </button>
                                  </div>

                                  {/* SF Override */}
                                  {isSemi && sfo && (
                                    <SfOverrideSection
                                      fx={fx}
                                      sfo={sfo}
                                      divisionSquads={divisionSquads}
                                      isLocked={isLocked}
                                      saving={savingSfOver === fx.id}
                                      onChange={(field, value) => setSfOverrides(prev => ({
                                        ...prev,
                                        [fx.id]: { ...prev[fx.id], [field]: value },
                                      }))}
                                      onSave={() => saveSfOverride(fx.id)}
                                    />
                                  )}
                                </div>
                              );
                            }

                            const inp = scoreInputs[fx.id] ?? { a: '', b: '' };
                            return (
                              <div key={fx.id} className="rounded-lg border border-slate-700 bg-night/60 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 shrink-0 w-12">{label}</span>
                                  <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">
                                    {squadMap[fx.squadAId]?.name || 'TBD'}
                                  </span>
                                  <input
                                    type="number" min="0" placeholder="0"
                                    disabled={isLocked || !hasBothSquads}
                                    value={inp.a}
                                    onChange={e => setScoreInputs(prev => ({
                                      ...prev,
                                      [fx.id]: { ...prev[fx.id], a: e.target.value },
                                    }))}
                                    className="w-14 shrink-0 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                  />
                                  <span className="text-slate-600 text-xs shrink-0">–</span>
                                  <input
                                    type="number" min="0" placeholder="0"
                                    disabled={isLocked || !hasBothSquads}
                                    value={inp.b}
                                    onChange={e => setScoreInputs(prev => ({
                                      ...prev,
                                      [fx.id]: { ...prev[fx.id], b: e.target.value },
                                    }))}
                                    className="w-14 shrink-0 rounded border border-slate-600 bg-night px-2 py-2 text-white text-center focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                  />
                                  <span className="text-sm text-slate-300 flex-1 min-w-0 truncate text-right">
                                    {squadMap[fx.squadBId]?.name || 'TBD'}
                                  </span>
                                  <button
                                    disabled={isLocked || !hasBothSquads || savingFixture === fx.id}
                                    onClick={() => saveScore(fx.id)}
                                    className="ml-1 shrink-0 rounded bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {savingFixture === fx.id ? '…' : 'Save'}
                                  </button>
                                </div>

                                {/* SF Override */}
                                {isSemi && sfo && (
                                  <SfOverrideSection
                                    fx={fx}
                                    sfo={sfo}
                                    divisionSquads={divisionSquads}
                                    isLocked={isLocked}
                                    saving={savingSfOver === fx.id}
                                    onChange={(field, value) => setSfOverrides(prev => ({
                                      ...prev,
                                      [fx.id]: { ...prev[fx.id], [field]: value },
                                    }))}
                                    onSave={() => saveSfOverride(fx.id)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lock / Unlock */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <button
                    disabled={lockingEvent === instance.id}
                    onClick={() => toggleLock(instance.id, !isLocked)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLocked
                        ? 'border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'
                        : 'bg-accent text-night hover:bg-accent/90'
                    }`}
                  >
                    {lockingEvent === instance.id
                      ? 'Saving…'
                      : isLocked ? 'Unlock Event' : 'Lock Event'}
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

// ── SF Override sub-component ────────────────────────────────────────────────

function SfOverrideSection({
  fx,
  sfo,
  divisionSquads,
  isLocked,
  saving,
  onChange,
  onSave,
}: {
  fx: StoredFixture;
  sfo: SfOverride;
  divisionSquads: Squad[];
  isLocked: boolean;
  saving: boolean;
  onChange: (field: keyof SfOverride, value: string | boolean) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          disabled={isLocked}
          checked={sfo.enabled}
          onChange={e => onChange('enabled', e.target.checked)}
          className="rounded border-slate-600 accent-accent disabled:cursor-not-allowed"
        />
        Override auto-selection
      </label>

      {sfo.enabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            disabled={isLocked}
            value={sfo.squadAId}
            onChange={e => onChange('squadAId', e.target.value)}
            className="rounded border border-slate-600 bg-night px-2 py-1.5 text-xs text-white focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Squad A…</option>
            {divisionSquads.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500">vs</span>
          <select
            disabled={isLocked}
            value={sfo.squadBId}
            onChange={e => onChange('squadBId', e.target.value)}
            className="rounded border border-slate-600 bg-night px-2 py-1.5 text-xs text-white focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Squad B…</option>
            {divisionSquads.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            disabled={isLocked || saving || !sfo.squadAId || !sfo.squadBId}
            onClick={onSave}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '…' : 'Apply'}
          </button>
        </div>
      )}

      {!sfo.enabled && sfo.squadAId && (
        <button
          disabled={isLocked || saving}
          onClick={onSave}
          className="mt-2 rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '…' : 'Reset to auto'}
        </button>
      )}
    </div>
  );
}

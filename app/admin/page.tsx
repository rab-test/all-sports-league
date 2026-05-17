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
};
type Pool     = { id: string; eventInstanceId: string; label: string; squadIds: string[] };
type Squad    = { id: string; divisionId: string; name: string; rosterSize: number };
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

export default function AdminPage() {
  const [pin, setPin]           = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const [data, setData]         = useState<AdminData | null>(null);
  const [loading, setLoading]   = useState(false);

  const [scoreInputs, setScoreInputs] = useState<Record<string, { a: string; b: string }>>({});
  const [golfInputs, setGolfInputs]   = useState<Record<string, string>>({});

  const [savingFixture,  setSavingFixture]  = useState<string | null>(null);
  const [savingGolf,     setSavingGolf]     = useState<string | null>(null);
  const [generatingDraw, setGeneratingDraw] = useState<string | null>(null);
  const [lockingEvent,   setLockingEvent]   = useState<string | null>(null);

  function initInputs(d: AdminData) {
    const si: Record<string, { a: string; b: string }> = {};
    for (const fx of d.fixtures) {
      si[fx.id] = {
        a: fx.scoreA != null ? String(fx.scoreA) : '',
        b: fx.scoreB != null ? String(fx.scoreB) : '',
      };
    }
    setScoreInputs(si);

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
      <h1 className="text-2xl font-bold text-white mb-8">All Sports League — Admin</h1>

      <div className="flex flex-col gap-6">
        {sorted.map(instance => {
          const instancePools    = data.pools.filter(p => p.eventInstanceId === instance.id);
          const instanceFixtures = data.fixtures.filter(
            f => f.eventInstanceId === instance.id && f.round === 'pool'
          );
          const divisionSquads   = data.squads.filter(s => s.divisionId === instance.divisionId);
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
                                Pool {pool.label}
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
                                          type="number"
                                          min="0"
                                          placeholder="0"
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
                                          type="number"
                                          min="0"
                                          placeholder="0"
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

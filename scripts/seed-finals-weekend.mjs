/**
 * Sets up Finals Weekend (14 Nov 2026) in Airtable.
 * Run once: node scripts/seed-finals-weekend.mjs
 *
 *  - Challenger cricket (event-instance-9) moves from 17 Oct to Finals day and
 *    becomes two pools of 3 (placeholder 8-squad draw replaced).
 *  - The two "Finals Weekend" placeholder instances are replaced by one
 *    instance per sport per league, holding the run-of-show fixtures.
 *  - Challenger touch rugby / padel fixtures are created with empty squads and
 *    filled in when the admin saves the cricket ranking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID;
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const url = t => `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(t)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, u, body) {
  const res = await fetch(u, { method, headers: H, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${u} -> ${res.status} ${await res.text()}`);
  await sleep(220);
  return res.json();
}

async function all(table) {
  const out = [];
  let offset;
  do {
    const j = await api('GET', `${url(table)}${offset ? `?offset=${offset}` : ''}`);
    out.push(...j.records);
    offset = j.offset;
  } while (offset);
  return out;
}

async function create(table, rows) {
  for (let i = 0; i < rows.length; i += 10) {
    await api('POST', url(table), { records: rows.slice(i, i + 10).map(fields => ({ fields })) });
  }
  console.log(`  + ${rows.length} ${table}`);
}

async function destroy(table, records) {
  for (let i = 0; i < records.length; i += 10) {
    const q = records.slice(i, i + 10).map(r => `records[]=${r.id}`).join('&');
    await api('DELETE', `${url(table)}?${q}`);
  }
  console.log(`  - ${records.length} ${table}`);
}

const DAY = 'event-day-7';
const PREMIER = 'division-premier';
const CHALLENGER = 'division-challenger';

const CRICKET = 'event-instance-9';
const instances = [
  { id: 'event-instance-13', divisionId: PREMIER,    sport: 'Padel' },
  { id: 'event-instance-14', divisionId: PREMIER,    sport: 'Touch Rugby' },
  { id: 'event-instance-15', divisionId: PREMIER,    sport: '6-a-side Cricket' },
  { id: 'event-instance-16', divisionId: CHALLENGER, sport: 'Touch Rugby' },
  { id: 'event-instance-17', divisionId: CHALLENGER, sport: 'Padel' },
].map(i => ({
  ...i, eventDayId: DAY, formatPresetId: 'preset-d', pointsSchemeId: 'points-scheme-a', locked: false,
}));

// tie sequence: 1 = 1v2, 2 = 3v4, 3 = 5v6, 4 = 7v8
const premierTies = {
  1: ['squad-premier-7', 'squad-premier-4'], // BombSquad v Heuwels van Touchies
  2: ['squad-premier-3', 'squad-premier-1'], // Jan of All Trades v Pitchside Pints
  3: ['squad-premier-2', 'squad-premier-6'], // Hangover Heroes v Multi-Sport Mavericks
  4: ['squad-premier-5', 'squad-premier-8'], // Gaviscon Gladiators v Ball of Duty
};
const tieTimes = {
  'event-instance-13': { 4: '09:00', 3: '09:30', 2: '10:00', 1: '10:30' },
  'event-instance-14': { 4: '12:50', 3: '13:10', 2: '13:30', 1: '14:10' },
  'event-instance-15': { 4: '14:30', 3: '15:05', 2: '15:40', 1: '16:45' },
  'event-instance-16': { 3: '12:50', 2: '13:10', 1: '13:50' },
  'event-instance-17': { 3: '15:15', 2: '15:45', 1: '16:15' },
};

const tieFixtures = instances.flatMap(inst =>
  Object.entries(tieTimes[inst.id]).map(([seq, startTime]) => {
    const pair = inst.divisionId === PREMIER ? premierTies[seq] : [];
    return {
      id: `finals-${inst.id}-${seq}`,
      eventInstanceId: inst.id,
      round: 'tie',
      sequence: Number(seq),
      startTime,
      ...(pair[0] ? { squadAId: pair[0], squadBId: pair[1] } : {}),
    };
  }),
);

// Challenger cricket: two pools of 3 (seeds 1/4/5 and 2/3/6)
const poolA = ['squad-challenger-6', 'squad-challenger-3', 'squad-challenger-8']; // Gompoue, Hostile Takeover, Scoregasms
const poolB = ['squad-challenger-2', 'squad-challenger-4', 'squad-challenger-7']; // Sunrise Strikers, Die Bosmossel Boere, The Kwaggas
const poolFx = (label, poolId, games) => games.map(([a, b, startTime], i) => ({
  id: `fixture-${CRICKET}-${label}-${i + 1}`,
  eventInstanceId: CRICKET, poolId, round: 'pool', sequence: i + 1, startTime,
  squadAId: a, squadBId: b,
}));
const cricketFixtures = [
  ...poolFx('a', `pool-${CRICKET}-a`, [
    [poolA[0], poolA[2], '07:30'], [poolA[1], poolA[2], '08:40'], [poolA[0], poolA[1], '09:50'],
  ]),
  ...poolFx('b', `pool-${CRICKET}-b`, [
    [poolB[0], poolB[2], '08:05'], [poolB[1], poolB[2], '09:15'], [poolB[0], poolB[1], '11:00'],
  ]),
  { id: `3rd4th-${CRICKET}`, eventInstanceId: CRICKET, round: '3rd-4th', sequence: 1, startTime: '11:35' },
  { id: `final-${CRICKET}`,  eventInstanceId: CRICKET, round: 'final',   sequence: 1, startTime: '12:10' },
];
const cricketPools = [
  { id: `pool-${CRICKET}-a`, eventInstanceId: CRICKET, name: 'A', squadIds: JSON.stringify(poolA) },
  { id: `pool-${CRICKET}-b`, eventInstanceId: CRICKET, name: 'B', squadIds: JSON.stringify(poolB) },
];

// ── Run ──────────────────────────────────────────────────────────────────────

const [existingInstances, existingFixtures, existingPools, existingDays] = await Promise.all([
  all('EventInstances'), all('Fixtures'), all('Pools'), all('EventDays'),
]);

if (existingInstances.some(r => r.fields.id === 'event-instance-13')) {
  console.log('Finals Weekend already seeded — nothing to do.');
  process.exit(0);
}

const scored = existingFixtures.filter(r => r.fields.eventInstanceId === CRICKET && r.fields.scoreA != null);
if (scored.length > 0) throw new Error('event-instance-9 already has scores; refusing to replace its draw');

console.log('Challenger cricket (event-instance-9)');
await destroy('Pools', existingPools.filter(r => r.fields.eventInstanceId === CRICKET));
await destroy('Fixtures', existingFixtures.filter(r => r.fields.eventInstanceId === CRICKET));
const cricketInstance = existingInstances.find(r => r.fields.id === CRICKET);
await api('PATCH', `${url('EventInstances')}/${cricketInstance.id}`, {
  fields: { eventDayId: DAY, formatPresetId: 'preset-c', pointsSchemeId: 'points-scheme-c' },
});
console.log('  ~ moved to event-day-7, preset-c');
await create('Pools', cricketPools);
await create('Fixtures', cricketFixtures);

console.log('Finals Weekend instances');
await destroy('EventInstances', existingInstances.filter(r => ['event-instance-11', 'event-instance-12'].includes(r.fields.id)));
await create('EventInstances', instances);
await create('Fixtures', tieFixtures);

console.log('17 Oct event day (no longer used)');
await destroy('EventDays', existingDays.filter(r => r.fields.id === 'event-day-5'));

console.log('Done.');

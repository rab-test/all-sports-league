/**
 * Creates all Airtable tables and seeds them from the /data JSON backup files.
 * Run once: node scripts/setup-airtable.mjs
 *
 * Tables that already exist are skipped (no duplicate seeding).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key) process.env[key] = val;
  }
} catch {
  console.warn('Could not read .env.local — using existing env vars');
}

const TOKEN   = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!TOKEN || !BASE_ID) {
  console.error('AIRTABLE_TOKEN and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', filename), 'utf-8'));
}

async function listTables() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: HEADERS,
  });
  const data = await res.json();
  return (data.tables ?? []).map(t => t.name);
}

async function createTable(name, fields) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name, fields }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error(`  ✗ Failed to create "${name}":`, JSON.stringify(err));
    return false;
  }
  console.log(`  ✓ Created table: ${name}`);
  return true;
}

async function seedTable(tableName, rows) {
  if (rows.length === 0) {
    console.log(`  · ${tableName}: nothing to seed`);
    return;
  }
  process.stdout.write(`  · Seeding ${rows.length} rows into ${tableName}...`);
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      console.error(`\n  ✗ Batch error in ${tableName}:`, JSON.stringify(err));
    } else {
      process.stdout.write('.');
    }
    await sleep(220); // stay safely under 5 req/s
  }
  console.log(' done');
}

// ── Table definitions ────────────────────────────────────────────────────────

const TABLES = [
  {
    name: 'Seasons',
    fields: [
      { name: 'id',   type: 'singleLineText' },
      { name: 'name', type: 'singleLineText' },
    ],
  },
  {
    name: 'Divisions',
    fields: [
      { name: 'id',       type: 'singleLineText' },
      { name: 'name',     type: 'singleLineText' },
      { name: 'seasonId', type: 'singleLineText' },
    ],
  },
  {
    name: 'Squads',
    fields: [
      { name: 'id',         type: 'singleLineText' },
      { name: 'name',       type: 'singleLineText' },
      { name: 'divisionId', type: 'singleLineText' },
      { name: 'logoUrl',    type: 'singleLineText' },
    ],
  },
  {
    name: 'Players',
    fields: [
      { name: 'id',      type: 'singleLineText' },
      { name: 'name',    type: 'singleLineText' },
      { name: 'squadId', type: 'singleLineText' },
    ],
  },
  {
    name: 'EventDays',
    fields: [
      { name: 'id',       type: 'singleLineText' },
      { name: 'seasonId', type: 'singleLineText' },
      { name: 'date',     type: 'singleLineText' },
      { name: 'venues',   type: 'singleLineText' }, // stored as JSON array string
    ],
  },
  {
    name: 'EventInstances',
    fields: [
      { name: 'id',             type: 'singleLineText' },
      { name: 'eventDayId',     type: 'singleLineText' },
      { name: 'divisionId',     type: 'singleLineText' },
      { name: 'sport',          type: 'singleLineText' },
      { name: 'formatPresetId', type: 'singleLineText' },
      { name: 'pointsSchemeId', type: 'singleLineText' },
      { name: 'locked',         type: 'checkbox', options: { color: 'greenBright', icon: 'check' } },
    ],
  },
  {
    name: 'Pools',
    fields: [
      { name: 'id',              type: 'singleLineText' },
      { name: 'eventInstanceId', type: 'singleLineText' },
      { name: 'name',            type: 'singleLineText' }, // 'A' or 'B'
      { name: 'squadIds',        type: 'singleLineText' }, // stored as JSON array string
    ],
  },
  {
    name: 'Fixtures',
    fields: [
      { name: 'id',              type: 'singleLineText' },
      { name: 'eventInstanceId', type: 'singleLineText' },
      { name: 'poolId',          type: 'singleLineText' },
      { name: 'squadAId',        type: 'singleLineText' },
      { name: 'squadBId',        type: 'singleLineText' },
      { name: 'scoreA',          type: 'number', options: { precision: 0 } },
      { name: 'scoreB',          type: 'number', options: { precision: 0 } },
      { name: 'round',           type: 'singleLineText' },
      { name: 'sequence',        type: 'number', options: { precision: 0 } },
      { name: 'locked',          type: 'checkbox', options: { color: 'greenBright', icon: 'check' } },
    ],
  },
  {
    name: 'GolfScores',
    fields: [
      { name: 'id',              type: 'singleLineText' },
      { name: 'eventInstanceId', type: 'singleLineText' },
      { name: 'squadId',         type: 'singleLineText' },
      { name: 'totalScore',      type: 'number', options: { precision: 0 } },
    ],
  },
];

// ── Seed data builders ───────────────────────────────────────────────────────

function buildSeedData() {
  const seasons = readJson('seasons.json').map(s => ({
    id: s.id, name: s.name,
  }));

  const divisions = readJson('divisions.json').map(d => ({
    id: d.id, name: d.name, seasonId: d.seasonId,
  }));

  const squads = readJson('squads.json').map(s => ({
    id: s.id, name: s.name, divisionId: s.divisionId, logoUrl: '',
  }));

  const players = readJson('players.json').map(p => ({
    id: p.id, name: p.name, squadId: p.squadId,
  }));

  const eventDays = readJson('event-days.json').map(d => ({
    id: d.id, seasonId: d.seasonId, date: d.date,
    venues: JSON.stringify(d.venues),
  }));

  const eventInstances = readJson('event-instances.json').map(i => ({
    id: i.id, eventDayId: i.eventDayId, divisionId: i.divisionId,
    sport: i.sport, formatPresetId: i.formatPresetId,
    pointsSchemeId: i.pointsSchemeId,
    ...(i.locked ? { locked: true } : {}),
  }));

  const pools = readJson('pools.json').map(p => ({
    id: p.id, eventInstanceId: p.eventInstanceId,
    name: p.label,                           // label → name
    squadIds: JSON.stringify(p.squadIds),
  }));

  const fixtures = readJson('fixtures.json').map(f => ({
    id: f.id, eventInstanceId: f.eventInstanceId,
    poolId: f.poolId ?? '',
    squadAId: f.squadAId, squadBId: f.squadBId,
    ...(f.scoreA !== undefined ? { scoreA: f.scoreA } : {}),
    ...(f.scoreB !== undefined ? { scoreB: f.scoreB } : {}),
    round: f.round, sequence: f.sequence,
  }));

  const golfScoresRaw = (() => {
    try { return readJson('golf-scores.json'); } catch { return []; }
  })();
  const golfScores = golfScoresRaw.map((g, i) => ({
    id: `golf-${g.eventInstanceId}-${g.squadId}-${i}`,
    eventInstanceId: g.eventInstanceId,
    squadId: g.squadId,
    totalScore: g.totalScore,
  }));

  return { seasons, divisions, squads, players, eventDays, eventInstances, pools, fixtures, golfScores };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Airtable Setup ===\n');

  const existing = await listTables();
  console.log(`Existing tables: ${existing.length > 0 ? existing.join(', ') : '(none)'}\n`);

  const created = new Set();

  console.log('── Creating tables ──');
  for (const table of TABLES) {
    if (existing.includes(table.name)) {
      console.log(`  · Skipping "${table.name}" (already exists)`);
    } else {
      const ok = await createTable(table.name, table.fields);
      if (ok) created.add(table.name);
      await sleep(400);
    }
  }

  console.log('\n── Seeding data ──');
  const seed = buildSeedData();

  const tasks = [
    ['Seasons',        seed.seasons],
    ['Divisions',      seed.divisions],
    ['Squads',         seed.squads],
    ['Players',        seed.players],
    ['EventDays',      seed.eventDays],
    ['EventInstances', seed.eventInstances],
    ['Pools',          seed.pools],
    ['Fixtures',       seed.fixtures],
    ['GolfScores',     seed.golfScores],
  ];

  for (const [name, rows] of tasks) {
    if (!created.has(name)) {
      console.log(`  · Skipping "${name}" seed (table pre-existed — won't duplicate)`);
      continue;
    }
    await seedTable(name, rows);
  }

  console.log('\n✅ Done!\n');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

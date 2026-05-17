/**
 * Creates EventInstances + Fixtures tables (which failed due to checkbox options),
 * and seeds Players, EventInstances, and Fixtures.
 * Run once: node scripts/fix-missing-tables.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load .env.local
try {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key) process.env[key] = val;
  }
} catch { /* use existing env */ }

const TOKEN   = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function readJson(f) { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf-8')); }

async function listTables() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers: HEADERS });
  return (await res.json()).tables ?? [];
}

async function createTable(name, fields) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify({ name, fields }),
  });
  if (!res.ok) { console.error(`✗ Create ${name}:`, await res.json()); return false; }
  console.log(`✓ Created: ${name}`);
  return true;
}

async function countRecords(tableName) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`,
    { headers: HEADERS }
  );
  if (!res.ok) return -1;
  const data = await res.json();
  return (data.records ?? []).length;
}

async function seedTable(tableName, rows) {
  if (rows.length === 0) { console.log(`  · ${tableName}: nothing to seed`); return; }
  process.stdout.write(`  Seeding ${rows.length} rows into ${tableName}...`);
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
    });
    if (!res.ok) { console.error('\n  ✗ Batch error:', await res.json()); }
    else process.stdout.write('.');
    await sleep(220);
  }
  console.log(' done');
}

async function main() {
  console.log('\n=== Fix Missing Tables ===\n');

  const tables = await listTables();
  const names  = tables.map(t => t.name);
  console.log('Existing:', names.join(', '));

  // ── EventInstances ──────────────────────────────────────────────────────────
  let createdEI = false;
  if (!names.includes('EventInstances')) {
    createdEI = await createTable('EventInstances', [
      { name: 'id',             type: 'singleLineText' },
      { name: 'eventDayId',     type: 'singleLineText' },
      { name: 'divisionId',     type: 'singleLineText' },
      { name: 'sport',          type: 'singleLineText' },
      { name: 'formatPresetId', type: 'singleLineText' },
      { name: 'pointsSchemeId', type: 'singleLineText' },
      { name: 'locked', type: 'checkbox', options: { color: 'greenBright', icon: 'check' } },
    ]);
    await sleep(500);
  }

  // ── Fixtures ────────────────────────────────────────────────────────────────
  let createdFx = false;
  if (!names.includes('Fixtures')) {
    createdFx = await createTable('Fixtures', [
      { name: 'id',              type: 'singleLineText' },
      { name: 'eventInstanceId', type: 'singleLineText' },
      { name: 'poolId',          type: 'singleLineText' },
      { name: 'squadAId',        type: 'singleLineText' },
      { name: 'squadBId',        type: 'singleLineText' },
      { name: 'scoreA',          type: 'number', options: { precision: 0 } },
      { name: 'scoreB',          type: 'number', options: { precision: 0 } },
      { name: 'round',           type: 'singleLineText' },
      { name: 'sequence',        type: 'number', options: { precision: 0 } },
      { name: 'locked', type: 'checkbox', options: { color: 'greenBright', icon: 'check' } },
    ]);
    await sleep(500);
  }

  // ── Seed Players if empty ───────────────────────────────────────────────────
  const playerCount = await countRecords('Players');
  if (playerCount === 0) {
    const players = readJson('players.json').map(p => ({ id: p.id, name: p.name, squadId: p.squadId }));
    await seedTable('Players', players);
  } else {
    console.log(`  · Players already has ${playerCount}+ records — skipping`);
  }

  // ── Seed EventInstances ─────────────────────────────────────────────────────
  if (createdEI) {
    const instances = readJson('event-instances.json').map(i => ({
      id: i.id, eventDayId: i.eventDayId, divisionId: i.divisionId,
      sport: i.sport, formatPresetId: i.formatPresetId, pointsSchemeId: i.pointsSchemeId,
      ...(i.locked ? { locked: true } : {}),
    }));
    await seedTable('EventInstances', instances);
  } else {
    console.log(`  · EventInstances already existed — skipping seed`);
  }

  // ── Seed Fixtures ───────────────────────────────────────────────────────────
  if (createdFx) {
    const fixtures = readJson('fixtures.json').map(f => ({
      id: f.id, eventInstanceId: f.eventInstanceId,
      poolId: f.poolId ?? '',
      squadAId: f.squadAId, squadBId: f.squadBId,
      ...(f.scoreA !== undefined ? { scoreA: f.scoreA } : {}),
      ...(f.scoreB !== undefined ? { scoreB: f.scoreB } : {}),
      round: f.round, sequence: f.sequence,
    }));
    await seedTable('Fixtures', fixtures);
  } else {
    console.log(`  · Fixtures already existed — skipping seed`);
  }

  console.log('\n✅ Done!\n');
}

main().catch(err => { console.error(err); process.exit(1); });

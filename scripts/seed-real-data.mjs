/**
 * Replaces all Squads and Players in Airtable with the real 2026 season data.
 * Run once: node scripts/seed-real-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

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

async function fetchAll(tableName) {
  const records = [];
  let offset = null;
  do {
    const qs  = offset ? `?offset=${offset}` : '';
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}${qs}`, { headers: HEADERS });
    const data = await res.json();
    records.push(...(data.records ?? []));
    offset = data.offset ?? null;
  } while (offset);
  return records;
}

async function deleteAll(tableName, records) {
  if (records.length === 0) { console.log(`  · ${tableName}: nothing to delete`); return; }
  process.stdout.write(`  Deleting ${records.length} from ${tableName}...`);
  const ids = records.map(r => r.id);
  for (let i = 0; i < ids.length; i += 10) {
    const batch  = ids.slice(i, i + 10);
    const params = batch.map(id => `records[]=${id}`).join('&');
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}?${params}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) console.error('\n  ✗ Delete error:', await res.json());
    else process.stdout.write('.');
    await sleep(250);
  }
  console.log(' done');
}

async function seedTable(tableName, rows) {
  process.stdout.write(`  Seeding ${rows.length} into ${tableName}...`);
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ records: batch.map(fields => ({ fields })) }),
    });
    if (!res.ok) console.error('\n  ✗ Seed error:', await res.json());
    else process.stdout.write('.');
    await sleep(250);
  }
  console.log(' done');
}

const SQUADS_DATA = [
  // ── PREMIER ──────────────────────────────────────────────────────────────────
  { id: 'squad-premier-1', name: 'Pitchside Pints', div: 'premier', players: [
    'Bruwer Laubscher', 'Michael Laubscher', 'Jan de Villiers', 'Ruben Fortuin',
    'Loki Loubser', 'Jurie Matthee', 'Malan Truter', 'Arnold Vermaak',
    'Eward', 'Erik de la Bat', 'Jac Conradie', 'Charl Marais',
  ]},
  { id: 'squad-premier-2', name: 'Hangover Heroes', div: 'premier', players: [
    'Christiaan van Lamp', 'Petrus du Preez', 'Delport Botha', 'Ruach Roux',
    'Gerhard Cloete', 'Philip Conradie', 'Frans van Schalkwyk', 'Walter Nel',
    'Guilome', 'Eric Jacobs', 'Faf van Zyl', 'Jordan Bamber',
  ]},
  { id: 'squad-premier-3', name: 'Jan of All Trades', div: 'premier', players: [
    'Le Roux Kloppers', 'Rayno Blomerus', 'Stefan Laubscher', 'Adrian Louw',
    'Jaun van der Walt', 'Grant Groenewald', 'Tiaan Stemmet', 'Thomas Butler',
    'Anton Prinsloo', 'David Derman', 'Daniel Moller', 'Balthazar Kloppers',
  ]},
  { id: 'squad-premier-4', name: 'Heuwels van Touchies', div: 'premier', players: [
    'Nicholas vd Merwe', 'Pieter Rossouw', 'Stephan Rossouw', 'Andre Stofberg',
    'De Villiers Stofberg', 'Edrich Venter', 'Kristoff Baard', 'Gregor Pfaff',
    'Uli Boezaart', 'Konrad Flauschbauer', 'Michael Harris', 'Michael Muller',
  ]},
  { id: 'squad-premier-5', name: 'Gaviscon Gladiators', div: 'premier', players: [
    'Pieter Jacobs', 'Albert Jacobs', 'Ruan Aucamp', 'Edrich Aucamp',
    'Marius Myburgh', 'Jeandre Joubert', 'Erik Smit', 'Migael Slabber',
    'Phillip du Plessis', 'Crismar Engelbrecht', 'Wessel Muller', 'Konrad Fleischhauer',
  ]},
  { id: 'squad-premier-6', name: 'Multi-Sport Mavericks', div: 'premier', players: [
    'Ruben Van Eck', 'MJ', 'Rikus Brand', 'Antonie Jacobs',
    'Daneel Swanepoel', 'Munnik Huysamer', 'Wynand Pieterse', 'Dakar',
    'Heinrich Potgieter', 'Ruan Mackridge', 'Brynard Smal', 'Jack-Thomas Van Zyl',
  ]},
  { id: 'squad-premier-7', name: 'BombSquad', div: 'premier', players: [
    'Rudolph Lubbe', 'Juan Burger', 'Petrie Van Rensburg', 'Chris Albertyn',
    'Marco Van Rhyn', 'Hentie Van Der Merwe', 'Ivann Van Der Merwe', 'Erik van Zyl',
    'Adriaan de Waal', 'Niehaus Loots', 'Dirkse Steenkamp', 'Theo Louwrens',
  ]},
  { id: 'squad-premier-8', name: 'Ball of Duty', div: 'premier', players: [
    'Van Zyl Bester', 'Christoff Smit', 'Xander Van Zyl', 'Freek Swanepoel',
    'Anre Steenkamp', 'Juan Mostert', 'Derick Jooste', 'Herman Bester',
    'Carl Laubscher', 'Christiaan van der Watt', 'WJ du Plessis', 'Conrad Sutherland',
  ]},

  // ── CHALLENGER ────────────────────────────────────────────────────────────────
  { id: 'squad-challenger-1', name: 'Francois du Toit', div: 'challenger', players: [
    'Francois du Toit', 'Chris Briel', 'Armand Knoetze', 'Johann Roode',
    'Meyr Retief', 'Dawid Opperman', 'Bernhard Buhrmann', 'Pieter Slabber',
    'Henri Pienaar', 'Wybri Thuynsma', 'Rhys du Randt', 'Corne Smit',
  ]},
  { id: 'squad-challenger-2', name: 'Jacques van Tonder', div: 'challenger', players: [
    'Jacques van Tonder', 'MD Laubsher', 'Reynardo Gouveia', 'AB Ras',
    'Jandre Steyn', 'Luke Sanan', 'Dillan Schultz', 'Christiaan Pauer',
    'Daniel Vosloo', 'Gerrit Fourie', 'Christiaan du Toit', 'Reniel Hugo', 'Janneman Slabbert',
  ]},
  { id: 'squad-challenger-3', name: 'Hostile Takeover', div: 'challenger', players: [
    'Ruben Grundlingh', 'Jaco Pienaar', 'James Mouton', 'Cobus Basson',
    'Charl Hamman', 'Neil Truter', 'Benjamin Pretorius', 'Bernhard Andrag',
    'Jonathan Wilson', 'Llewellyn Ferreira', 'Daniel Joubert',
  ]},
  { id: 'squad-challenger-4', name: 'Matt Lombard', div: 'challenger', players: [
    'Matt Lombaard', 'Alex le Roux', 'Christiaan van Blommenstein', 'Gabriel Richards',
    'Jan Louis Venter', 'Leon Myburgh', 'Neil van der Westhuizen', 'Sebastian Strydom',
    'Vosloo de Kock', 'Wian van Wyk', 'Tim Ferguson', 'Andreas Wild',
  ]},
  { id: 'squad-challenger-5', name: 'Bowled & the Beautiful', div: 'challenger', players: [
    'Neville Leach', 'Henri Bam', 'Daniel Swiegers', 'Rian Marais',
    'Jared Venter', 'Christopher de Villiers', 'Tian Cater', 'Dian Rabie',
    'Herman Pieterse', 'Deon Volschenk', 'Brahm van Schalkwyk',
  ]},
  { id: 'squad-challenger-6', name: 'Die Ou Ballies', div: 'challenger', players: [
    'Rohan van der Mescht', 'Paul Streicher', 'Rudolph Pollard', 'Jandri Meyer',
    'Johan Oberholster', 'Stefan Bergh', 'Jannie Vermeulen', 'Johann Peens',
    'Pieter Duminy', 'Gavin van der Berg', 'Nicolaas Cilliers', "Anton O'Reilly",
  ]},
  { id: 'squad-challenger-7', name: 'Tertius Groenewald', div: 'challenger', players: [
    'Tertius Groenewald', 'Ferdinand Ferreira', 'Jan-Paul Berry', 'Ruan Bellingan',
    'Wilhelm Kriek', 'Francois Mellet', 'Kyle Harvett', 'Gerard de la Bat',
    'Daniel Wesson', 'Eddie Hamman', 'Heinrich van der Watt', 'Martin du Plessis',
  ]},
  { id: 'squad-challenger-8', name: 'Stephen Lombard', div: 'challenger', players: [
    'Stephen Lombard', 'Lombard Grobler', 'Matt Landsberg', 'Reuben Fleischauer',
    'Vincent Bruwer', 'Gerrit Worst', 'Michiel Bosman', 'Stefan Kellerman',
    'MJ Hayes', 'Fanie Malherbe', 'Salo Steenkamp',
  ]},
];

async function main() {
  console.log('\n=== Seed Real Squad & Player Data ===\n');

  // Fetch divisions to get their custom IDs
  const divRecords  = await fetchAll('Divisions');
  const premierDiv  = divRecords.find(r => r.fields.name === 'Premier');
  const challengerDiv = divRecords.find(r => r.fields.name === 'Challenger');
  if (!premierDiv || !challengerDiv) {
    console.error('✗ Could not find Premier or Challenger division.');
    console.log('  Found:', divRecords.map(r => `${r.fields.name} (id=${r.fields.id})`).join(', '));
    process.exit(1);
  }
  const premierDivId    = premierDiv.fields.id;
  const challengerDivId = challengerDiv.fields.id;
  console.log(`Premier    division id: ${premierDivId}`);
  console.log(`Challenger division id: ${challengerDivId}\n`);

  // Delete all existing squads and players
  const [existingSquads, existingPlayers] = await Promise.all([
    fetchAll('Squads'),
    fetchAll('Players'),
  ]);
  await deleteAll('Players', existingPlayers);
  await deleteAll('Squads',  existingSquads);
  console.log('');

  // Create squads
  const squadRows = SQUADS_DATA.map(s => ({
    id:         s.id,
    name:       s.name,
    divisionId: s.div === 'premier' ? premierDivId : challengerDivId,
    rosterSize: 12,
  }));
  await seedTable('Squads', squadRows);

  // Create players
  const playerRows = [];
  for (const squad of SQUADS_DATA) {
    squad.players.forEach((name, i) => {
      playerRows.push({ id: `player-${squad.id}-${i + 1}`, name, squadId: squad.id });
    });
  }
  await seedTable('Players', playerRows);

  const totalPlayers = SQUADS_DATA.reduce((sum, s) => sum + s.players.length, 0);
  console.log(`\n✅ Done!`);
  console.log(`   Squads created:  ${SQUADS_DATA.length}`);
  console.log(`   Players created: ${totalPlayers}`);
}

main().catch(err => { console.error(err); process.exit(1); });

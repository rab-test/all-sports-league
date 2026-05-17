import fs from 'fs';
import path from 'path';

export function loadJson<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function loadAllData() {
  return {
    organisations: loadJson('organisations.json'),
    brands: loadJson('brands.json'),
    seasons: loadJson('seasons.json'),
    divisions: loadJson('divisions.json'),
    squads: loadJson('squads.json'),
    players: loadJson('players.json'),
    eventDays: loadJson('event-days.json'),
    eventInstances: loadJson('event-instances.json'),
    pointsSchemes: loadJson('points-schemes.json'),
    formatPresets: loadJson('format-presets.json'),
    pools: loadJson('pools.json'),
    fixtures: loadJson('fixtures.json'),
    results: loadJson('results.json'),
  };
}

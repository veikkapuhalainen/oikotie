import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data.json');

export function saveApartments(apartments) {
  fs.writeFileSync(dataPath, JSON.stringify(apartments));
}

export function getApartments() {
  if (!fs.existsSync(dataPath)) return [];
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

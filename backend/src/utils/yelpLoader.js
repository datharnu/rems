import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, '../../data/yelp_sample.json');

let cache = null;

/**
 * Loads the sampled Yelp dataset from disk and caches it in memory.
 * Expected shape:
 * {
 *   users: [
 *     {
 *       userId, name,
 *       reviews: [{ stars, text, categories, businessName }]
 *     }
 *   ],
 *   businesses: [{ name, category, description, location }]
 * }
 */
export function loadYelpData() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    cache = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️  Could not load yelp_sample.json: ${err.message}`);
    cache = { users: [], businesses: [] };
  }
  return cache;
}

export function getUserById(userId) {
  const { users = [] } = loadYelpData();
  return users.find((u) => u.userId === userId) || null;
}

export function listUsers() {
  const { users = [] } = loadYelpData();
  return users.map((u) => ({
    userId: u.userId,
    name: u.name,
    reviewCount: (u.reviews || []).length,
  }));
}

export function listBusinesses() {
  const { businesses = [] } = loadYelpData();
  return businesses;
}

import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

let database: Promise<Client> | undefined;

export function storyDb(): Promise<Client> {
  if (database) return database;
  database = initialize().catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function initialize(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (Boolean(url) !== Boolean(authToken)) {
    throw new Error('Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  }
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('Production story storage requires Turso credentials');
  }
  const filename = process.env.STORYFORGE_DB_PATH || path.join(process.cwd(), '.data', 'storyforge.sqlite');
  if (!url) mkdirSync(path.dirname(filename), { recursive: true });
  const db = createClient({ url: url || `file:${filename}`, authToken });
  try {
    await db.batch([
      `CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        owner_key TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS stories_owner_updated ON stories (owner_key, updated_at DESC)',
    ], 'write');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

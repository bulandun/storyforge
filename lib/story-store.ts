import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let database: DatabaseSync | undefined;

export function storyDb(): DatabaseSync {
  if (database) return database;
  const filename = process.env.STORYFORGE_DB_PATH || path.join(process.cwd(), '.data', 'storyforge.sqlite');
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS stories_owner_updated ON stories (owner_key, updated_at DESC);
  `);
  database = db;
  return db;
}

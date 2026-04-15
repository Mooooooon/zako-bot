import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import * as schema from './schema/index.js'

export type DB = ReturnType<typeof createDb>

export function createDb(url: string) {
  mkdirSync(dirname(url), { recursive: true })
  const sqlite = new Database(url)
  // Enable WAL mode for safe concurrent access from panel-backend
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

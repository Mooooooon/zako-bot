import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import type { DB } from '../client.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export function runMigrations(db: DB) {
  const migrationsFolder = resolve(__dirname, '../../migrations')
  migrate(db, { migrationsFolder })
}

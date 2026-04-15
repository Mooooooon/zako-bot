import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createDb } from './client.js'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const migrationsFolder = resolve(__dirname, '../migrations')
const dbUrl = process.env.DATABASE_URL ?? './data/zakobot.db'

const db = createDb(dbUrl)
migrate(db, { migrationsFolder })
console.log('[DB] Migrations applied.')

import type { DB } from '@zakobot/database'
import { runMigrations } from '@zakobot/database'

export function seed(db: DB) {
  runMigrations(db)
}

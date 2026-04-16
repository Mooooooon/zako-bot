import { eq } from 'drizzle-orm'
import type { DB } from '../client.js'
import { appSettings } from '../schema/index.js'

export function getAppSetting(db: DB, key: string) {
  return db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get()
}

export function setAppSetting(db: DB, key: string, value: string) {
  const now = new Date()

  db
    .insert(appSettings)
    .values({
      key,
      value,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        updatedAt: now,
      },
    })
    .run()

  return getAppSetting(db, key)
}

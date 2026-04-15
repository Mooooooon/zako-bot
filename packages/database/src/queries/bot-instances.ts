import { eq } from 'drizzle-orm'
import type { DB } from '../client.js'
import { botInstances, roles } from '../schema/index.js'

export function getEnabledBots(db: DB) {
  return db
    .select({ instance: botInstances, role: roles })
    .from(botInstances)
    .innerJoin(roles, eq(botInstances.roleId, roles.id))
    .where(eq(botInstances.enabled, true))
    .all()
}

export function getBotWithRole(db: DB, instanceId: string) {
  return db
    .select({ instance: botInstances, role: roles })
    .from(botInstances)
    .innerJoin(roles, eq(botInstances.roleId, roles.id))
    .where(eq(botInstances.id, instanceId))
    .get()
}

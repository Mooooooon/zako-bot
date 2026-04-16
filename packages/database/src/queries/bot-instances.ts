import { asc, eq } from 'drizzle-orm'
import type { DB } from '../client.js'
import { botInstances, roles } from '../schema/index.js'

export function listBotsWithRoles(db: DB) {
  return db
    .select({ instance: botInstances, role: roles })
    .from(botInstances)
    .innerJoin(roles, eq(botInstances.roleId, roles.id))
    .orderBy(asc(botInstances.createdAt))
    .all()
}

export function getEnabledBots(db: DB) {
  return db
    .select({ instance: botInstances, role: roles })
    .from(botInstances)
    .innerJoin(roles, eq(botInstances.roleId, roles.id))
    .where(eq(botInstances.enabled, true))
    .all()
}

export function getBot(db: DB, instanceId: string) {
  return db
    .select()
    .from(botInstances)
    .where(eq(botInstances.id, instanceId))
    .get()
}

export function getBotWithRole(db: DB, instanceId: string) {
  return db
    .select({ instance: botInstances, role: roles })
    .from(botInstances)
    .innerJoin(roles, eq(botInstances.roleId, roles.id))
    .where(eq(botInstances.id, instanceId))
    .get()
}

export function createBot(db: DB, values: typeof botInstances.$inferInsert) {
  db.insert(botInstances).values(values).run()
  return getBotWithRole(db, values.id)
}

export function updateBot(db: DB, id: string, values: Partial<typeof botInstances.$inferInsert>) {
  db
    .update(botInstances)
    .set(values)
    .where(eq(botInstances.id, id))
    .run()

  return getBotWithRole(db, id)
}

import { asc, eq } from 'drizzle-orm'
import type { DB } from '../client.js'
import { roles } from '../schema/index.js'

export function listRoles(db: DB) {
  return db
    .select()
    .from(roles)
    .orderBy(asc(roles.createdAt))
    .all()
}

export function getRole(db: DB, id: string) {
  return db
    .select()
    .from(roles)
    .where(eq(roles.id, id))
    .get()
}

export function createRole(db: DB, values: typeof roles.$inferInsert) {
  db.insert(roles).values(values).run()
  return getRole(db, values.id)
}

export function updateRole(db: DB, id: string, values: Partial<typeof roles.$inferInsert>) {
  db
    .update(roles)
    .set(values)
    .where(eq(roles.id, id))
    .run()

  return getRole(db, id)
}

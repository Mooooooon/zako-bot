import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const plugins = sqliteTable('plugins', {
  name: text('name').primaryKey(),
  version: text('version').notNull(),
  description: text('description').notNull().default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  // Plugin-specific config as JSON object
  config: text('config').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type PluginRow = typeof plugins.$inferSelect
export type NewPluginRow = typeof plugins.$inferInsert

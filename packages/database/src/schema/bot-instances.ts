import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { roles } from './roles.js'

export const botInstances = sqliteTable('bot_instances', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  platform: text('platform', { enum: ['discord', 'qq'] }).notNull(),
  token: text('token').notNull(),
  roleId: text('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'restrict' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  /** Whether the bot only responds when @mentioned (false = responds to all messages in channel) */
  requireMention: integer('require_mention', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type BotInstanceRow = typeof botInstances.$inferSelect
export type NewBotInstanceRow = typeof botInstances.$inferInsert

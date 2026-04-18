import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  transport: text('transport', { enum: ['stdio', 'sse'] }).notNull(),
  command: text('command').notNull().default(''),
  args: text('args').notNull().default('[]'),
  env: text('env').notNull().default('{}'),
  url: text('url').notNull().default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type McpServerRow = typeof mcpServers.$inferSelect
export type NewMcpServerRow = typeof mcpServers.$inferInsert

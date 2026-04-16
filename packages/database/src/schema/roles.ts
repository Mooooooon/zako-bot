import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  avatar: text('avatar').notNull().default(''),
  name: text('name').notNull(),
  systemPrompt: text('system_prompt').notNull().default(''),
  // LLM config — stored flat for simplicity
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  llmApiKey: text('llm_api_key').notNull(),
  llmBaseUrl: text('llm_base_url'),
  // Enabled tools as JSON array, e.g. '["web_search","web_browse"]'
  enabledTools: text('enabled_tools').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type RoleRow = typeof roles.$inferSelect
export type NewRoleRow = typeof roles.$inferInsert

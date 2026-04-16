import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { botInstances } from './bot-instances.js'

export const conversationTopics = sqliteTable('conversation_topics', {
  id: text('id').primaryKey(),
  botInstanceId: text('bot_instance_id')
    .notNull()
    .references(() => botInstances.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  scopeKey: text('scope_key').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  sourceType: text('source_type').notNull().default(''),
  sourceId: text('source_id').notNull().default(''),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, table => ({
  activeScopeIdx: index('conversation_topics_active_scope_idx').on(
    table.botInstanceId,
    table.platform,
    table.scopeKey,
    table.status,
  ),
}))

export const conversationMessages = sqliteTable('conversation_messages', {
  id: text('id').primaryKey(),
  topicId: text('topic_id')
    .notNull()
    .references(() => conversationTopics.id, { onDelete: 'cascade' }),
  botInstanceId: text('bot_instance_id')
    .notNull()
    .references(() => botInstances.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull().default(''),
  messageType: text('message_type').notNull().default('text'),
  platformMessageId: text('platform_message_id').notNull().default(''),
  senderId: text('sender_id').notNull().default(''),
  senderName: text('sender_name').notNull().default(''),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, table => ({
  topicCreatedAtIdx: index('conversation_messages_topic_created_at_idx').on(
    table.topicId,
    table.createdAt,
  ),
}))

export type ConversationTopicRow = typeof conversationTopics.$inferSelect
export type NewConversationTopicRow = typeof conversationTopics.$inferInsert
export type ConversationMessageRow = typeof conversationMessages.$inferSelect
export type NewConversationMessageRow = typeof conversationMessages.$inferInsert

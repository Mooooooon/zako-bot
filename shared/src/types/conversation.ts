export interface ConversationTopic {
  id: string
  botInstanceId: string
  platform: string
  scopeKey: string
  name: string
  status: string
  sourceType: string
  sourceId: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  topicId: string
  botInstanceId: string
  platform: string
  role: 'user' | 'assistant'
  content: string
  messageType: string
  platformMessageId: string
  senderId: string
  senderName: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface CreateConversationTopicInput {
  botInstanceId: string
}

export interface SendConversationMessageInput {
  botInstanceId: string
  topicId?: string
  content: string
}

export interface SendConversationMessageResult {
  topic: ConversationTopic
  userMessage: ConversationMessage
  assistantMessage: ConversationMessage
}

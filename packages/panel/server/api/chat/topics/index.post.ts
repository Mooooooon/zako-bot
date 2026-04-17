import type { ConversationTopic, CreateConversationTopicInput } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateConversationTopicInput>(event)

  try {
    const topic = await corePost<ConversationTopic>('/conversations', body)
    return { ok: true, data: topic }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to create conversation topic',
    })
  }
})

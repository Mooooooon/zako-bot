import type { ConversationTopic } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const botInstanceId = String(query.botInstanceId ?? '').trim()

  if (!botInstanceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bot instance ID is required',
    })
  }

  try {
    const topics = await coreGet<ConversationTopic[]>(`/conversations?botInstanceId=${encodeURIComponent(botInstanceId)}`)
    return { ok: true, data: topics }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Failed to load conversation topics',
    })
  }
})

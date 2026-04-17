import type { SendConversationMessageInput, SendConversationMessageResult } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<SendConversationMessageInput>(event)

  try {
    const result = await corePost<SendConversationMessageResult>('/conversations/messages', body)
    return { ok: true, data: result }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to send conversation message',
    })
  }
})

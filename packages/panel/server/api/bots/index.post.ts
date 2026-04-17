import type { BotEditorInput, BotProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<BotEditorInput>(event)

  try {
    const bot = await corePost<BotProfile>('/bots', body)
    return { ok: true, data: bot }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to create bot',
    })
  }
})

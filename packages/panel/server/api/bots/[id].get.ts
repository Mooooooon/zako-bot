import type { BotProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bot id is required',
    })
  }

  try {
    const bot = await coreGet<BotProfile>(`/bots/${id}`)
    return { ok: true, data: bot }
  }
  catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: error instanceof Error ? error.message : 'Failed to fetch bot',
    })
  }
})

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
    const bot = await coreDelete<BotProfile>(`/bots/${id}`)
    return { ok: true, data: bot }
  }
  catch (error: any) {
    throw createError({
      statusCode: error?.statusCode ?? 400,
      statusMessage: error?.message ?? 'Failed to delete bot',
    })
  }
})

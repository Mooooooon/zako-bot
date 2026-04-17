import type { BotProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Bot id is required',
    })
  }

  try {
    const bot = await coreDelete<BotProfile>(`/bots/${id}`)
    return { ok: true, data: bot }
  }
  catch (error: any) {
    throw createError({
      statusCode: error?.statusCode ?? 400,
      message: error?.message ?? 'Failed to delete bot',
    })
  }
})

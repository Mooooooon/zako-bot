import type { BotListItem } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const bots = await coreGet<BotListItem[]>('/bots')
    return { ok: true, data: bots }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      message: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

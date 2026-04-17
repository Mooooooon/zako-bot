import type { SearchSettings } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const settings = await coreGet<SearchSettings>('/settings/search')
    return { ok: true, data: settings }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      message: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

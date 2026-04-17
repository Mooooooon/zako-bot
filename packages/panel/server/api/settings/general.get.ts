import type { GeneralSettings } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const settings = await coreGet<GeneralSettings>('/settings/general')
    return { ok: true, data: settings }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

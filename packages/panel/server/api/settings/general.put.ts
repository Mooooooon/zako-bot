import type { GeneralSettings } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<GeneralSettings>(event)

  try {
    const settings = await corePut<GeneralSettings>('/settings/general', body)
    return { ok: true, data: settings }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to update general settings',
    })
  }
})

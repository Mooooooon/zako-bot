import type { SearchSettings } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchSettings>(event)

  try {
    const settings = await corePut<SearchSettings>('/settings/search', body)
    return { ok: true, data: settings }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to update search settings',
    })
  }
})

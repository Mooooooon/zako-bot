import type { CoreStatus } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const status = await coreGet<CoreStatus>('/status')
    return { ok: true, data: status }
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: 'Core is unreachable' })
  }
})
import type { RoleProfile } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const roles = await coreGet<RoleProfile[]>('/roles')
    return { ok: true, data: roles }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

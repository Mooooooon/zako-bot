import type { RoleEditorInput, RoleProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<RoleEditorInput>(event)

  try {
    const role = await corePost<RoleProfile>('/roles', body)
    return { ok: true, data: role }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Failed to create role',
    })
  }
})

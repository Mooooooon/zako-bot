import type { RoleProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Role id is required' })
  }

  try {
    const role = await coreGet<RoleProfile>(`/roles/${id}`)
    return { ok: true, data: role }
  }
  catch (error) {
    throw createError({
      statusCode: 404,
      message: error instanceof Error ? error.message : 'Role not found',
    })
  }
})

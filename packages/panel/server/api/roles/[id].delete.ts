import type { RoleProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Role id is required' })
  }

  try {
    const role = await coreDelete<RoleProfile>(`/roles/${id}`)
    return { ok: true, data: role }
  }
  catch (error: any) {
    throw createError({
      statusCode: error?.statusCode ?? 400,
      statusMessage: error?.message ?? 'Failed to delete role',
    })
  }
})

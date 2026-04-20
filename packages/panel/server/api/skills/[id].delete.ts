import type { SkillProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Skill id is required' })
  }

  try {
    const skill = await coreDelete<SkillProfile>(`/skills/${id}`)
    return { ok: true, data: skill }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to delete skill',
    })
  }
})

import type { SkillProfile } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const skills = await coreGet<SkillProfile[]>('/skills')
    return { ok: true, data: skills }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      message: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

import type { SkillEditorInput, SkillProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const body = await readBody<SkillEditorInput>(event)

  try {
    const skill = await corePost<SkillProfile>('/skills', body)
    return { ok: true, data: skill }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : 'Failed to create skill',
    })
  }
})

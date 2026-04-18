import type { McpServerProfile } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const servers = await coreGet<McpServerProfile[]>('/mcp/servers')
    return { ok: true, data: servers }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      message: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

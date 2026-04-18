import type { McpServerStatus } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const status = await coreGet<McpServerStatus[]>('/mcp/status')
    return { ok: true, data: status }
  }
  catch (error) {
    throw createError({
      statusCode: 503,
      message: error instanceof Error ? error.message : 'Core is unreachable',
    })
  }
})

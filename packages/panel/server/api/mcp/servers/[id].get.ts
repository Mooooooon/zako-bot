import type { McpServerProfile } from '@zakobot/shared'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'MCP server id is required' })
  }

  try {
    const server = await coreGet<McpServerProfile>(`/mcp/servers/${id}`)
    return { ok: true, data: server }
  }
  catch (error) {
    throw createError({
      statusCode: 404,
      message: error instanceof Error ? error.message : 'MCP server not found',
    })
  }
})

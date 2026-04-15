import type { PluginInfo } from '@zakobot/shared'

export default defineEventHandler(async () => {
  try {
    const plugins = await coreGet<PluginInfo[]>('/plugins')
    return { ok: true, data: plugins }
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: 'Core is unreachable' })
  }
})
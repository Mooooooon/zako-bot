import type { LLMTool } from './llm.js'

export interface PluginMeta {
  name: string
  version: string
  description: string
  author?: string
}

export interface PluginContext {
  /** Send a message to a platform channel */
  sendMessage: (channelId: string, content: string) => Promise<void>
  /** Schedule a recurring task */
  schedule: (cronExpr: string, fn: () => void | Promise<void>) => void
  /** Access plugin-scoped config */
  getConfig: <T = unknown>(key: string) => T | undefined
  /** Register an LLM tool exposed by this plugin */
  registerTool: (tool: LLMTool) => void
}

export interface Plugin {
  meta: PluginMeta
  onLoad: (ctx: PluginContext) => void | Promise<void>
  onUnload?: () => void | Promise<void>
}

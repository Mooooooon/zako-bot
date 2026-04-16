import type { LLMConfig } from './llm.js'

export type BuiltinTool = 'web_search' | 'web_browse'

export interface RoleEditorInput {
  avatar: string
  name: string
  systemPrompt: string
  /** Which built-in tools this role is allowed to use */
  enabledTools: BuiltinTool[]
}

export interface RoleProfile extends RoleEditorInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: string
  avatar: string
  name: string
  /** System prompt that defines the AI's personality and behavior */
  systemPrompt: string
  llmConfig: LLMConfig
  /** Which built-in tools this role is allowed to use */
  enabledTools: BuiltinTool[]
  createdAt: string
  updatedAt: string
}

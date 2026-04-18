export type McpTransport = 'stdio' | 'sse'

export interface McpServerEditorInput {
  name: string
  description: string
  transport: McpTransport
  command: string
  args: string[]
  env: Record<string, string>
  url: string
  enabled: boolean
}

export interface McpServerProfile extends McpServerEditorInput {
  id: string
  createdAt: string
  updatedAt: string
}

export interface McpToolInfo {
  toolName: string
  serverName: string
  originalName: string
  description: string
}

export interface McpServerStatus {
  id: string
  name: string
  connected: boolean
  toolCount: number
  toolNames: string[]
  error?: string
}

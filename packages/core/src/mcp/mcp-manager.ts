import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { McpServerRow } from '@zakobot/database'
import type { LLMTool } from '@zakobot/shared'
import type { ToolRegistry } from '../tools/registry.js'

interface McpConnection {
  client: Client
  serverRow: McpServerRow
  toolNames: string[]
}

export class McpManager {
  private connections = new Map<string, McpConnection>()
  private errors = new Map<string, string>()

  constructor(private toolRegistry: ToolRegistry) {}

  async connect(serverRow: McpServerRow): Promise<void> {
    if (this.connections.has(serverRow.id)) {
      await this.disconnect(serverRow.id)
    }

    this.errors.delete(serverRow.id)

    const client = new Client({ name: 'zakobot', version: '1.0.0' }, { capabilities: {} })
    const owner = this.getOwner(serverRow.id)
    let registeredNames: string[] = []

    try {
      const transport = this.createTransport(serverRow)
      await client.connect(transport)

      const { tools } = await client.listTools()
      registeredNames = tools.flatMap((mcpTool) => {
        const toolName = this.buildToolName(serverRow.name, mcpTool.name)
        const llmTool: LLMTool = {
          name: toolName,
          description: mcpTool.description ?? '',
          parameters: (mcpTool.inputSchema ?? { type: 'object', properties: {} }) as Record<string, unknown>,
          execute: async (args) => {
            const result = await client.callTool({ name: mcpTool.name, arguments: args })
            const content = Array.isArray(result.content) ? result.content : []
            return content
              .map((item) => item.type === 'text' ? item.text : JSON.stringify(item))
              .join('\n')
          },
        }

        try {
          this.toolRegistry.register(llmTool, { source: 'mcp', owner })
          return [toolName]
        }
        catch {
          console.warn(`[McpManager] Tool "${toolName}" already registered, skipping.`)
          return []
        }
      })

      this.connections.set(serverRow.id, { client, serverRow, toolNames: registeredNames })
      console.log(`[McpManager] Connected to "${serverRow.name}", registered ${registeredNames.length} tool(s).`)
    }
    catch (error) {
      this.toolRegistry.unregisterOwner(owner)
      await client.close().catch(() => undefined)

      const message = error instanceof Error ? error.message : 'Unknown MCP connection error'
      this.errors.set(serverRow.id, message)
      throw error
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId)

    this.errors.delete(serverId)
    this.toolRegistry.unregisterOwner(this.getOwner(serverId))
    this.connections.delete(serverId)

    if (!conn) {
      return
    }

    try {
      await conn.client.close()
    }
    catch {
      // 关闭失败不影响配置刷新或进程退出。
    }

    console.log(`[McpManager] Disconnected from "${conn.serverRow.name}".`)
  }

  async reconnect(serverRow: McpServerRow): Promise<void> {
    await this.disconnect(serverRow.id)
    if (serverRow.enabled) {
      await this.connect(serverRow)
    }
  }

  async connectAll(servers: McpServerRow[]): Promise<void> {
    await Promise.all(servers.map(async (server) => {
      try {
        await this.connect(server)
      }
      catch (error) {
        console.error(`[McpManager] Failed to connect to "${server.name}":`, error)
      }
    }))
  }

  async disconnectAll(): Promise<void> {
    const serverIds = [...this.connections.keys()]
    await Promise.allSettled(serverIds.map(serverId => this.disconnect(serverId)))
  }

  listConnectedTools(): Array<{ serverId: string; serverName: string; toolNames: string[] }> {
    return [...this.connections.values()].map(conn => ({
      serverId: conn.serverRow.id,
      serverName: conn.serverRow.name,
      toolNames: [...conn.toolNames],
    }))
  }

  getStatus(): Array<{ id: string; name: string; connected: boolean; toolCount: number; toolNames: string[]; error?: string }> {
    const connectedStatus = [...this.connections.values()].map(conn => ({
      id: conn.serverRow.id,
      name: conn.serverRow.name,
      connected: true,
      toolCount: conn.toolNames.length,
      toolNames: [...conn.toolNames],
      error: this.errors.get(conn.serverRow.id),
    }))

    const disconnectedStatus = [...this.errors.entries()]
      .filter(([id]) => !this.connections.has(id))
      .map(([id, error]) => ({
        id,
        name: '',
        connected: false,
        toolCount: 0,
        toolNames: [],
        error,
      }))

    return [...connectedStatus, ...disconnectedStatus]
  }

  private createTransport(serverRow: McpServerRow): StdioClientTransport | SSEClientTransport {
    if (serverRow.transport === 'stdio') {
      return new StdioClientTransport({
        command: serverRow.command,
        args: this.parseStringArray(serverRow.args),
        env: {
          ...this.getProcessEnv(),
          ...this.parseStringRecord(serverRow.env),
        },
      })
    }

    return new SSEClientTransport(new URL(serverRow.url))
  }

  private parseStringArray(value: string): string[] {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  }

  private parseStringRecord(value: string): Record<string, string> {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  }

  private getProcessEnv(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  }

  private buildToolName(serverName: string, toolName: string) {
    return `mcp__${serverName}__${toolName}`
  }

  private getOwner(serverId: string) {
    return `mcp__${serverId}`
  }
}

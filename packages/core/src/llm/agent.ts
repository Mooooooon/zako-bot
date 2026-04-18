import type { RoleRow } from '@zakobot/database'
import type { AgentEvent, ChatMessage, GeneralSettings, LLMConfig, LLMTool, ToolApprovalCallback } from '@zakobot/shared'
import { LLMClient } from './client.js'
import { ConversationService } from './conversation-service.js'
import type { ToolRegistry } from '../tools/index.js'

export class Agent {
  private client: LLMClient

  constructor(
    private getRole: () => RoleRow,
    llmConfig: LLMConfig,
    private conversations: ConversationService,
    private toolRegistry: ToolRegistry,
    private getGeneralSettings: () => GeneralSettings,
  ) {
    this.client = new LLMClient(llmConfig)
  }

  async *respondStream(topicId: string, requestApproval?: ToolApprovalCallback): AsyncGenerator<AgentEvent> {
    const role = this.getRole()
    const { maxToolCallRounds, sendTime, timezone } = this.getGeneralSettings()
    const history = this.conversations.listTopicHistory(topicId)
    const enabledTools = this.parseEnabledTools(role.enabledTools)
    const allowedTools = this.toolRegistry.listEnabled(enabledTools)
    const toolPrompt = this.buildToolPrompt(allowedTools)
    const historyWithTime = sendTime ? this.injectSendTime(history, timezone) : history

    const messages = [
      { role: 'system' as const, content: role.systemPrompt },
      ...(toolPrompt ? [{ role: 'system' as const, content: toolPrompt }] : []),
      ...historyWithTime,
    ]

    yield* this.client.chatStream(messages, allowedTools, { maxToolCallRounds, requestApproval })
  }

  async respond(topicId: string): Promise<string> {
    const role = this.getRole()
    const { maxToolCallRounds, sendTime, timezone } = this.getGeneralSettings()
    const history = this.conversations.listTopicHistory(topicId)

    const enabledTools = this.parseEnabledTools(role.enabledTools)
    const allowedTools = this.toolRegistry.listEnabled(enabledTools)
    const toolPrompt = this.buildToolPrompt(allowedTools)

    const historyWithTime = sendTime ? this.injectSendTime(history, timezone) : history

    const messages = [
      { role: 'system' as const, content: role.systemPrompt },
      ...(toolPrompt
        ? [{ role: 'system' as const, content: toolPrompt }]
        : []),
      ...historyWithTime,
    ]

    const reply = await this.client.chat(messages, allowedTools, maxToolCallRounds)
    return reply
  }

  private injectSendTime(history: ChatMessage[], timezone: string): ChatMessage[] {
    const lastUserIndex = history.map(m => m.role).lastIndexOf('user')
    if (lastUserIndex === -1) return history

    const timeStr = new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date())

    const result = [...history]
    const msg = result[lastUserIndex]!
    const timeNote = `\n\n[发送时间：${timeStr} (${timezone})]`
    const newContent = Array.isArray(msg.content)
      ? [...msg.content, { type: 'text' as const, text: timeNote.trim() }]
      : `${msg.content}${timeNote}`
    result[lastUserIndex] = { ...msg, content: newContent }
    return result
  }

  private buildToolPrompt(tools: LLMTool[]) {
    if (!tools.length) {
      return ''
    }

    const mcpNote = tools.some(tool => tool.name.startsWith('mcp__'))
      ? ['名称以 mcp__ 开头的是 MCP 服务器暴露的工具。', '']
      : []

    return [
      '以下工具已为当前角色启用。它们会通过模型工具调用接口发送；请根据用户需求主动判断是否调用工具，并严格遵守每个工具的使用说明。',
      '',
      ...mcpNote,
      tools.map(tool => this.formatToolPromptSection(tool)).join('\n\n'),
    ].join('\n')
  }

  private formatToolPromptSection(tool: LLMTool) {
    const lines = [`工具：${tool.name}`]
    const description = tool.description.trim()
    const parameterSummary = this.formatParameterSummary(tool.parameters)
    const instructions = tool.instructions?.trim()

    if (description) {
      lines.push(`说明：${description}`)
    }

    if (parameterSummary) {
      lines.push(`参数：${parameterSummary}`)
    }

    if (instructions) {
      lines.push(`使用说明：${instructions}`)
    }

    return lines.join('\n')
  }

  private formatParameterSummary(parameters: Record<string, unknown>) {
    const properties = this.getRecord(parameters.properties)
    const required = new Set(
      Array.isArray(parameters.required)
        ? parameters.required.filter((name): name is string => typeof name === 'string')
        : [],
    )

    if (!properties || !Object.keys(properties).length) {
      return ''
    }

    return Object.entries(properties)
      .map(([name, schema]) => {
        const record = this.getRecord(schema)
        const type = typeof record?.type === 'string' ? record.type : 'unknown'
        const description = typeof record?.description === 'string' && record.description.trim()
          ? ` - ${record.description.trim()}`
          : ''
        const marker = required.has(name) ? '必填' : '可选'

        return `${name}(${type}, ${marker})${description}`
      })
      .join('；')
  }

  private getRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
  }

  isToolSensitive(name: string): boolean {
    const enabledTools = this.parseEnabledTools(this.getRole().enabledTools)
    return this.toolRegistry.listEnabled(enabledTools).find(t => t.name === name)?.sensitive === true
  }

  private parseEnabledTools(value: string): string[] {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed)
        ? parsed.filter((tool): tool is string => typeof tool === 'string')
        : []
    }
    catch {
      return []
    }
  }
}

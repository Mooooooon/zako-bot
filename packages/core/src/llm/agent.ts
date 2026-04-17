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
    result[lastUserIndex] = {
      ...result[lastUserIndex],
      content: `${result[lastUserIndex].content}\n\n[发送时间：${timeStr} (${timezone})]`,
    }
    return result
  }

  private buildToolPrompt(tools: LLMTool[]) {
    const sections = tools
      .filter((tool) => tool.instructions?.trim())
      .map((tool) => [
        `工具：${tool.name}`,
        tool.instructions!.trim(),
      ].join('\n'))

    if (!sections.length) {
      return ''
    }

    return [
      '以下工具已为当前角色启用。请根据用户需求主动判断是否调用工具，并严格遵守每个工具的使用说明。',
      '',
      sections.join('\n\n'),
    ].join('\n')
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

import type { RoleRow } from '@zakobot/database'
import type { LLMConfig, LLMTool } from '@zakobot/shared'
import { LLMClient } from './client.js'
import { ConversationService } from './conversation-service.js'
import type { ToolRegistry } from '../tools/index.js'

export class Agent {
  private client: LLMClient

  constructor(
    private role: RoleRow,
    llmConfig: LLMConfig,
    private conversations: ConversationService,
    private toolRegistry: ToolRegistry,
  ) {
    this.client = new LLMClient(llmConfig)
  }

  async respond(topicId: string): Promise<string> {
    const history = this.conversations.listTopicHistory(topicId)

    // Filter tools by what this role allows
    const enabledTools = this.parseEnabledTools(this.role.enabledTools)
    const allowedTools = this.toolRegistry.listEnabled(enabledTools)
    const toolPrompt = this.buildToolPrompt(allowedTools)
    const messages = [
      { role: 'system' as const, content: this.role.systemPrompt },
      ...(toolPrompt
        ? [{ role: 'system' as const, content: toolPrompt }]
        : []),
      ...history,
    ]

    const reply = await this.client.chat(messages, allowedTools)
    return reply
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

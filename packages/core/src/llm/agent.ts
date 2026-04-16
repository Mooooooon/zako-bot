import type { RoleRow } from '@zakobot/database'
import type { LLMConfig, LLMTool } from '@zakobot/shared'
import { LLMClient } from './client.js'
import { ConversationService } from './conversation-service.js'

export class Agent {
  private client: LLMClient
  private tools: LLMTool[] = []

  constructor(
    private role: RoleRow,
    llmConfig: LLMConfig,
    private conversations: ConversationService,
  ) {
    this.client = new LLMClient(llmConfig)
  }

  registerTool(tool: LLMTool) {
    this.tools.push(tool)
  }

  async respond(topicId: string): Promise<string> {
    const history = this.conversations.listTopicHistory(topicId)
    const messages = [
      { role: 'system' as const, content: this.role.systemPrompt },
      ...history,
    ]

    // Filter tools by what this role allows
    const enabledTools = JSON.parse(this.role.enabledTools) as string[]
    const allowedTools = this.tools.filter((t) => enabledTools.includes(t.name))

    const reply = await this.client.chat(messages, allowedTools)
    return reply
  }
}

import type { RoleRow } from '@zakobot/database'
import type { LLMTool } from '@zakobot/shared'
import { LLMClient } from './client.js'
import { ConversationStore } from './conversation-store.js'

export class Agent {
  private client: LLMClient
  private store: ConversationStore
  private tools: LLMTool[] = []

  constructor(private role: RoleRow, store: ConversationStore) {
    this.client = new LLMClient({
      provider: role.llmProvider as 'openai',
      model: role.llmModel,
      apiKey: role.llmApiKey,
      baseUrl: role.llmBaseUrl ?? undefined,
    })
    this.store = store
  }

  registerTool(tool: LLMTool) {
    this.tools.push(tool)
  }

  async respond(botInstanceId: string, channelId: string, userText: string): Promise<string> {
    // Add user message to history
    this.store.push(botInstanceId, channelId, { role: 'user', content: userText })

    const history = this.store.get(botInstanceId, channelId)
    const messages = [
      { role: 'system' as const, content: this.role.systemPrompt },
      ...history,
    ]

    // Filter tools by what this role allows
    const enabledTools = JSON.parse(this.role.enabledTools) as string[]
    const allowedTools = this.tools.filter((t) => enabledTools.includes(t.name))

    const reply = await this.client.chat(messages, allowedTools)

    // Add assistant reply to history
    this.store.push(botInstanceId, channelId, { role: 'assistant', content: reply })

    return reply
  }

  clearHistory(botInstanceId: string, channelId: string) {
    this.store.clear(botInstanceId, channelId)
  }
}

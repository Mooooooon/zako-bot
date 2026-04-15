import OpenAI from 'openai'
import type { LLMConfig, ChatMessage, LLMTool } from '@zakobot/shared'

export class LLMClient {
  private openai: OpenAI

  constructor(private config: LLMConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl, // undefined = use OpenAI default
    })
  }

  async chat(messages: ChatMessage[], tools: LLMTool[] = []): Promise<string> {
    const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: this.config.model,
      messages,
    }

    if (tools.length > 0) {
      params.tools = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }))
      params.tool_choice = 'auto'
    }

    const response = await this.openai.chat.completions.create(params)
    const message = response.choices[0]?.message

    if (!message) throw new Error('LLM returned empty response')

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      return this.handleToolCalls(messages, message, tools)
    }

    return message.content ?? ''
  }

  private async handleToolCalls(
    messages: ChatMessage[],
    assistantMessage: OpenAI.Chat.ChatCompletionMessage,
    tools: LLMTool[],
  ): Promise<string> {
    const toolCallMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...messages,
      assistantMessage,
    ]

    for (const toolCall of assistantMessage.tool_calls ?? []) {
      if (toolCall.type !== 'function') continue
      const tool = tools.find((t) => t.name === toolCall.function.name)
      if (!tool) continue

      let result: string
      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        result = await tool.execute(args)
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : String(err)}`
      }

      toolCallMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }

    const followUp = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: toolCallMessages,
    })

    return followUp.choices[0]?.message?.content ?? ''
  }
}

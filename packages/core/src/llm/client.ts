import OpenAI from 'openai'
import type { AgentEvent, LLMConfig, ChatMessage, LLMTool, ToolApprovalCallback } from '@zakobot/shared'

const MAX_TOOL_CALL_ROUNDS = 8

export class LLMClient {
  private openai: OpenAI

  constructor(private config: LLMConfig) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl, // undefined = use OpenAI default
    })
  }

  async chat(messages: ChatMessage[], tools: LLMTool[] = [], maxToolCallRounds = MAX_TOOL_CALL_ROUNDS): Promise<string> {
    const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages]
    const toolDefinitions = this.buildToolDefinitions(tools)

    for (let i = 0; i < maxToolCallRounds; i += 1) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: requestMessages,
        ...(toolDefinitions.length > 0
          ? {
              tools: toolDefinitions,
              tool_choice: 'auto' as const,
            }
          : {}),
      })

      const message = response.choices[0]?.message

      if (!message) throw new Error('LLM returned empty response')

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return message.content ?? ''
      }

      requestMessages.push(this.toAssistantToolCallMessage(message))
      requestMessages.push(...await this.executeToolCalls(message, tools))
    }

    console.warn(`[LLM] Reached tool-call limit (${maxToolCallRounds}); requesting final answer without tools.`)

    const finalResponse = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        ...requestMessages,
        {
          role: 'system',
          content: '你已经完成了足够的工具调用。不要再调用任何工具，直接基于现有上下文和工具结果给出最终回答；若信息仍不足，请明确说明不确定之处。',
        },
      ],
    })

    const finalMessage = finalResponse.choices[0]?.message

    if (!finalMessage) {
      throw new Error('LLM returned empty response after tool-call limit')
    }

    return finalMessage.content ?? ''
  }

  async *chatStream(
    messages: ChatMessage[],
    tools: LLMTool[] = [],
    options: { maxToolCallRounds?: number; requestApproval?: ToolApprovalCallback } = {},
  ): AsyncGenerator<AgentEvent> {
    const { maxToolCallRounds = MAX_TOOL_CALL_ROUNDS, requestApproval } = options
    const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages]
    const toolDefinitions = this.buildToolDefinitions(tools)

    for (let round = 0; round < maxToolCallRounds; round++) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: requestMessages,
        ...(toolDefinitions.length > 0
          ? { tools: toolDefinitions, tool_choice: 'auto' as const }
          : {}),
      })

      const message = response.choices[0]?.message
      if (!message) throw new Error('LLM returned empty response')

      if (message.content) {
        for (const segment of this.splitSegments(message.content)) {
          yield { type: 'text_chunk', content: segment }
        }
      }

      if (!message.tool_calls?.length) {
        yield { type: 'done', content: message.content ?? '' }
        return
      }

      requestMessages.push(this.toAssistantToolCallMessage(message))

      const toolResultMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []
      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue

        const tool = tools.find(t => t.name === toolCall.function.name)
        let args: Record<string, unknown>
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        }
        catch {
          args = {}
        }

        yield { type: 'tool_call', callId: toolCall.id, name: toolCall.function.name, input: args }

        let result: string
        let ok = true

        try {
          if (!tool) throw new Error(`Tool "${toolCall.function.name}" is not available`)

          if (requestApproval) {
            const approved = await requestApproval(toolCall.id, toolCall.function.name, args)
            if (!approved) {
              result = 'User denied this tool call.'
              ok = false
              yield { type: 'tool_result', callId: toolCall.id, name: toolCall.function.name, result, ok }
              toolResultMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result })
              continue
            }
          }

          console.log(`[ToolCall] ${toolCall.function.name} ${this.formatLogValue(args)}`)
          result = await tool.execute(args)
          console.log(`[ToolResult] ${toolCall.function.name} ok length=${result.length}`)
        }
        catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`
          ok = false
          console.warn(`[ToolResult] ${toolCall.function.name} error="${this.escapeLogMessage(result)}"`)
        }

        yield { type: 'tool_result', callId: toolCall.id, name: toolCall.function.name, result, ok }
        toolResultMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result })
      }

      requestMessages.push(...toolResultMessages)
    }

    console.warn(`[LLM] Reached tool-call limit (${maxToolCallRounds}); requesting final answer without tools.`)
    const finalResponse = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        ...requestMessages,
        {
          role: 'system',
          content: '你已经完成了足够的工具调用。不要再调用任何工具，直接基于现有上下文和工具结果给出最终回答；若信息仍不足，请明确说明不确定之处。',
        },
      ],
    })

    const finalMessage = finalResponse.choices[0]?.message
    if (!finalMessage) throw new Error('LLM returned empty response after tool-call limit')

    if (finalMessage.content) {
      for (const segment of this.splitSegments(finalMessage.content)) {
        yield { type: 'text_chunk', content: segment }
      }
    }

    yield { type: 'done', content: finalMessage.content ?? '' }
  }

  private splitSegments(text: string, maxLength = 1800): string[] {
    const paragraphs = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
    const result: string[] = []
    for (const para of paragraphs) {
      if (para.length <= maxLength) {
        result.push(para)
      }
      else {
        for (let i = 0; i < para.length; i += maxLength) {
          result.push(para.slice(i, i + maxLength))
        }
      }
    }
    return result
  }

  private buildToolDefinitions(tools: LLMTool[]): OpenAI.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  private async executeToolCalls(
    assistantMessage: OpenAI.Chat.ChatCompletionMessage,
    tools: LLMTool[],
  ): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
    const toolCallMessages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    for (const toolCall of assistantMessage.tool_calls ?? []) {
      if (toolCall.type !== 'function') continue
      const tool = tools.find((t) => t.name === toolCall.function.name)

      let result: string
      try {
        if (!tool) {
          throw new Error(`Tool "${toolCall.function.name}" is not available`)
        }

        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        console.log(`[ToolCall] ${tool.name} ${this.formatLogValue(args)}`)
        result = await tool.execute(args)
        console.log(`[ToolResult] ${tool.name} ok length=${result.length}`)
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : String(err)}`
        console.warn(`[ToolResult] ${toolCall.function.name} error="${this.escapeLogMessage(result)}"`)
      }

      toolCallMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }

    return toolCallMessages
  }

  private toAssistantToolCallMessage(
    message: OpenAI.Chat.ChatCompletionMessage,
  ): OpenAI.Chat.ChatCompletionAssistantMessageParam {
    const functionToolCalls = (message.tool_calls ?? [])
      .filter((toolCall): toolCall is OpenAI.Chat.ChatCompletionMessageFunctionToolCall =>
        toolCall.type === 'function',
      )

    return {
      role: 'assistant',
      content: message.content ?? '',
      ...(functionToolCalls.length
        ? {
            tool_calls: functionToolCalls.map((toolCall) => ({
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            })),
          }
        : {}),
    }
  }

  private formatLogValue(value: unknown) {
    try {
      return this.truncateLogMessage(JSON.stringify(value))
    }
    catch {
      return '[unserializable]'
    }
  }

  private escapeLogMessage(value: string) {
    return this.truncateLogMessage(value).replaceAll('"', '\\"')
  }

  private truncateLogMessage(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim()
    return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized
  }
}

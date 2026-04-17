import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import type { Content, Part, Tool as GenAITool } from '@google/genai'
import type { AgentEvent, LLMConfig, ChatMessage, LLMTool, ToolApprovalCallback } from '@zakobot/shared'

const MAX_TOOL_CALL_ROUNDS = 8

interface ServiceAccountCreds {
  type: string
  project_id: string
  private_key: string
  client_email: string
  token_uri: string
}

function parseServiceAccount(apiKey: string): ServiceAccountCreds | null {
  try {
    const parsed = JSON.parse(apiKey) as ServiceAccountCreds
    if (parsed.type === 'service_account' && parsed.private_key && parsed.client_email)
      return parsed
    return null
  }
  catch { return null }
}

function extractVertexLocation(baseUrl: string): string {
  // Parse from URL path: /locations/{location}/
  const pathMatch = baseUrl.match(/\/locations\/([^/]+)\//)
  if (pathMatch) return pathMatch[1]!
  // Fallback: regional subdomain https://{location}-aiplatform.googleapis.com
  const hostMatch = baseUrl.match(/^https?:\/\/([a-z0-9-]+)-aiplatform\.googleapis\.com/)
  if (hostMatch) return hostMatch[1]!
  return 'us-central1'
}

let _callCounter = 0
function genCallId(): string {
  return `call_${(++_callCounter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export class LLMClient {
  private openai?: OpenAI
  private genai?: GoogleGenAI
  private vertexCreds: ServiceAccountCreds | null

  constructor(private config: LLMConfig) {
    this.vertexCreds = parseServiceAccount(config.apiKey)

    if (this.vertexCreds) {
      const location = extractVertexLocation(config.baseUrl ?? '')
      this.genai = new GoogleGenAI({
        vertexai: true,
        project: this.vertexCreds.project_id,
        location,
        googleAuthOptions: {
          credentials: this.vertexCreds as unknown as Record<string, string>,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        },
      })
    }
    else {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })
    }
  }

  async chat(messages: ChatMessage[], tools: LLMTool[] = [], maxToolCallRounds = MAX_TOOL_CALL_ROUNDS): Promise<string> {
    if (this.genai) {
      return this.chatVertex(messages, tools, maxToolCallRounds)
    }

    const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(m => this.toOpenAIMessage(m))
    const toolDefinitions = this.buildToolDefinitions(tools)

    for (let i = 0; i < maxToolCallRounds; i += 1) {
      const response = await this.openai!.chat.completions.create({
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

    const finalResponse = await this.openai!.chat.completions.create({
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
    if (this.genai) {
      yield* this.chatStreamVertex(messages, tools, options)
      return
    }

    const { maxToolCallRounds = MAX_TOOL_CALL_ROUNDS, requestApproval } = options
    const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(m => this.toOpenAIMessage(m))
    const toolDefinitions = this.buildToolDefinitions(tools)

    for (let round = 0; round < maxToolCallRounds; round++) {
      const response = await this.openai!.chat.completions.create({
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

    console.warn(`[LLM] Reached tool-call limit (${MAX_TOOL_CALL_ROUNDS}); requesting final answer without tools.`)
    const finalResponse = await this.openai!.chat.completions.create({
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

  // ── Vertex AI (Google GenAI SDK) ──────────────────────────────────────────

  private async chatVertex(messages: ChatMessage[], tools: LLMTool[], maxRounds: number): Promise<string> {
    const { systemInstruction, contents } = await this.toGenAIContents(messages)
    const genAITools = this.buildGenAITools(tools)

    for (let round = 0; round < maxRounds; round++) {
      const response = await this.genai!.models.generateContent({
        model: this.config.model,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(genAITools.length ? { tools: genAITools } : {}),
        },
      })

      const parts: Part[] = response.candidates?.[0]?.content?.parts ?? []
      const funcCalls = parts.filter(p => p.functionCall)
      const text = parts.filter(p => p.text).map(p => p.text).join('')

      if (!funcCalls.length) return text

      contents.push({ role: 'model', parts })

      const responseParts: Part[] = []
      for (const part of funcCalls) {
        const fc = part.functionCall!
        const tool = tools.find(t => t.name === fc.name)
        let result: string
        try {
          if (!tool) throw new Error(`Tool "${fc.name}" is not available`)
          const args = (fc.args ?? {}) as Record<string, unknown>
          console.log(`[ToolCall] ${fc.name} ${this.formatLogValue(args)}`)
          result = await tool.execute(args)
          console.log(`[ToolResult] ${fc.name} ok length=${result.length}`)
        }
        catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`
          console.warn(`[ToolResult] ${fc.name} error="${this.escapeLogMessage(result)}"`)
        }
        responseParts.push({ functionResponse: { name: fc.name!, response: { result } } })
      }
      contents.push({ role: 'user', parts: responseParts })
    }

    console.warn(`[LLM] Reached tool-call limit (${maxRounds}); requesting final answer without tools.`)
    const final = await this.genai!.models.generateContent({
      model: this.config.model,
      contents,
      config: systemInstruction ? { systemInstruction } : {},
    })
    return final.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') ?? ''
  }

  private async *chatStreamVertex(
    messages: ChatMessage[],
    tools: LLMTool[],
    options: { maxToolCallRounds?: number; requestApproval?: ToolApprovalCallback },
  ): AsyncGenerator<AgentEvent> {
    const { maxToolCallRounds = MAX_TOOL_CALL_ROUNDS, requestApproval } = options
    const { systemInstruction, contents } = await this.toGenAIContents(messages)
    const genAITools = this.buildGenAITools(tools)

    for (let round = 0; round < maxToolCallRounds; round++) {
      const response = await this.genai!.models.generateContent({
        model: this.config.model,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(genAITools.length ? { tools: genAITools } : {}),
        },
      })

      const parts: Part[] = response.candidates?.[0]?.content?.parts ?? []
      const funcCalls = parts.filter(p => p.functionCall)
      const text = parts.filter(p => p.text).map(p => p.text).join('')

      if (text) {
        for (const segment of this.splitSegments(text)) {
          yield { type: 'text_chunk', content: segment }
        }
      }

      if (!funcCalls.length) {
        yield { type: 'done', content: text }
        return
      }

      contents.push({ role: 'model', parts })

      const responseParts: Part[] = []
      for (const part of funcCalls) {
        const fc = part.functionCall!
        const callId = genCallId()
        const tool = tools.find(t => t.name === fc.name)
        const args = (fc.args ?? {}) as Record<string, unknown>

        yield { type: 'tool_call', callId, name: fc.name!, input: args }

        let result: string
        let ok = true

        try {
          if (!tool) throw new Error(`Tool "${fc.name}" is not available`)

          if (requestApproval) {
            const approved = await requestApproval(callId, fc.name!, args)
            if (!approved) {
              result = 'User denied this tool call.'
              ok = false
              yield { type: 'tool_result', callId, name: fc.name!, result, ok }
              responseParts.push({ functionResponse: { name: fc.name!, response: { result } } })
              continue
            }
          }

          console.log(`[ToolCall] ${fc.name} ${this.formatLogValue(args)}`)
          result = await tool.execute(args)
          console.log(`[ToolResult] ${fc.name} ok length=${result.length}`)
        }
        catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`
          ok = false
          console.warn(`[ToolResult] ${fc.name} error="${this.escapeLogMessage(result)}"`)
        }

        yield { type: 'tool_result', callId, name: fc.name!, result, ok }
        responseParts.push({ functionResponse: { name: fc.name!, response: { result } } })
      }

      contents.push({ role: 'user', parts: responseParts })
    }

    console.warn(`[LLM] Reached tool-call limit (${maxToolCallRounds}); requesting final answer without tools.`)
    const final = await this.genai!.models.generateContent({
      model: this.config.model,
      contents,
      config: systemInstruction ? { systemInstruction } : {},
    })
    const finalText = final.candidates?.[0]?.content?.parts?.filter(p => p.text).map(p => p.text).join('') ?? ''

    if (finalText) {
      for (const segment of this.splitSegments(finalText)) {
        yield { type: 'text_chunk', content: segment }
      }
    }
    yield { type: 'done', content: finalText }
  }

  private toOpenAIMessage(msg: ChatMessage): OpenAI.Chat.ChatCompletionMessageParam {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : msg.content.map(p => p.type === 'text' ? p.text : '').join('')
      return { role: 'system', content: text }
    }
    if (msg.role === 'assistant') {
      const text = typeof msg.content === 'string' ? msg.content : msg.content.map(p => p.type === 'text' ? p.text : '').join('')
      return { role: 'assistant', content: text }
    }
    if (typeof msg.content === 'string') {
      return { role: 'user', content: msg.content }
    }
    return {
      role: 'user',
      content: msg.content.map(p =>
        p.type === 'text'
          ? { type: 'text' as const, text: p.text }
          : { type: 'image_url' as const, image_url: { url: p.image_url.url } },
      ),
    }
  }

  private async toGenAIContents(messages: ChatMessage[]): Promise<{ systemInstruction: string; contents: Content[] }> {
    const systemParts: string[] = []
    const contents: Content[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        const text = typeof msg.content === 'string' ? msg.content : msg.content.map(p => p.type === 'text' ? p.text : '').join('')
        systemParts.push(text)
      }
      else {
        let parts: Part[]
        if (typeof msg.content === 'string') {
          parts = [{ text: msg.content }]
        }
        else {
          parts = await Promise.all(msg.content.map(async (p): Promise<Part> => {
            if (p.type === 'text') return { text: p.text }
            const { data, mimeType } = await this.fetchImageAsInlineData(p.image_url.url)
            return { inlineData: { data, mimeType } }
          }))
        }
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        })
      }
    }

    return { systemInstruction: systemParts.join('\n\n'), contents }
  }

  private async fetchImageAsInlineData(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/jpeg'
    return { data, mimeType }
  }

  private buildGenAITools(tools: LLMTool[]): GenAITool[] {
    if (!tools.length) return []
    return [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      })),
    }]
  }

  // ── OpenAI helpers ────────────────────────────────────────────────────────

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

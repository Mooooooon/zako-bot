import http from 'http'
import { randomUUID } from 'crypto'
import {
  createBot,
  createRole,
  deleteBot,
  deleteRole,
  getBotWithRole,
  getRole,
  listBotsWithRoles,
  listRoles,
  updateBot,
  updateRole,
} from '@zakobot/database'
import type { DB, RoleRow } from '@zakobot/database'
import type { BotManager } from '../bot/bot-manager.js'
import type { PluginLoader } from '../plugins/loader.js'
import type {
  ApiResponse,
  BotEditorInput,
  BotListItem,
  BotProfile,
  ConversationMessage,
  ConversationTopic,
  CreateConversationTopicInput,
  RoleEditorInput,
  RoleProfile,
  SendConversationMessageInput,
  SendConversationMessageResult,
} from '@zakobot/shared'

export class ApiServer {
  private server: http.Server
  private started = false

  constructor(
    private db: DB,
    private botManager: BotManager,
    private pluginLoader: PluginLoader,
  ) {
    this.server = http.createServer((req, res) => {
      void this.handle(req, res)
    })
  }

  async start() {
    const port = Number(process.env.CORE_API_PORT ?? 6325)
    await new Promise<void>((resolve) => this.server.listen(port, '127.0.0.1', resolve))
    this.started = true
    console.log(`[ApiServer] Listening on 127.0.0.1:${port}`)
  }

  async stop() {
    if (!this.started) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })

    this.started = false
    console.log('[ApiServer] Stopped.')
  }

  private json<T>(res: http.ServerResponse, data: ApiResponse<T>, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  private async readJson<T>(req: http.IncomingMessage) {
    const chunks: Buffer[] = []

    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    if (!chunks.length) {
      return {} as T
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
  }

  private toRoleProfile(row: RoleRow): RoleProfile {
    return {
      id: row.id,
      avatar: row.avatar,
      name: row.name,
      systemPrompt: row.systemPrompt,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private toBotProfile(row: NonNullable<ReturnType<typeof getBotWithRole>>): BotProfile {
    return {
      id: row.instance.id,
      name: row.instance.name,
      platform: row.instance.platform,
      token: row.instance.token,
      roleId: row.instance.roleId,
      roleName: row.role.name,
      roleAvatar: row.role.avatar,
      llmProvider: row.instance.llmProvider as 'openai',
      llmPlatformName: row.instance.llmPlatformName,
      llmModel: row.instance.llmModel,
      llmApiKey: row.instance.llmApiKey,
      llmBaseUrl: row.instance.llmBaseUrl,
      discordUserId: row.instance.discordUserId,
      discordGuildId: row.instance.discordGuildId,
      enabled: row.instance.enabled,
      createdAt: row.instance.createdAt.toISOString(),
      updatedAt: row.instance.updatedAt.toISOString(),
    }
  }

  private toBotListItem(row: NonNullable<ReturnType<typeof getBotWithRole>>): BotListItem {
    return {
      id: row.instance.id,
      name: row.instance.name,
      platform: row.instance.platform,
      roleId: row.instance.roleId,
      roleName: row.role.name,
      roleAvatar: row.role.avatar,
      llmPlatformName: row.instance.llmPlatformName,
      llmModel: row.instance.llmModel,
      discordUserId: row.instance.discordUserId,
      discordGuildId: row.instance.discordGuildId,
      enabled: row.instance.enabled,
      createdAt: row.instance.createdAt.toISOString(),
      updatedAt: row.instance.updatedAt.toISOString(),
    }
  }

  private toConversationTopic(row: ReturnType<BotManager['listConversationTopics']>[number]): ConversationTopic {
    return {
      id: row.id,
      botInstanceId: row.botInstanceId,
      platform: row.platform,
      scopeKey: row.scopeKey,
      name: row.name,
      status: row.status,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      metadata: this.parseJsonRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private toConversationMessage(row: ReturnType<BotManager['listConversationMessages']>[number]): ConversationMessage {
    return {
      id: row.id,
      topicId: row.topicId,
      botInstanceId: row.botInstanceId,
      platform: row.platform,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      messageType: row.messageType,
      platformMessageId: row.platformMessageId,
      senderId: row.senderId,
      senderName: row.senderName,
      metadata: this.parseJsonRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }
  }

  private parseRoleInput(body: Partial<RoleEditorInput>) {
    const name = body.name?.trim()
    const systemPrompt = body.systemPrompt?.trim()

    if (!name) {
      throw new Error('Role name is required')
    }

    if (!systemPrompt) {
      throw new Error('Role systemPrompt is required')
    }

    return {
      avatar: body.avatar?.trim() ?? '',
      name,
      systemPrompt,
    }
  }

  private parseBotInput(body: Partial<BotEditorInput>) {
    const name = body.name?.trim()
    const token = body.token?.trim()
    const roleId = body.roleId?.trim()
    const llmPlatformName = body.llmPlatformName?.trim()
    const llmModel = body.llmModel?.trim()
    const llmApiKey = body.llmApiKey?.trim()
    const llmBaseUrl = body.llmBaseUrl?.trim()
    const discordUserId = body.discordUserId?.trim()
    const discordGuildId = body.discordGuildId?.trim()
    const platform = body.platform?.trim()

    if (!name) throw new Error('Bot name is required')
    if (!platform) throw new Error('Bot platform is required')
    if (platform !== 'discord') throw new Error('Only Discord bots are currently supported')
    if (!token) throw new Error('Bot token is required')
    if (!roleId) throw new Error('Role is required')
    if (!llmPlatformName) throw new Error('Model platform is required')
    if (!llmModel) throw new Error('Model is required')
    if (!llmApiKey) throw new Error('Model API key is required')
    if (!llmBaseUrl) throw new Error('Model base URL is required')
    if (!discordUserId) throw new Error('Discord user ID is required')
    if (!discordGuildId) throw new Error('Discord guild ID is required')

    return {
      name,
      platform: 'discord' as const,
      token,
      roleId,
      llmProvider: 'openai' as const,
      llmPlatformName,
      llmModel,
      llmApiKey,
      llmBaseUrl,
      discordUserId,
      discordGuildId,
      enabled: Boolean(body.enabled),
    }
  }

  private parseCreateConversationTopicInput(body: Partial<CreateConversationTopicInput>) {
    const botInstanceId = body.botInstanceId?.trim()

    if (!botInstanceId) {
      throw new Error('Bot instance ID is required')
    }

    return { botInstanceId }
  }

  private parseSendConversationMessageInput(body: Partial<SendConversationMessageInput>) {
    const botInstanceId = body.botInstanceId?.trim()
    const topicId = body.topicId?.trim()
    const content = body.content?.trim()

    if (!botInstanceId) {
      throw new Error('Bot instance ID is required')
    }

    if (!content) {
      throw new Error('Message content is required')
    }

    return {
      botInstanceId,
      topicId: topicId || undefined,
      content,
    }
  }

  private parseJsonRecord(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
    catch {
      return {}
    }
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const { pathname, searchParams } = url

    if (pathname === '/status' && req.method === 'GET') {
      const { botsOnline, instances } = this.botManager.getStatus()
      return this.json(res, {
        ok: true,
        data: {
          uptime: process.uptime(),
          botsOnline,
          botsTotal: instances.length,
          pluginsLoaded: this.pluginLoader.list().length,
        },
      })
    }

    if (pathname === '/plugins' && req.method === 'GET') {
      return this.json(res, { ok: true, data: this.pluginLoader.list() })
    }

    if (pathname === '/roles' && req.method === 'GET') {
      return this.json(res, { ok: true, data: listRoles(this.db).map(row => this.toRoleProfile(row)) })
    }

    if (pathname === '/roles' && req.method === 'POST') {
      try {
        const payload = this.parseRoleInput(await this.readJson<RoleEditorInput>(req))
        const now = new Date()
        const created = createRole(this.db, {
          id: randomUUID(),
          avatar: payload.avatar,
          name: payload.name,
          systemPrompt: payload.systemPrompt,
          llmProvider: 'openai',
          llmModel: '',
          llmApiKey: '',
          llmBaseUrl: null,
          enabledTools: '[]',
          createdAt: now,
          updatedAt: now,
        })

        return this.json(res, { ok: true, data: this.toRoleProfile(created!) }, 201)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body'
        return this.json(res, { ok: false, error: message }, 400)
      }
    }

    if (pathname === '/bots' && req.method === 'GET') {
      return this.json(res, {
        ok: true,
        data: listBotsWithRoles(this.db).map(row => this.toBotListItem(row)),
      })
    }

    if (pathname === '/conversations' && req.method === 'GET') {
      const botInstanceId = searchParams.get('botInstanceId')?.trim()

      if (!botInstanceId) {
        return this.json(res, { ok: false, error: 'Bot instance ID is required' }, 400)
      }

      try {
        const topics = this.botManager
          .listConversationTopics(botInstanceId)
          .map(topic => this.toConversationTopic(topic))

        return this.json(res, { ok: true, data: topics })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load conversation topics'
        const status = message.includes('not found') ? 404 : 400
        return this.json(res, { ok: false, error: message }, status)
      }
    }

    if (pathname === '/conversations' && req.method === 'POST') {
      try {
        const payload = this.parseCreateConversationTopicInput(await this.readJson<CreateConversationTopicInput>(req))
        const topic = this.botManager.startPanelConversation(payload.botInstanceId)
        return this.json(res, { ok: true, data: this.toConversationTopic(topic) }, 201)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create conversation topic'
        const status = message.includes('not found') ? 404 : 400
        return this.json(res, { ok: false, error: message }, status)
      }
    }

    if (pathname === '/conversations/messages' && req.method === 'POST') {
      try {
        const payload = this.parseSendConversationMessageInput(await this.readJson<SendConversationMessageInput>(req))
        const result = await this.botManager.sendPanelMessage(payload.botInstanceId, payload.content, payload.topicId)
        const data: SendConversationMessageResult = {
          topic: this.toConversationTopic(result.topic),
          userMessage: this.toConversationMessage(result.userMessage),
          assistantMessage: this.toConversationMessage(result.assistantMessage),
        }

        return this.json(res, { ok: true, data })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send conversation message'
        const status = message.includes('not found') ? 404 : 400
        return this.json(res, { ok: false, error: message }, status)
      }
    }

    if (pathname === '/bots' && req.method === 'POST') {
      try {
        const payload = this.parseBotInput(await this.readJson<BotEditorInput>(req))

        if (!getRole(this.db, payload.roleId)) {
          return this.json(res, { ok: false, error: 'Role not found' }, 404)
        }

        const now = new Date()
        const created = createBot(this.db, {
          id: randomUUID(),
          name: payload.name,
          platform: payload.platform,
          token: payload.token,
          roleId: payload.roleId,
          llmProvider: payload.llmProvider,
          llmPlatformName: payload.llmPlatformName,
          llmModel: payload.llmModel,
          llmApiKey: payload.llmApiKey,
          llmBaseUrl: payload.llmBaseUrl,
          discordUserId: payload.discordUserId,
          discordGuildId: payload.discordGuildId,
          enabled: payload.enabled,
          createdAt: now,
          updatedAt: now,
        })

        if (!created) {
          throw new Error('Failed to create bot')
        }

        await this.botManager.syncInstance(created.instance.id).catch((error) => {
          console.error(`[ApiServer] Failed to sync bot "${created.instance.name}":`, error)
        })

        return this.json(res, { ok: true, data: this.toBotProfile(created) }, 201)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body'
        return this.json(res, { ok: false, error: message }, 400)
      }
    }

    const roleMatch = pathname.match(/^\/roles\/([^/]+)$/)
    if (roleMatch && req.method === 'GET') {
      const role = getRole(this.db, roleMatch[1])

      if (!role) {
        return this.json(res, { ok: false, error: 'Role not found' }, 404)
      }

      return this.json(res, { ok: true, data: this.toRoleProfile(role) })
    }

    if (roleMatch && req.method === 'PUT') {
      const existing = getRole(this.db, roleMatch[1])

      if (!existing) {
        return this.json(res, { ok: false, error: 'Role not found' }, 404)
      }

      try {
        const payload = this.parseRoleInput(await this.readJson<RoleEditorInput>(req))
        const updated = updateRole(this.db, roleMatch[1], {
          avatar: payload.avatar,
          name: payload.name,
          systemPrompt: payload.systemPrompt,
          updatedAt: new Date(),
        })

        return this.json(res, { ok: true, data: this.toRoleProfile(updated!) })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body'
        return this.json(res, { ok: false, error: message }, 400)
      }
    }

    if (roleMatch && req.method === 'DELETE') {
      const existing = getRole(this.db, roleMatch[1])

      if (!existing) {
        return this.json(res, { ok: false, error: 'Role not found' }, 404)
      }

      try {
        deleteRole(this.db, roleMatch[1])
        return this.json(res, { ok: true, data: this.toRoleProfile(existing) })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete role'
        const status = message.includes('FOREIGN KEY constraint failed') ? 409 : 400
        const userMessage = status === 409 ? 'Role is still used by existing bots' : message
        return this.json(res, { ok: false, error: userMessage }, status)
      }
    }

    const botMatch = pathname.match(/^\/bots\/([^/]+)$/)
    if (botMatch && req.method === 'GET') {
      const bot = getBotWithRole(this.db, botMatch[1])

      if (!bot) {
        return this.json(res, { ok: false, error: 'Bot not found' }, 404)
      }

      return this.json(res, { ok: true, data: this.toBotProfile(bot) })
    }

    if (botMatch && req.method === 'PUT') {
      const existing = getBotWithRole(this.db, botMatch[1])

      if (!existing) {
        return this.json(res, { ok: false, error: 'Bot not found' }, 404)
      }

      try {
        const payload = this.parseBotInput(await this.readJson<BotEditorInput>(req))

        if (!getRole(this.db, payload.roleId)) {
          return this.json(res, { ok: false, error: 'Role not found' }, 404)
        }

        const updated = updateBot(this.db, botMatch[1], {
          name: payload.name,
          platform: payload.platform,
          token: payload.token,
          roleId: payload.roleId,
          llmProvider: payload.llmProvider,
          llmPlatformName: payload.llmPlatformName,
          llmModel: payload.llmModel,
          llmApiKey: payload.llmApiKey,
          llmBaseUrl: payload.llmBaseUrl,
          discordUserId: payload.discordUserId,
          discordGuildId: payload.discordGuildId,
          enabled: payload.enabled,
          updatedAt: new Date(),
        })

        if (!updated) {
          throw new Error('Failed to update bot')
        }

        await this.botManager.syncInstance(updated.instance.id).catch((error) => {
          console.error(`[ApiServer] Failed to sync bot "${updated.instance.name}":`, error)
        })

        return this.json(res, { ok: true, data: this.toBotProfile(updated) })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request body'
        return this.json(res, { ok: false, error: message }, 400)
      }
    }

    if (botMatch && req.method === 'DELETE') {
      const existing = getBotWithRole(this.db, botMatch[1])

      if (!existing) {
        return this.json(res, { ok: false, error: 'Bot not found' }, 404)
      }

      try {
        await this.botManager.stopOne(botMatch[1])
        deleteBot(this.db, botMatch[1])
        return this.json(res, { ok: true, data: this.toBotProfile(existing) })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete bot'
        return this.json(res, { ok: false, error: message }, 400)
      }
    }

    const conversationMessagesMatch = pathname.match(/^\/conversations\/([^/]+)\/messages$/)
    if (conversationMessagesMatch && req.method === 'GET') {
      const botInstanceId = searchParams.get('botInstanceId')?.trim()

      if (!botInstanceId) {
        return this.json(res, { ok: false, error: 'Bot instance ID is required' }, 400)
      }

      try {
        const messages = this.botManager
          .listConversationMessages(botInstanceId, conversationMessagesMatch[1])
          .map(message => this.toConversationMessage(message))

        return this.json(res, { ok: true, data: messages })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load conversation messages'
        const status = message.includes('not found') ? 404 : 400
        return this.json(res, { ok: false, error: message }, status)
      }
    }

    return this.json(res, { ok: false, error: 'Not found' }, 404)
  }
}

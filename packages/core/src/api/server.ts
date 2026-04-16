import http from 'http'
import { randomUUID } from 'crypto'
import { createRole, getRole, listRoles, updateRole } from '@zakobot/database'
import type { DB, RoleRow } from '@zakobot/database'
import type { BotManager } from '../bot/bot-manager.js'
import type { PluginLoader } from '../plugins/loader.js'
import type { ApiResponse, RoleEditorInput, RoleProfile } from '@zakobot/shared'

export class ApiServer {
  private server: http.Server

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
    const port = Number(process.env.CORE_API_PORT ?? 3001)
    await new Promise<void>((resolve) => this.server.listen(port, '127.0.0.1', resolve))
    console.log(`[ApiServer] Listening on 127.0.0.1:${port}`)
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

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const { pathname } = new URL(req.url ?? '/', 'http://127.0.0.1')

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

    return this.json(res, { ok: false, error: 'Not found' }, 404)
  }
}

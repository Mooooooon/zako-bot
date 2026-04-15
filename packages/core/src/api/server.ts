import http from 'http'
import type { DB } from '@zakobot/database'
import type { BotManager } from '../bot/bot-manager.js'
import type { PluginLoader } from '../plugins/loader.js'
import type { ApiResponse } from '@zakobot/shared'

export class ApiServer {
  private server: http.Server

  constructor(
    private db: DB,
    private botManager: BotManager,
    private pluginLoader: PluginLoader,
  ) {
    this.server = http.createServer((req, res) => this.handle(req, res))
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

  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url ?? '/'

    if (url === '/status' && req.method === 'GET') {
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

    if (url === '/plugins' && req.method === 'GET') {
      return this.json(res, { ok: true, data: this.pluginLoader.list() })
    }

    this.json(res, { ok: false, error: 'Not found' }, 404)
  }
}

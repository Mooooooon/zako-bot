import 'dotenv/config'
import { resolve } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { createDb } from '@zakobot/database'
import { BotManager } from './bot/bot-manager.js'
import { PluginLoader } from './plugins/loader.js'
import { ApiServer } from './api/server.js'
import { seed } from './seed.js'

const zakobotHome = process.env.ZAKOBOT_HOME ?? resolve(homedir(), '.zakobot')
mkdirSync(zakobotHome, { recursive: true })

const dbUrl = process.env.DATABASE_URL ?? resolve(zakobotHome, 'data.db')
const db = createDb(dbUrl)

let shuttingDown = false

async function main() {
  seed(db)

  const botManager = new BotManager(db)
  const pluginLoader = new PluginLoader(botManager)
  const apiServer = new ApiServer(db, botManager, pluginLoader)

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    console.log(`[Core] Received ${signal}, shutting down...`)

    const tasks = [
      apiServer.stop(),
      pluginLoader.unloadAll(),
      botManager.stopAll(),
    ]

    const results = await Promise.allSettled(tasks)
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[Core] Shutdown step failed:', result.reason)
      }
    }

    process.exit(0)
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  await pluginLoader.loadAll()
  await botManager.startAll()
  await apiServer.start()
}

main().catch(console.error)

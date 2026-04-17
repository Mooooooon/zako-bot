import 'dotenv/config'
import { resolve } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { createDb } from '@zakobot/database'
import { BotManager } from './bot/bot-manager.js'
import { PluginLoader } from './plugins/loader.js'
import { ApiServer } from './api/server.js'
import { seed } from './seed.js'
import { createDefaultToolRegistry } from './tools/index.js'
import { getSearchSettings } from './settings/search-settings.js'
import { getBrowseSettings } from './settings/browse-settings.js'
import { getGeneralSettings } from './settings/general-settings.js'

const zakobotHome = process.env.ZAKOBOT_HOME ?? resolve(homedir(), '.zakobot')
mkdirSync(zakobotHome, { recursive: true })

const dbUrl = process.env.DATABASE_URL ?? resolve(zakobotHome, 'data.db')
const db = createDb(dbUrl)

let shuttingDown = false

async function main() {
  seed(db)

  const toolRegistry = createDefaultToolRegistry(
    () => getSearchSettings(db),
    () => getBrowseSettings(db),
  )
  const botManager = new BotManager(db, toolRegistry, () => getGeneralSettings(db))
  const pluginLoader = new PluginLoader(botManager, toolRegistry)
  const apiServer = new ApiServer(db, botManager, pluginLoader)

  const stopServices = async () => {
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
  }

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    console.log(`[Core] Received ${signal}, shutting down...`)

    await stopServices()
    process.exit(0)
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })

  try {
    await apiServer.start()
    await pluginLoader.loadAll()
    await botManager.startAll()
  } catch (error) {
    await stopServices()
    throw error
  }
}

main().catch((error) => {
  console.error('[Core] Fatal error:', error)
  process.exit(1)
})

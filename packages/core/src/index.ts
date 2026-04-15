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

async function main() {
  seed(db)

  const botManager = new BotManager(db)
  const pluginLoader = new PluginLoader(botManager)
  const apiServer = new ApiServer(db, botManager, pluginLoader)

  await pluginLoader.loadAll()
  await botManager.startAll()
  await apiServer.start()
}

main().catch(console.error)

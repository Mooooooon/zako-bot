import type { DB, BotInstanceRow, RoleRow } from '@zakobot/database'
import { getEnabledBots, getBotWithRole } from '@zakobot/database'
import { DiscordAdapter } from './discord-adapter.js'
import { Agent } from '../llm/agent.js'
import { ConversationStore } from '../llm/conversation-store.js'

export class BotManager {
  private adapters = new Map<string, DiscordAdapter>()
  private store = new ConversationStore()

  constructor(private db: DB) {}

  async startAll() {
    const rows = getEnabledBots(this.db)
    for (const row of rows) {
      await this.startInstance(row).catch((err) =>
        console.error(`[BotManager] Failed to start "${row.instance.name}":`, err),
      )
    }
    console.log(`[BotManager] ${this.adapters.size} bot(s) online.`)
  }

  async startOne(instanceId: string) {
    const row = getBotWithRole(this.db, instanceId)
    if (!row) throw new Error(`Bot instance "${instanceId}" not found`)
    await this.startInstance(row)
  }

  private async startInstance(row: { instance: BotInstanceRow; role: RoleRow }) {
    if (row.instance.platform !== 'discord') {
      console.warn(`[BotManager] Platform "${row.instance.platform}" not yet supported, skipping.`)
      return
    }

    const agent = new Agent(row.role, this.store)
    const adapter = new DiscordAdapter(row.instance, row.role, agent)

    await adapter.start()
    this.adapters.set(row.instance.id, adapter)
  }

  async stopOne(instanceId: string) {
    const adapter = this.adapters.get(instanceId)
    if (!adapter) return
    await adapter.stop()
    this.adapters.delete(instanceId)
  }

  async sendMessage(instanceId: string, channelId: string, content: string) {
    const adapter = this.adapters.get(instanceId)
    if (!adapter) throw new Error(`Bot instance "${instanceId}" is not running`)
    await adapter.sendMessage(channelId, content)
  }

  getStatus() {
    return {
      botsOnline: this.adapters.size,
      instances: [...this.adapters.entries()].map(([id, a]) => ({
        id,
        name: a.instance.name,
        platform: a.instance.platform,
      })),
    }
  }
}

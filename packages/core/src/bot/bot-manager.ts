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

  async syncInstance(instanceId: string) {
    const row = getBotWithRole(this.db, instanceId)

    if (!row || !row.instance.enabled) {
      await this.stopOne(instanceId)
      return
    }

    if (this.adapters.has(instanceId)) {
      await this.stopOne(instanceId)
    }

    await this.startInstance(row)
  }

  private async startInstance(row: { instance: BotInstanceRow; role: RoleRow }) {
    if (row.instance.platform !== 'discord') {
      console.warn(`[BotManager] Platform "${row.instance.platform}" not yet supported, skipping.`)
      return
    }

    if (!row.instance.llmModel || !row.instance.llmApiKey || !row.instance.llmBaseUrl) {
      throw new Error(`Bot "${row.instance.name}" is missing LLM configuration`)
    }

    if (this.adapters.has(row.instance.id)) {
      await this.stopOne(row.instance.id)
    }

    const agent = new Agent(row.role, {
      provider: row.instance.llmProvider as 'openai',
      model: row.instance.llmModel,
      apiKey: row.instance.llmApiKey,
      baseUrl: row.instance.llmBaseUrl,
    }, this.store)
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

  async stopAll() {
    const instanceIds = [...this.adapters.keys()]

    for (const instanceId of instanceIds) {
      await this.stopOne(instanceId)
    }
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

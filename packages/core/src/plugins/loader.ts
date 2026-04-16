import { readdir } from 'fs/promises'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { Plugin, PluginContext } from '@zakobot/shared'
import type { BotManager } from '../bot/bot-manager.js'
import { SchedulerService } from './scheduler.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export class PluginLoader {
  private plugins = new Map<string, Plugin>()
  private scheduler = new SchedulerService()

  constructor(private botManager: BotManager) {}

  private buildContext(pluginName: string): PluginContext {
    return {
      sendMessage: (channelId, content) => {
        // Broadcast via first available online bot
        const status = this.botManager.getStatus()
        if (status.instances.length === 0) throw new Error('No bot instances online')
        return this.botManager.sendMessage(status.instances[0].id, channelId, content)
      },
      schedule: (cronExpr, fn) => this.scheduler.register(pluginName, cronExpr, fn),
      getConfig: (_key) => undefined, // TODO: wire up database config
    }
  }

  async loadAll() {
    const pluginsDir = resolve(__dirname, '../../../../plugins')
    let entries: string[]

    try {
      entries = await readdir(pluginsDir)
    } catch {
      console.log('[PluginLoader] No plugins directory found, skipping.')
      return
    }

    for (const entry of entries) {
      await this.load(join(pluginsDir, entry)).catch((err) =>
        console.error(`[PluginLoader] Failed to load ${entry}:`, err),
      )
    }
  }

  async load(pluginPath: string) {
    const mod = await import(pluginPath)
    const plugin: Plugin = mod.default ?? mod

    if (!plugin?.meta?.name) throw new Error(`Invalid plugin at ${pluginPath}`)

    const ctx = this.buildContext(plugin.meta.name)
    await plugin.onLoad(ctx)
    this.plugins.set(plugin.meta.name, plugin)
    console.log(`[PluginLoader] Loaded: ${plugin.meta.name} v${plugin.meta.version}`)
  }

  async unload(name: string) {
    const plugin = this.plugins.get(name)
    if (!plugin) return
    await plugin.onUnload?.()
    this.scheduler.unregisterAll(name)
    this.plugins.delete(name)
    console.log(`[PluginLoader] Unloaded: ${name}`)
  }

  async unloadAll() {
    const pluginNames = [...this.plugins.keys()]

    for (const name of pluginNames) {
      await this.unload(name)
    }
  }

  list() {
    return [...this.plugins.values()].map((p) => ({
      name: p.meta.name,
      version: p.meta.version,
      description: p.meta.description,
      enabled: true,
    }))
  }
}

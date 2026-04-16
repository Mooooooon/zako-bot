import { Client, GatewayIntentBits } from 'discord.js'
import type { BotInstanceRow, RoleRow } from '@zakobot/database'
import type { Agent } from '../llm/agent.js'

export class DiscordAdapter {
  readonly client: Client

  constructor(
    readonly instance: BotInstanceRow,
    readonly role: RoleRow,
    private agent: Agent,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })

    this.client.once('clientReady', (c) => {
      console.log(`[Discord] "${instance.name}" logged in as ${c.user.tag}`)
    })

    this.client.on('messageCreate', (msg) => this.handleMessage(msg))
  }

  private async handleMessage(msg: import('discord.js').Message) {
    if (msg.author.bot) return

    if (this.instance.discordUserId && msg.author.id !== this.instance.discordUserId) return
    if (this.instance.discordGuildId && msg.guildId !== this.instance.discordGuildId) return

    const isMentioned = this.client.user && msg.mentions.has(this.client.user)

    if (this.instance.requireMention && !isMentioned) return

    // Strip the @mention prefix from the message
    const userText = msg.content
      .replace(/<@!?\d+>/g, '')
      .trim()

    if (!userText) return

    // PartialGroupDMChannel doesn't support sending — guard against it
    if (!('send' in msg.channel)) return

    try {
      await msg.channel.sendTyping()
      const reply = await this.agent.respond(this.instance.id, msg.channelId, userText)

      // Discord has a 2000 char limit per message
      if (reply.length <= 2000) {
        await msg.reply(reply)
      } else {
        for (let i = 0; i < reply.length; i += 2000) {
          await msg.channel.send(reply.slice(i, i + 2000))
        }
      }
    } catch (err) {
      console.error(`[Discord] Agent error in "${this.instance.name}":`, err)
      await msg.reply('Something went wrong, please try again.').catch(() => {})
    }
  }

  async start() {
    await this.client.login(this.instance.token)
  }

  async stop() {
    this.client.destroy()
    console.log(`[Discord] "${this.instance.name}" disconnected.`)
  }

  async sendMessage(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId)
    if (!channel?.isTextBased() || !('send' in channel)) {
      throw new Error(`Channel ${channelId} is not a sendable text channel`)
    }
    await channel.send(content)
  }
}

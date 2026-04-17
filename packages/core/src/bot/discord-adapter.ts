import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js'
import type { Message, TextBasedChannel } from 'discord.js'
import type { BotInstanceRow, RoleRow } from '@zakobot/database'
import type { AgentEvent, GeneralSettings, ToolApprovalCallback } from '@zakobot/shared'
import type { Agent } from '../llm/agent.js'
import type { ConversationScope, ConversationService } from '../llm/conversation-service.js'

const TOOL_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000

type MsgPayload = {
  content: string
  components?: ActionRowBuilder<ButtonBuilder>[]
}

const NEW_TOPIC_COMMAND = {
  name: 'new',
  description: '开启新话题',
}

export class DiscordAdapter {
  readonly client: Client
  private pendingApprovals = new Map<string, (approved: boolean) => void>()

  constructor(
    readonly instance: BotInstanceRow,
    readonly role: RoleRow,
    private agent: Agent,
    private conversations: ConversationService,
    private getGeneralSettings: () => GeneralSettings,
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
      void this.registerCommands().catch((err) => {
        console.error(`[Discord] Failed to register commands for "${instance.name}":`, err)
      })
    })

    this.client.on('messageCreate', (msg) => this.handleMessage(msg))
    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction))
  }

  private async handleMessage(msg: Message) {
    if (msg.author.bot) return

    if (this.instance.discordUserId && msg.author.id !== this.instance.discordUserId) return
    if (this.instance.discordGuildId && msg.guildId !== this.instance.discordGuildId) return

    const isMentioned = this.client.user && msg.mentions.has(this.client.user)
    const { requireMention, threadMode } = this.getGeneralSettings()

    if (requireMention && !isMentioned) return

    const userText = msg.content.replace(/<@!?\d+>/g, '').trim()
    const imageUrls = [...msg.attachments.values()]
      .filter(a => a.contentType?.startsWith('image/') ?? false)
      .map(a => a.url)

    if (!userText && imageUrls.length === 0) return

    if (!('send' in msg.channel)) return

    let anySentToUser = false

    try {
      if (userText === '/new') {
        const topic = this.startNewTopic(this.buildChannelScope(msg.channelId, msg.guildId))
        await msg.reply(`已开启新话题：${topic.name}`)
        return
      }

      if (threadMode && !msg.channel.isThread() && msg.inGuild()) {
        const threadName = (userText.replace(/<a?:\w+:\d+>/g, '').trim() || userText).slice(0, 100)
        const thread = await msg.startThread({ name: threadName })
        const { maxThreadsPerChannel } = this.getGeneralSettings()
        if (maxThreadsPerChannel > 0) {
          await this.pruneOldThreads(msg.channel, maxThreadsPerChannel)
        }
        const scope = this.buildChannelScope(thread.id, msg.guildId)
        const topic = this.conversations.getOrCreateActiveTopic(this.instance, scope)
        this.conversations.appendMessage(this.instance, topic.id, scope, {
          role: 'user',
          content: userText,
          platformMessageId: msg.id,
          senderId: msg.author.id,
          senderName: msg.author.username,
          metadata: { mentionCount: msg.mentions.users.size, imageUrls },
        })
        await thread.sendTyping()
        const send = (payload: MsgPayload) => thread.send(payload).then((m) => { anySentToUser = true; return m })
        const fullReply = await this.runStream(topic.id, send)
        this.conversations.appendMessage(this.instance, topic.id, scope, {
          role: 'assistant',
          content: fullReply,
          senderId: this.client.user?.id ?? '',
          senderName: this.client.user?.username ?? this.instance.name,
        })
        return
      }

      const scope = this.buildChannelScope(msg.channelId, msg.guildId)
      const topic = this.conversations.getOrCreateActiveTopic(this.instance, scope)
      this.conversations.appendMessage(this.instance, topic.id, scope, {
        role: 'user',
        content: userText,
        platformMessageId: msg.id,
        senderId: msg.author.id,
        senderName: msg.author.username,
        metadata: { mentionCount: msg.mentions.users.size, imageUrls },
      })

      await msg.channel.sendTyping()
      let firstSent = false
      const send = (payload: MsgPayload): Promise<Message> => {
        const p = firstSent
          ? (msg.channel as TextBasedChannel & { send: (p: MsgPayload) => Promise<Message> }).send(payload)
          : msg.reply(payload)
        firstSent = true
        return p.then((m) => { anySentToUser = true; return m })
      }
      const fullReply = await this.runStream(topic.id, send)
      this.conversations.appendMessage(this.instance, topic.id, scope, {
        role: 'assistant',
        content: fullReply,
        senderId: this.client.user?.id ?? '',
        senderName: this.client.user?.username ?? this.instance.name,
      })
    }
    catch (err) {
      console.error(`[Discord] Agent error in "${this.instance.name}":`, err)
      if (!anySentToUser) {
        await msg.reply('Something went wrong, please try again.').catch(() => {})
      }
    }
  }

  private async runStream(
    topicId: string,
    send: (payload: MsgPayload) => Promise<Message>,
  ): Promise<string> {
    const { toolApprovalMode, toolProcessMode } = this.getGeneralSettings()

    let requestApproval: ToolApprovalCallback | undefined

    if (toolApprovalMode !== 'none') {
      requestApproval = async (callId, name, input) => {
        if (toolApprovalMode === 'sensitive' && !this.agent.isToolSensitive(name)) {
          return true
        }

        const inputStr = JSON.stringify(input, null, 2)
        const display = inputStr.length > 800 ? `${inputStr.slice(0, 800)}\n...` : inputStr
        const content = `🔧 **调用工具：${name}**\n\`\`\`json\n${display}\n\`\`\``

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`tool_approve:${callId}`)
            .setLabel('允许')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`tool_deny:${callId}`)
            .setLabel('拒绝')
            .setStyle(ButtonStyle.Danger),
        )

        const approvalMsg = await send({ content, components: [row] })

        return new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => {
            this.pendingApprovals.delete(callId)
            resolve(false)
            void approvalMsg.edit({
              content: content.replace(/^🔧 \*\*/, '⏰ **') + '\n— 超时已自动拒绝',
              components: [],
            }).catch(() => {})
          }, TOOL_APPROVAL_TIMEOUT_MS)

          this.pendingApprovals.set(callId, (approved) => {
            clearTimeout(timer)
            this.pendingApprovals.delete(callId)
            resolve(approved)
          })
        })
      }
    }

    let fullContent = ''
    let anySent = false

    for await (const event of this.agent.respondStream(topicId, requestApproval)) {
      switch (event.type) {
        case 'text_chunk':
          if (event.content.trim()) {
            await send({ content: event.content })
            anySent = true
          }
          break
        case 'tool_call': {
          if (toolProcessMode === 'none') break
          // Only send a brief notification when no approval dialog will cover it
          const approvalWillShow = toolApprovalMode !== 'none'
            && !(toolApprovalMode === 'sensitive' && !this.agent.isToolSensitive(event.name))
          if (!approvalWillShow) {
            await send({ content: `🔧 **调用工具：${event.name}**` })
            anySent = true
          }
          break
        }
        case 'tool_result':
          if (toolProcessMode === 'full') {
            await send({ content: this.formatToolResult(event) })
            anySent = true
          }
          break
        case 'done':
          fullContent = event.content
          break
      }
    }

    if (!anySent) {
      await send({ content: '（无回复）' })
    }

    return fullContent
  }

  private formatToolResult(event: Extract<AgentEvent, { type: 'tool_result' }>): string {
    if (!event.ok) {
      return event.result === 'User denied this tool call.'
        ? `❌ **${event.name}** — 已拒绝`
        : `⚠️ **${event.name}** — ${event.result.slice(0, 300)}`
    }
    if (!event.result.trim()) return `✅ **${event.name}** — 完成`
    const display = event.result.length > 800
      ? `${event.result.slice(0, 800)}\n...（共 ${event.result.length} 字符）`
      : event.result
    return `✅ **${event.name}**\n\`\`\`\n${display}\n\`\`\``
  }

  private async handleInteraction(interaction: import('discord.js').Interaction) {
    if (interaction.isButton()) {
      const [action, callId] = interaction.customId.split(':')
      if ((action === 'tool_approve' || action === 'tool_deny') && callId) {
        const resolver = this.pendingApprovals.get(callId)
        const approved = action === 'tool_approve'
        if (resolver) {
          const updatedContent = interaction.message.content.replace(
            /^🔧 \*\*/,
            approved ? '✅ **' : '❌ **',
          )
          await interaction.update({ content: updatedContent, components: [] }).catch(() => {})
          resolver(approved)
        }
        else {
          await interaction.reply({ content: '此操作已过期。', ephemeral: true }).catch(() => {})
        }
        return
      }
    }

    if (!interaction.isChatInputCommand()) return
    if (interaction.commandName !== NEW_TOPIC_COMMAND.name) return

    try {
      if (this.instance.discordUserId && interaction.user.id !== this.instance.discordUserId) {
        await interaction.reply({
          content: '只有已配置的 Discord 用户可以使用此命令。',
          ephemeral: true,
        })
        return
      }

      if (this.instance.discordGuildId && interaction.guildId !== this.instance.discordGuildId) {
        await interaction.reply({
          content: '此命令只能在已配置的 Discord 服务器中使用。',
          ephemeral: true,
        })
        return
      }

      const topic = this.startNewTopic(
        this.buildChannelScope(interaction.channelId, interaction.guildId),
      )

      await interaction.reply(`已开启新话题：${topic.name}`)
    } catch (err) {
      console.error(`[Discord] Command error in "${this.instance.name}":`, err)

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '开启新话题失败，请稍后重试。',
          ephemeral: true,
        }).catch(() => {})
        return
      }

      await interaction.reply({
        content: '开启新话题失败，请稍后重试。',
        ephemeral: true,
      }).catch(() => {})
    }
  }

  private async registerCommands() {
    const application = this.client.application
    if (!application) throw new Error('Discord application is not ready')

    if (this.instance.discordGuildId) {
      const guild = await this.client.guilds.fetch(this.instance.discordGuildId)
      const existing = (await guild.commands.fetch()).find(command =>
        command.name === NEW_TOPIC_COMMAND.name,
      )

      if (existing) {
        await existing.edit(NEW_TOPIC_COMMAND)
      } else {
        await guild.commands.create(NEW_TOPIC_COMMAND)
      }

      console.log(`[Discord] Registered /${NEW_TOPIC_COMMAND.name} for guild ${guild.id}`)
      return
    }

    const existing = (await application.commands.fetch()).find(command =>
      command.name === NEW_TOPIC_COMMAND.name,
    )

    if (existing) {
      await existing.edit(NEW_TOPIC_COMMAND)
    } else {
      await application.commands.create(NEW_TOPIC_COMMAND)
    }

    console.log(`[Discord] Registered global /${NEW_TOPIC_COMMAND.name}`)
  }

  private async pruneOldThreads(channel: Message['channel'], maxCount: number) {
    if (!this.client.user || !('threads' in channel)) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { threads } = await (channel as any).threads.fetchActive() as { threads: import('discord.js').Collection<string, import('discord.js').ThreadChannel> }
      const botId = this.client.user.id
      const botThreads = [...threads.values()]
        .filter(t => t.ownerId === botId)
        .sort((a, b) => (a.createdTimestamp ?? 0) - (b.createdTimestamp ?? 0))
      const excess = botThreads.length - maxCount
      if (excess <= 0) return
      await Promise.all(botThreads.slice(0, excess).map(t => t.delete().catch(() => {})))
    }
    catch {
      // 忽略权限不足等错误
    }
  }

  private startNewTopic(scope: ConversationScope) {
    return this.conversations.startNewTopic(this.instance, scope)
  }

  private buildChannelScope(channelId: string, guildId: string | null): ConversationScope {
    return {
      platform: this.instance.platform,
      scopeKey: `discord:${channelId}`,
      sourceType: 'discord_channel',
      sourceId: channelId,
      metadata: {
        channelId,
        guildId: guildId ?? '',
      },
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

export type Platform = 'discord' | 'qq'

export interface BotEditorInput {
  name: string
  platform: Platform
  token: string
  roleId: string
  llmProvider: 'openai'
  llmPlatformName: string
  llmModel: string
  llmApiKey: string
  llmBaseUrl: string
  discordUserId: string
  discordGuildId: string
  enabled: boolean
}

export interface BotProfile extends BotEditorInput {
  id: string
  roleName: string
  createdAt: string
  updatedAt: string
}

export interface BotListItem {
  id: string
  name: string
  platform: Platform
  roleId: string
  roleName: string
  llmPlatformName: string
  llmModel: string
  discordUserId: string
  discordGuildId: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

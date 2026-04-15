export type Platform = 'discord' | 'qq'

export interface BotInstance {
  id: string
  name: string
  platform: Platform
  token: string
  /** ID of the Role this bot is bound to */
  roleId: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

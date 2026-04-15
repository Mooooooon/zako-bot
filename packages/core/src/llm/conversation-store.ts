import type { ChatMessage } from '@zakobot/shared'

const MAX_HISTORY = 40 // max messages kept per conversation

export class ConversationStore {
  private histories = new Map<string, ChatMessage[]>()

  private key(botInstanceId: string, channelId: string) {
    return `${botInstanceId}:${channelId}`
  }

  get(botInstanceId: string, channelId: string): ChatMessage[] {
    return this.histories.get(this.key(botInstanceId, channelId)) ?? []
  }

  push(botInstanceId: string, channelId: string, message: ChatMessage) {
    const key = this.key(botInstanceId, channelId)
    const history = this.histories.get(key) ?? []
    history.push(message)

    // Trim to keep context window manageable
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY)
    }

    this.histories.set(key, history)
  }

  clear(botInstanceId: string, channelId: string) {
    this.histories.delete(this.key(botInstanceId, channelId))
  }
}

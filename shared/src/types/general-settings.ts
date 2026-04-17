export type ToolApprovalMode = 'all' | 'sensitive' | 'none'
export type ToolProcessMode = 'none' | 'tools_only' | 'full'

export interface GeneralSettings {
  maxToolCallRounds: number
  requireMention: boolean
  threadMode: boolean
  maxThreadsPerChannel: number
  sendTime: boolean
  timezone: string
  toolApprovalMode: ToolApprovalMode
  toolProcessMode: ToolProcessMode
}

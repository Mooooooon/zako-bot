// Internal HTTP API types shared between core and panel-backend

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface PluginInfo {
  name: string
  version: string
  description: string
  enabled: boolean
}

export interface CoreStatus {
  uptime: number
  botsOnline: number
  botsTotal: number
  pluginsLoaded: number
}

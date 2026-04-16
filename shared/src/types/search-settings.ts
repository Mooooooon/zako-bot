export type SearchProvider = 'tavily' | 'google_web'

export interface SearchSettings {
  provider: SearchProvider
  tavilyApiKey: string
}

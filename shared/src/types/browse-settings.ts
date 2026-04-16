export type BrowseProvider = 'fetch' | 'jina'

export type JinaEngine = 'browser' | 'direct' | 'cf-browser-rendering'

export type JinaRetainImages = 'all' | 'none' | 'alt' | 'all_p' | 'alt_p'

export interface BrowseSettings {
  provider: BrowseProvider
  jinaApiKey: string
  jinaEngine: JinaEngine
  jinaRetainImages: JinaRetainImages
  jinaTokenBudgetEnabled: boolean
  jinaTokenBudget: number
}

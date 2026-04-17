export type ApiFormat = 'openai' | 'google' | 'vertex'

export interface ModelPlatform {
  id: string
  name: string
  format: ApiFormat
  baseUrl: string
  defaultBaseUrl: string
  apiKey: string
  enabled: boolean
  enabledModels: string[]
  disabledModels: string[]
  region?: string
  builtin?: boolean
}

const STORAGE_KEY = 'zakobot-model-platforms'

const BUILT_IN_PLATFORMS: Omit<ModelPlatform, 'apiKey' | 'enabled' | 'enabledModels' | 'disabledModels'>[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    format: 'openai',
    baseUrl: 'https://api.openai.com',
    defaultBaseUrl: 'https://api.openai.com',
    builtin: true,
  },
  {
    id: 'google',
    name: 'Google AI Studio',
    format: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    builtin: true,
  },
  {
    id: 'vertex',
    name: 'Google Vertex AI',
    format: 'vertex',
    baseUrl: 'https://aiplatform.googleapis.com',
    defaultBaseUrl: 'https://aiplatform.googleapis.com',
    builtin: true,
  },
]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createDefault(): ModelPlatform[] {
  return BUILT_IN_PLATFORMS.map(b => ({
    ...b,
    apiKey: '',
    enabled: false,
    enabledModels: [],
    disabledModels: [],
  }))
}

function loadPlatforms(): ModelPlatform[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefault()
    const stored = JSON.parse(raw) as Partial<ModelPlatform>[]

    const builtin = BUILT_IN_PLATFORMS.map((b) => {
      const existing = stored.find(s => s.id === b.id)
      if (!existing) {
        return { ...b, apiKey: '', enabled: false, enabledModels: [], disabledModels: [] }
      }
      return {
        ...b,
        baseUrl: existing.baseUrl ?? b.baseUrl,
        apiKey: existing.apiKey ?? '',
        enabled: existing.enabled ?? false,
        enabledModels: existing.enabledModels ?? [],
        disabledModels: existing.disabledModels ?? [],
        region: existing.region,
      }
    })

    const custom = stored
      .filter(s => !BUILT_IN_PLATFORMS.some(b => b.id === s.id))
      .map(s => ({
        id: s.id ?? generateId(),
        name: s.name ?? '',
        format: s.format ?? 'openai',
        baseUrl: s.baseUrl ?? '',
        defaultBaseUrl: s.defaultBaseUrl ?? '',
        apiKey: s.apiKey ?? '',
        enabled: s.enabled ?? false,
        enabledModels: s.enabledModels ?? [],
        disabledModels: s.disabledModels ?? [],
        region: s.region,
        builtin: false,
      }))

    return [...builtin, ...custom]
  }
  catch {
    return createDefault()
  }
}

function savePlatforms(platforms: ModelPlatform[]) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms))
}

export function useModelPlatforms() {
  const platforms = ref<ModelPlatform[]>([])

  onMounted(() => {
    platforms.value = loadPlatforms()
  })

  function addPlatform(name: string, format: ApiFormat): ModelPlatform {
    const platform: ModelPlatform = {
      id: generateId(),
      name,
      format,
      baseUrl: '',
      defaultBaseUrl: '',
      apiKey: '',
      enabled: false,
      enabledModels: [],
      disabledModels: [],
      builtin: false,
    }
    platforms.value.push(platform)
    savePlatforms(platforms.value)
    return platform
  }

  function updatePlatform(id: string, patch: Partial<Omit<ModelPlatform, 'id'>>) {
    const idx = platforms.value.findIndex(p => p.id === id)
    if (idx === -1) return
    const platform = platforms.value[idx]
    if (!platform) return
    Object.assign(platform, patch)
    savePlatforms(platforms.value)
  }

  function removePlatform(id: string) {
    const platform = platforms.value.find(p => p.id === id)
    if (platform?.builtin) return
    platforms.value = platforms.value.filter(p => p.id !== id)
    savePlatforms(platforms.value)
  }

  function togglePlatformEnabled(id: string) {
    const platform = platforms.value.find(p => p.id === id)
    if (!platform) return
    platform.enabled = !platform.enabled
    savePlatforms(platforms.value)
  }

  function enableModel(platformId: string, model: string) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform) return
    platform.disabledModels = platform.disabledModels.filter(m => m !== model)
    if (!platform.enabledModels.includes(model)) {
      platform.enabledModels.push(model)
    }
    savePlatforms(platforms.value)
  }

  function disableModel(platformId: string, model: string) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform) return
    platform.enabledModels = platform.enabledModels.filter(m => m !== model)
    if (!platform.disabledModels.includes(model)) {
      platform.disabledModels.push(model)
    }
    savePlatforms(platforms.value)
  }

  function addCustomModel(platformId: string, model: string) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform) return
    if (!platform.enabledModels.includes(model) && !platform.disabledModels.includes(model)) {
      platform.enabledModels.push(model)
    }
    savePlatforms(platforms.value)
  }

  function removeModel(platformId: string, model: string) {
    const platform = platforms.value.find(p => p.id === platformId)
    if (!platform) return
    platform.enabledModels = platform.enabledModels.filter(m => m !== model)
    platform.disabledModels = platform.disabledModels.filter(m => m !== model)
    savePlatforms(platforms.value)
  }

  async function fetchModels(id: string): Promise<string[]> {
    const platform = platforms.value.find(p => p.id === id)
    if (!platform) throw new Error('未找到对应平台')
    if (platform.format === 'vertex') throw new Error('Vertex AI 不支持拉取模型列表')

    const res = await $fetch<{ models: string[] }>('/api/models/fetch', {
      method: 'POST',
      body: {
        baseUrl: platform.baseUrl,
        apiKey: platform.apiKey,
        format: platform.format,
      },
    })

    const allKnown = new Set([...platform.enabledModels, ...platform.disabledModels])
    for (const model of res.models) {
      if (!allKnown.has(model)) {
        platform.enabledModels.push(model)
        allKnown.add(model)
      }
    }
    platform.enabledModels.sort((a, b) => a.localeCompare(b))

    savePlatforms(platforms.value)
    return res.models
  }

  return {
    platforms,
    addPlatform,
    updatePlatform,
    removePlatform,
    togglePlatformEnabled,
    enableModel,
    disableModel,
    addCustomModel,
    removeModel,
    fetchModels,
  }
}

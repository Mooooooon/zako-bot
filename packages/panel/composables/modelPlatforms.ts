export type ApiFormat = 'openai'

export interface ModelPlatform {
  id: string
  name: string
  format: ApiFormat
  baseUrl: string
  apiKey: string
  models: string[]
}

const STORAGE_KEY = 'zakobot-model-platforms'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadPlatforms(): ModelPlatform[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ModelPlatform[]) : []
  }
  catch {
    return []
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
      apiKey: '',
      models: [],
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
    platforms.value = platforms.value.filter(p => p.id !== id)
    savePlatforms(platforms.value)
  }

  async function fetchModels(id: string): Promise<string[]> {
    const platform = platforms.value.find(p => p.id === id)
    if (!platform) throw new Error('Platform not found')

    const res = await $fetch<{ models: string[] }>('/api/models/fetch', {
      method: 'POST',
      body: { baseUrl: platform.baseUrl, apiKey: platform.apiKey },
    })
    const models = res.models
    updatePlatform(id, { models })
    return models
  }

  return {
    platforms,
    addPlatform,
    updatePlatform,
    removePlatform,
    fetchModels,
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ baseUrl: string, apiKey: string, format?: string }>(event)

  if (body.format === 'google') {
    if (!body.baseUrl || !body.apiKey)
      throw createError({ statusCode: 400, message: 'baseUrl and apiKey are required' })
    return fetchGoogleModels(body.baseUrl, body.apiKey)
  }

  if (!body.baseUrl || !body.apiKey)
    throw createError({ statusCode: 400, message: 'baseUrl and apiKey are required' })
  return fetchOpenAIModels(body.baseUrl, body.apiKey)
})

async function fetchOpenAIModels(baseUrl: string, apiKey: string) {
  let url: URL
  try {
    url = new URL('/v1/models', baseUrl)
  }
  catch {
    throw createError({ statusCode: 400, message: 'Invalid baseUrl' })
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw createError({
        statusCode: res.status,
        message: `Provider returned ${res.status}: ${text.slice(0, 200)}`,
      })
    }

    const data = await res.json() as { data?: { id: string }[] }
    const models: string[] = (data.data ?? [])
      .map((m) => m.id)
      .sort((a, b) => a.localeCompare(b))

    return { models }
  }
  catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 502, message: `Failed to fetch models: ${err.message}` })
  }
}

async function fetchGoogleModels(baseUrl: string, apiKey: string) {
  let url: URL
  try {
    url = new URL('/v1beta/models', baseUrl)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('pageSize', '100')
  }
  catch {
    throw createError({ statusCode: 400, message: 'Invalid baseUrl' })
  }

  try {
    const res = await fetch(url.toString())

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw createError({
        statusCode: res.status,
        message: `Google API returned ${res.status}: ${text.slice(0, 200)}`,
      })
    }

    const data = await res.json() as { models?: { name: string, supportedGenerationMethods?: string[] }[] }
    const models: string[] = (data.models ?? [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .sort((a, b) => a.localeCompare(b))

    return { models }
  }
  catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 502, message: `Failed to fetch Google models: ${err.message}` })
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ baseUrl: string, apiKey: string }>(event)

  if (!body.baseUrl || !body.apiKey) {
    throw createError({ statusCode: 400, statusMessage: 'baseUrl and apiKey are required' })
  }

  let url: URL
  try {
    url = new URL('/v1/models', body.baseUrl)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid baseUrl' })
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw createError({
        statusCode: res.status,
        statusMessage: `Provider returned ${res.status}: ${text.slice(0, 200)}`,
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
    throw createError({ statusCode: 502, statusMessage: `Failed to fetch models: ${err.message}` })
  }
})
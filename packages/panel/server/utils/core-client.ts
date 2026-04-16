async function coreRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = useRuntimeConfig()
  const res = await fetch(`${config.coreApiUrl}${path}`, init)
  const json = (await res.json()) as { data?: T, error?: string }

  if (!res.ok) {
    throw new Error(json.error ?? `Core API error: ${res.status}`)
  }

  if (typeof json.data === 'undefined') {
    throw new Error('Core API returned no data')
  }

  return json.data
}

async function coreGet<T>(path: string): Promise<T> {
  return coreRequest<T>(path)
}

async function corePost<T>(path: string, body: unknown): Promise<T> {
  return coreRequest<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function corePut<T>(path: string, body: unknown): Promise<T> {
  return coreRequest<T>(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export { coreGet, corePost, corePut }

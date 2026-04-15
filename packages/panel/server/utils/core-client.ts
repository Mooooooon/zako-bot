async function coreGet<T>(path: string): Promise<T> {
  const config = useRuntimeConfig()
  const res = await fetch(`${config.coreApiUrl}${path}`)
  if (!res.ok) throw new Error(`Core API error: ${res.status}`)
  const json = (await res.json()) as { data: T }
  return json.data
}

export { coreGet }
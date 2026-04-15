const CORE_URL = process.env.CORE_API_URL ?? 'http://127.0.0.1:3001'

export async function coreGet<T>(path: string): Promise<T> {
  const res = await fetch(`${CORE_URL}${path}`)
  if (!res.ok) throw new Error(`Core API error: ${res.status}`)
  const json = await res.json() as { data: T }
  return json.data
}

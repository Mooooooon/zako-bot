import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 5

export interface SafeFetchOptions {
  timeoutMs?: number
  maxBytes?: number
  headers?: HeadersInit
}

export interface SafeFetchResult {
  url: string
  contentType: string
  text: string
}

export async function safeFetchText(inputUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 10_000
  const maxBytes = options.maxBytes ?? 1_000_000
  let url = await assertSafeHttpUrl(inputUrl)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: buildHeaders(options.headers),
    })

    if (isRedirect(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('Redirect response did not include a location header')
      }

      url = await assertSafeHttpUrl(new URL(location, url).toString())
      continue
    }

    if (!response.ok) {
      throw new Error(`Request failed with HTTP ${response.status}`)
    }

    return {
      url,
      contentType: response.headers.get('content-type') ?? '',
      text: await readResponseText(response, maxBytes),
    }
  }

  throw new Error('Too many redirects')
}

export async function assertSafeHttpUrl(inputUrl: string) {
  let url: URL

  try {
    url = new URL(inputUrl)
  }
  catch {
    throw new Error('Invalid URL')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS URLs are supported')
  }

  if (url.username || url.password) {
    throw new Error('URLs with credentials are not allowed')
  }

  await assertPublicHostname(url.hostname)
  return url.toString()
}

function buildHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers({
    accept: 'text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5',
    'user-agent': 'ZakoBot/0.1 (+https://github.com/Mooooooon/zako-bot)',
  })

  if (!extraHeaders) {
    return headers
  }

  new Headers(extraHeaders).forEach((value, key) => {
    headers.set(key, value)
  })

  return headers
}

async function assertPublicHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')

  if (!normalized || normalized === 'localhost' || normalized.endsWith('.localhost')) {
    throw new Error('Localhost URLs are not allowed')
  }

  const literalIpVersion = isIP(normalized)
  if (literalIpVersion !== 0) {
    assertPublicIp(normalized)
    return
  }

  const addresses = await lookup(normalized, { all: true, verbatim: true })
  if (!addresses.length) {
    throw new Error('Hostname did not resolve')
  }

  for (const address of addresses) {
    assertPublicIp(address.address)
  }
}

function assertPublicIp(address: string) {
  const ipVersion = isIP(address)

  if (ipVersion === 4 && isPrivateIpv4(address)) {
    throw new Error('Private network URLs are not allowed')
  }

  if (ipVersion === 6 && isPrivateIpv6(address)) {
    throw new Error('Private network URLs are not allowed')
  }
}

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map((part) => Number(part))
  const [a, b] = parts

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true
  }

  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224
  )
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase()

  if (
    normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
  ) {
    return true
  }

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false
}

function isRedirect(status: number) {
  return status >= 300 && status < 400
}

async function readResponseText(response: Response, maxBytes: number) {
  if (!response.body) {
    return response.text()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`Response exceeded ${maxBytes} bytes`)
    }

    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

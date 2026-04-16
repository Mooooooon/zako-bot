import type { BrowseSettings, JinaEngine, JinaRetainImages, LLMTool } from '@zakobot/shared'
import { assertSafeHttpUrl, safeFetchText } from '../safe-fetch.js'

const DEFAULT_MAX_CHARS = 6_000
const MAX_CHARS = 12_000

export function createWebBrowseTool(getBrowseSettings = getEnvBrowseSettings): LLMTool {
  return {
    name: 'web_browse',
    description: 'Fetch a public web page URL and return readable text for citation or summarization.',
    instructions: [
      '当用户发送 URL，或要求总结、解释、核对某个网页内容时，优先调用 web_browse。',
      'web_browse 只能读取公开 HTTP/HTTPS 页面。默认浏览方式读取静态文本；若管理员启用 Jina.ai，可读取由 Jina.ai 返回的网页正文。',
      'web_browse 不能登录、播放视频、查看直播画面或执行复杂浏览器交互。',
      '只有工具返回了页面内容，才可以说已经读取该网页。若返回错误、空内容或内容明显不足，要说明限制和已能确认的部分。',
      '回答网页内容时基于工具返回文本，并尽量附上页面 URL。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The public HTTP or HTTPS URL to read.',
        },
        maxChars: {
          type: 'number',
          description: `Maximum characters to return. Defaults to ${DEFAULT_MAX_CHARS}, maximum ${MAX_CHARS}.`,
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    execute: async (args) => browsePage(args, getBrowseSettings()),
  }
}

async function browsePage(args: Record<string, unknown>, settings: BrowseSettings) {
  const url = getRequiredString(args.url, 'url')
  const maxChars = clampNumber(args.maxChars, DEFAULT_MAX_CHARS, 1_000, MAX_CHARS)

  if (settings.provider === 'jina') {
    return browsePageWithJina(url, maxChars, settings)
  }

  return browsePageWithFetch(url, maxChars)
}

async function browsePageWithFetch(url: string, maxChars: number) {
  const fetched = await safeFetchText(url, {
    timeoutMs: 10_000,
    maxBytes: 1_000_000,
  })

  if (!isSupportedContentType(fetched.contentType)) {
    throw new Error(`Unsupported content type: ${fetched.contentType || 'unknown'}`)
  }

  const body = extractReadableText(fetched.text, fetched.contentType)
  const title = extractTitle(fetched.text, fetched.contentType)
  const content = body.slice(0, maxChars)

  return JSON.stringify({
    url: fetched.url,
    provider: 'fetch',
    title,
    content,
    truncated: content.length >= maxChars,
  })
}

async function browsePageWithJina(url: string, maxChars: number, settings: BrowseSettings) {
  if (!settings.jinaApiKey) {
    throw new Error('Jina.ai browsing is not configured. Set Jina API key in browse settings.')
  }

  const normalizedUrl = await assertSafeHttpUrl(url)
  const jinaUrl = `https://r.jina.ai/${normalizedUrl}`
  const headers: Record<string, string> = {
    accept: 'text/markdown,text/plain,text/html;q=0.9,*/*;q=0.5',
    authorization: `Bearer ${settings.jinaApiKey}`,
    'x-engine': settings.jinaEngine,
    'x-retain-images': settings.jinaRetainImages,
  }

  if (settings.jinaTokenBudgetEnabled) {
    headers['x-token-budget'] = String(settings.jinaTokenBudget)
  }

  const fetched = await safeFetchText(jinaUrl, {
    timeoutMs: 30_000,
    maxBytes: 2_000_000,
    headers,
  })

  if (!isSupportedContentType(fetched.contentType)) {
    throw new Error(`Unsupported content type: ${fetched.contentType || 'unknown'}`)
  }

  const body = extractReadableText(fetched.text, fetched.contentType)
  const content = body.slice(0, maxChars)

  return JSON.stringify({
    url: normalizedUrl,
    provider: 'jina',
    title: extractTitle(fetched.text, fetched.contentType),
    content,
    truncated: content.length >= maxChars,
  })
}

function isSupportedContentType(contentType: string) {
  const normalized = contentType.toLowerCase()

  return (
    normalized.includes('text/html')
    || normalized.includes('text/plain')
    || normalized.includes('text/markdown')
    || normalized.includes('application/xhtml+xml')
  )
}

function extractTitle(input: string, contentType: string) {
  if (!isHtmlContentType(contentType)) {
    const markdownHeading = input.match(/^\s*#\s+(.+)$/m)?.[1]
    return markdownHeading ? markdownHeading.trim() : ''
  }

  const match = input.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeEntities(stripTags(match[1]).trim()) : ''
}

function extractReadableText(input: string, contentType: string) {
  if (isHtmlContentType(contentType)) {
    return stripHtml(input)
  }

  return decodeEntities(
    input
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

function isHtmlContentType(contentType: string) {
  const normalized = contentType.toLowerCase()
  return normalized.includes('text/html') || normalized.includes('application/xhtml+xml')
}

function stripHtml(input: string) {
  return decodeEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|header|footer|main|li|h[1-6]|tr|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  )
}

function stripTags(input: string) {
  return input.replace(/<[^>]+>/g, ' ')
}

function decodeEntities(input: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
  }

  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }

    if (body.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    }

    return namedEntities[body.toLowerCase()] ?? entity
  })
}

function getRequiredString(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`)
  }

  return value.trim()
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(number), min), max)
}

function getEnvBrowseSettings(): BrowseSettings {
  const tokenBudget = Number(process.env.JINA_TOKEN_BUDGET)

  return {
    provider: process.env.BROWSE_PROVIDER === 'jina' ? 'jina' : 'fetch',
    jinaApiKey: process.env.JINA_API_KEY?.trim() ?? '',
    jinaEngine: isJinaEngine(process.env.JINA_ENGINE)
      ? process.env.JINA_ENGINE
      : 'browser',
    jinaRetainImages: isJinaRetainImages(process.env.JINA_RETAIN_IMAGES)
      ? process.env.JINA_RETAIN_IMAGES
      : 'none',
    jinaTokenBudgetEnabled: Boolean(process.env.JINA_TOKEN_BUDGET?.trim()),
    jinaTokenBudget: Number.isFinite(tokenBudget) ? Math.trunc(tokenBudget) : 200_000,
  }
}

function isJinaEngine(value: unknown): value is JinaEngine {
  return value === 'browser' || value === 'direct' || value === 'cf-browser-rendering'
}

function isJinaRetainImages(value: unknown): value is JinaRetainImages {
  return (
    value === 'all'
    || value === 'none'
    || value === 'alt'
    || value === 'all_p'
    || value === 'alt_p'
  )
}

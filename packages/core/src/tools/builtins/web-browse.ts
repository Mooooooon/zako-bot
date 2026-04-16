import type { LLMTool } from '@zakobot/shared'
import { safeFetchText } from '../safe-fetch.js'

const DEFAULT_MAX_CHARS = 6_000
const MAX_CHARS = 12_000

export function createWebBrowseTool(): LLMTool {
  return {
    name: 'web_browse',
    description: 'Fetch a public web page URL and return readable text for citation or summarization.',
    instructions: [
      '当用户发送 URL，或要求总结、解释、核对某个网页内容时，优先调用 web_browse。',
      'web_browse 只能读取公开 HTTP/HTTPS 页面的静态文本，不能登录、播放视频、查看直播画面、执行复杂浏览器交互或保证读取到 JavaScript 动态渲染后的内容。',
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
    execute: async (args) => browsePage(args),
  }
}

async function browsePage(args: Record<string, unknown>) {
  const url = getRequiredString(args.url, 'url')
  const maxChars = clampNumber(args.maxChars, DEFAULT_MAX_CHARS, 1_000, MAX_CHARS)
  const fetched = await safeFetchText(url, {
    timeoutMs: 10_000,
    maxBytes: 1_000_000,
  })

  if (!isSupportedContentType(fetched.contentType)) {
    throw new Error(`Unsupported content type: ${fetched.contentType || 'unknown'}`)
  }

  const title = extractTitle(fetched.text)
  const content = stripHtml(fetched.text).slice(0, maxChars)

  return JSON.stringify({
    url: fetched.url,
    title,
    content,
    truncated: content.length >= maxChars,
  })
}

function isSupportedContentType(contentType: string) {
  const normalized = contentType.toLowerCase()

  return (
    normalized.includes('text/html')
    || normalized.includes('text/plain')
    || normalized.includes('application/xhtml+xml')
  )
}

function extractTitle(input: string) {
  const match = input.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeEntities(stripTags(match[1]).trim()) : ''
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

import type { LLMTool } from '@zakobot/shared'
import type { SearchSettings } from '@zakobot/shared'
import { safeFetchText } from '../safe-fetch.js'

const DEFAULT_MAX_RESULTS = 5
const MAX_RESULTS = 10

interface TavilySearchResponse {
  query?: string
  answer?: string
  results?: TavilySearchResult[]
  response_time?: string
}

interface TavilySearchResult {
  title?: string
  url?: string
  content?: string
  score?: number
  favicon?: string
}

export function createWebSearchTool(getSearchSettings = getEnvSearchSettings): LLMTool {
  return {
    name: 'web_search',
    description: 'Search the web for current results and return source links with short snippets.',
    instructions: [
      '当用户询问最新信息、实时信息、新闻、价格、版本、赛程、网页上才可能有的事实，或明确要求搜索时，优先调用 web_search。',
      '如果用户已经提供了具体 URL，不要先搜索，优先使用 web_browse 读取该 URL。',
      'web_search 返回的是搜索结果列表和摘要，不代表已经读完网页全文；需要确认细节时，继续调用 web_browse 阅读相关结果页。',
      '回答时基于工具返回的结果，并尽量附上来源 URL。工具失败或没有结果时，要明确说明无法确认，不要编造。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query.',
        },
        maxResults: {
          type: 'number',
          description: `Number of results to return. Defaults to ${DEFAULT_MAX_RESULTS}, maximum ${MAX_RESULTS}.`,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    execute: async (args) => searchWeb(args, getSearchSettings()),
  }
}

async function searchWeb(args: Record<string, unknown>, settings: SearchSettings) {
  const query = getRequiredString(args.query, 'query')
  const maxResults = clampNumber(args.maxResults, DEFAULT_MAX_RESULTS, 1, MAX_RESULTS)

  if (settings.provider === 'tavily') {
    return searchTavily(query, maxResults, settings)
  }

  return searchGoogleWeb(query, maxResults)
}

async function searchTavily(query: string, maxResults: number, settings: SearchSettings) {
  const apiKey = settings.tavilyApiKey || process.env.TAVILY_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('Tavily search is not configured. Set Tavily API key in search settings.')
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: 'basic',
      include_raw_content: false,
      include_favicon: true,
    }),
  })

  const data = await response.json() as TavilySearchResponse

  if (!response.ok) {
    throw new Error(`Tavily search failed with HTTP ${response.status}`)
  }

  return JSON.stringify({
    provider: 'tavily',
    query: data.query ?? query,
    answer: data.answer ?? '',
    responseTime: data.response_time ?? '',
    results: (data.results ?? []).slice(0, maxResults).map((item, index) => ({
      rank: index + 1,
      title: item.title ?? '',
      url: item.url ?? '',
      snippet: item.content ?? '',
      score: item.score ?? null,
      favicon: item.favicon ?? '',
    })),
  })
}

async function searchGoogleWeb(query: string, maxResults: number) {
  const url = new URL('https://www.google.com/search')
  url.searchParams.set('q', query)
  url.searchParams.set('num', String(maxResults))
  url.searchParams.set('hl', 'zh-CN')
  url.searchParams.set('safe', process.env.GOOGLE_SEARCH_SAFE?.trim() || 'active')

  const response = await safeFetchText(url.toString(), {
    timeoutMs: 10_000,
    maxBytes: 1_000_000,
  })

  const results = parseGoogleResults(response.text, maxResults)

  if (!results.length && response.text.includes('/httpservice/retry/enablejs')) {
    throw new Error('Google web search requires JavaScript for this request. Use Tavily or try again later.')
  }

  return JSON.stringify({
    provider: 'google_web',
    query,
    results,
  })
}

function parseGoogleResults(html: string, maxResults: number) {
  const results: Array<{
    rank: number
    title: string
    url: string
    displayUrl: string
    snippet: string
  }> = []
  const seen = new Set<string>()
  const linkPattern = /<a[^>]+href="\/url\?q=([^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = linkPattern.exec(html)) && results.length < maxResults) {
    const targetUrl = decodeURIComponent(match[1])

    if (!targetUrl.startsWith('http') || seen.has(targetUrl) || isGoogleUrl(targetUrl)) {
      continue
    }

    const title = decodeEntities(stripTags(match[2])).trim()
    if (!title) {
      continue
    }

    seen.add(targetUrl)
    results.push({
      rank: results.length + 1,
      title,
      url: targetUrl,
      displayUrl: new URL(targetUrl).hostname,
      snippet: '',
    })
  }

  return results
}

function isGoogleUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return hostname === 'google.com' || hostname.endsWith('.google.com')
  }
  catch {
    return true
  }
}

function stripTags(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
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

function getEnvSearchSettings(): SearchSettings {
  return {
    provider: process.env.SEARCH_PROVIDER === 'tavily' ? 'tavily' : 'google_web',
    tavilyApiKey: process.env.TAVILY_API_KEY?.trim() ?? '',
  }
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

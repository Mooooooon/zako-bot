import { readFile, writeFile, readdir, stat, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import type { LLMTool } from '@zakobot/shared'

const MAX_READ_LINES = 2000
const MAX_FILE_BYTES = 2_000_000
const MAX_LIST_DEPTH = 5

export function createFileReadTool(): LLMTool {
  return {
    name: 'file_read',
    description: 'Read a file and return its content with line numbers.',
    instructions: [
      '使用 file_read 读取文件内容，结果包含行号。',
      '文件过大时使用 offset（起始行，1-based）和 limit（最大行数）分页读取。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file.',
        },
        offset: {
          type: 'number',
          description: 'Starting line number (1-based). Default 1.',
        },
        limit: {
          type: 'number',
          description: `Maximum lines to return. Default and max ${MAX_READ_LINES}.`,
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const filePath = getString(args.path, 'path')
      const info = await stat(filePath)
      if (info.size > MAX_FILE_BYTES) {
        throw new Error(`File is ${info.size} bytes (limit ${MAX_FILE_BYTES}). Use offset/limit to read in chunks.`)
      }
      const text = await readFile(filePath, 'utf8')
      const lines = text.split('\n')
      const total = lines.length
      const start = clamp(args.offset, 1, 1, total) - 1
      const count = clamp(args.limit, MAX_READ_LINES, 1, MAX_READ_LINES)
      const slice = lines.slice(start, start + count)
      const numbered = slice.map((l, i) => `${String(start + i + 1).padStart(4)}\t${l}`).join('\n')
      return `${filePath} — lines ${start + 1}–${start + slice.length} / ${total}\n\n${numbered}`
    },
  }
}

export function createFileWriteTool(): LLMTool {
  return {
    name: 'file_write',
    description: 'Create or overwrite a file with the given text content.',
    sensitive: true,
    instructions: '使用 file_write 创建或覆盖写入文件。如父目录不存在将自动创建。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file.',
        },
        content: {
          type: 'string',
          description: 'Text content to write.',
        },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const filePath = getString(args.path, 'path')
      const content = typeof args.content === 'string' ? args.content : ''
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, content, 'utf8')
      const lineCount = content.split('\n').length
      return `Written ${content.length} chars (${lineCount} lines) to ${filePath}`
    },
  }
}

export function createFileEditTool(): LLMTool {
  return {
    name: 'file_edit',
    description: 'Replace an exact string in a file. Fails if the string is not found or appears multiple times.',
    sensitive: true,
    instructions: [
      '使用 file_edit 对文件进行精确字符串替换。',
      'old_string 必须在文件中唯一出现，否则工具会报错——此时需要提供更多上下文以确保唯一性。',
      '替换前建议先用 file_read 确认文件内容。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file.',
        },
        old_string: {
          type: 'string',
          description: 'Exact text to find. Must appear exactly once in the file.',
        },
        new_string: {
          type: 'string',
          description: 'Text to replace it with.',
        },
      },
      required: ['path', 'old_string', 'new_string'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const filePath = getString(args.path, 'path')
      const oldStr = getString(args.old_string, 'old_string')
      const newStr = typeof args.new_string === 'string' ? args.new_string : ''

      const info = await stat(filePath)
      if (info.size > MAX_FILE_BYTES) {
        throw new Error(`File is too large (${info.size} bytes) to edit safely.`)
      }

      const content = await readFile(filePath, 'utf8')
      const firstIdx = content.indexOf(oldStr)
      if (firstIdx === -1) {
        throw new Error(`old_string not found in ${filePath}`)
      }
      const secondIdx = content.indexOf(oldStr, firstIdx + 1)
      if (secondIdx !== -1) {
        throw new Error(`old_string appears multiple times in ${filePath}. Provide more surrounding context to make it unique.`)
      }

      const newContent = content.slice(0, firstIdx) + newStr + content.slice(firstIdx + oldStr.length)
      await writeFile(filePath, newContent, 'utf8')
      return `Successfully replaced in ${filePath}`
    },
  }
}

export function createFileListTool(): LLMTool {
  return {
    name: 'file_list',
    description: 'List files and directories at a path.',
    instructions: [
      '使用 file_list 列出目录内容。',
      '需要递归列出子目录时设置 recursive: true（最深 5 层）。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory to list. Defaults to current working directory.',
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to list recursively. Default false.',
        },
      },
      additionalProperties: false,
    },
    execute: async (args) => {
      const dirPath = typeof args.path === 'string' && args.path.trim() ? args.path.trim() : process.cwd()
      const recursive = args.recursive === true
      const entries = await listDir(dirPath, recursive, 0)
      return entries.length ? entries.join('\n') : '(empty directory)'
    },
  }
}

async function listDir(dirPath: string, recursive: boolean, depth: number): Promise<string[]> {
  if (depth > MAX_LIST_DEPTH) return []
  const entries = await readdir(dirPath, { withFileTypes: true })
  const result: string[] = []
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    result.push(`${entry.isDirectory() ? '[dir]' : '[file]'} ${fullPath}`)
    if (recursive && entry.isDirectory()) {
      result.push(...await listDir(fullPath, recursive, depth + 1))
    }
  }
  return result
}

function getString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : fallback
}

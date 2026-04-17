import { exec } from 'child_process'
import type { LLMTool } from '@zakobot/shared'

const DEFAULT_TIMEOUT = 30
const MAX_TIMEOUT = 120
const MAX_OUTPUT = 10_000

export function createShellExecTool(): LLMTool {
  return {
    name: 'shell_exec',
    description: 'Execute a shell command and return stdout, stderr, and exit code.',
    sensitive: true,
    instructions: [
      '使用 shell_exec 执行终端命令。确认命令符合用户意图再执行。',
      '避免执行不可逆操作（如 rm -rf、磁盘格式化）除非用户明确要求。',
      '需要在特定目录运行时，使用 workdir 参数指定工作目录。',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute.',
        },
        workdir: {
          type: 'string',
          description: 'Working directory for the command. Defaults to the process current directory.',
        },
        timeout_seconds: {
          type: 'number',
          description: `Timeout in seconds. Default ${DEFAULT_TIMEOUT}, max ${MAX_TIMEOUT}.`,
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
    execute: async (args) => {
      const command = getString(args.command, 'command')
      const workdir = typeof args.workdir === 'string' && args.workdir.trim() ? args.workdir.trim() : undefined
      const timeoutMs = clamp(args.timeout_seconds, DEFAULT_TIMEOUT, 1, MAX_TIMEOUT) * 1000
      return runCommand(command, workdir, timeoutMs)
    },
  }
}

function runCommand(command: string, cwd: string | undefined, timeout: number): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout, maxBuffer: MAX_OUTPUT * 10 }, (error, stdout, stderr) => {
      resolve(JSON.stringify({
        exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        timedOut: error?.killed ?? false,
        stdout: clip(stdout, MAX_OUTPUT),
        stderr: clip(stderr, MAX_OUTPUT),
      }))
    })
  })
}

function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}\n…[output truncated, ${s.length} chars total]` : s
}

function getString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`)
  return value.trim()
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : fallback
}

import type { LLMTool } from '@zakobot/shared'

export interface ToolRegistrationOptions {
  source: 'builtin' | 'plugin' | 'mcp'
  owner?: string
}

interface RegisteredTool {
  tool: LLMTool
  source: ToolRegistrationOptions['source']
  owner?: string
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>()

  register(tool: LLMTool, options: ToolRegistrationOptions) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }

    this.tools.set(tool.name, {
      tool,
      source: options.source,
      owner: options.owner,
    })
  }

  unregister(name: string) {
    this.tools.delete(name)
  }

  unregisterOwner(owner: string) {
    for (const [name, registration] of this.tools) {
      if (registration.owner === owner) {
        this.unregister(name)
      }
    }
  }

  list() {
    return [...this.tools.values()].map((registration) => registration.tool)
  }

  listEnabled(names: string[]) {
    const enabled = new Set(names)
    return this.list().filter((tool) => enabled.has(tool.name))
  }
}

import { createWebBrowseTool } from './builtins/web-browse.js'
import { createWebSearchTool } from './builtins/web-search.js'
import { ToolRegistry } from './registry.js'
import type { BrowseSettings } from '@zakobot/shared'
import type { SearchSettings } from '@zakobot/shared'

export { ToolRegistry } from './registry.js'

export function createDefaultToolRegistry(
  getSearchSettings: () => SearchSettings,
  getBrowseSettings: () => BrowseSettings,
) {
  const registry = new ToolRegistry()

  registry.register(createWebSearchTool(getSearchSettings), { source: 'builtin' })
  registry.register(createWebBrowseTool(getBrowseSettings), { source: 'builtin' })

  return registry
}

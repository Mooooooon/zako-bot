# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (all packages concurrently)
pnpm dev

# Individual dev servers
pnpm dev:deps    # watch shared + database
pnpm dev:core    # watch core
pnpm dev:panel   # panel dev server

# Build all packages in dependency order
pnpm build

# Lint all packages
pnpm lint

# Database
pnpm --filter @zakobot/database db:generate   # generate migrations from schema
pnpm --filter @zakobot/database db:migrate    # apply migrations
pnpm --filter @zakobot/database db:studio     # open Drizzle Studio
```

## Architecture

ZakoBot is a **pnpm monorepo** — a modular LLM-powered Discord bot framework with a web management panel.

### Packages

| Package | Role |
|---|---|
| `packages/core` | Bot runtime: LLM agent, Discord adapter, plugin loader, internal HTTP API (port 6325) |
| `packages/panel` | Nuxt 4 web dashboard (port 6324); communicates with core via `CORE_API_URL` |
| `packages/database` | Drizzle ORM + better-sqlite3; shared by both core and panel via WAL-mode SQLite |
| `packages/cli` | `zakobot` CLI — `init`, `start`, `core`, `panel` commands |
| `shared` | Cross-package TypeScript types only (no runtime code) |
| `plugins/*` | User-provided plugins scanned at runtime from `ZAKOBOT_HOME` |

### Request Flow

```
Discord message
  → discord-adapter.ts        (packages/core/src/bot/)
  → BotManager                (bot-manager.ts)
  → Agent                     (packages/core/src/llm/agent.ts)
      ├─ ConversationService  (conversation-service.ts — history/topics)
      ├─ LLMClient            (client.ts — OpenAI-compatible)
      └─ ToolRegistry         (tools/ — web-search, web-browse, plugin tools)
  → response back to Discord / Panel
```

Panel UI calls Nitro API endpoints (`packages/panel/server/api/`), which in turn call the core HTTP API or read the shared SQLite database directly.

### Key Design Points

**Dual-process, single database**: Core and Panel run as separate Node.js processes but share the same SQLite file (`~/.zakobot/data.db`) via WAL mode. There is no message broker — panel talks to core via plain HTTP.

**Plugin system**: Plugins are loaded dynamically from the `plugins/` directory. A plugin exports a default object matching the `Plugin` interface (`shared/src/types/plugin.ts`). Plugins can register tools, schedule cron tasks, and send messages via a `PluginContext`.

**Tool registry**: LLM tools are registered in `ToolRegistry` and filtered per-role via `role.enabledTools`. Builtins are `web-search` (Bing API) and `web-browse` (HTTP fetch + HTML parse). Plugins can register additional tools.

**Conversation topics**: Messages are grouped into `Topics` (by platform + scope, e.g., a Discord channel). `ConversationService` manages topic/message lifecycle and feeds history to the agent.

### Environment Variables

```
ZAKOBOT_HOME       Working directory (default: ~/.zakobot)
DATABASE_URL       SQLite file path (default: ~/.zakobot/data.db)
CORE_API_PORT      Core HTTP API port (default: 6325)
PANEL_PORT         Panel port (default: 6324)
CORE_API_URL       Panel → Core URL (default: http://127.0.0.1:6325)
```

### TypeScript

All packages use `tsconfig.base.json`: `target: ES2022`, `module: NodeNext`, strict mode, ESM. Packages compile with `tsc`; core dev uses `tsx watch`.

## Checklists

### 新增 `GeneralSettings` 字段时必须同步修改以下所有位置

1. `shared/src/types/general-settings.ts` — 接口声明
2. `packages/core/src/settings/general-settings.ts` — `normalizeGeneralSettings` 归一化逻辑
3. `packages/core/src/api/server.ts` — `parseGeneralSettingsInput` 解析逻辑（**最容易遗漏**）
4. `packages/panel/pages/settings/general/index.vue` — `form` 初始值、`watch` 同步、保存时 `body` 字段、UI 控件

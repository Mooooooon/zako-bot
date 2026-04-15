# ZakoBot

A modular, extensible bot framework with LLM agent capabilities, a web management panel, and a plugin system.

## Architecture

ZakoBot runs as two independent processes sharing a database:

```
┌─────────────────────────────────────────────────────┐
│                    zakobot (monorepo)                │
│                                                      │
│  ┌────────────────────┐    ┌───────────────────────┐ │
│  │   packages/core    │    │   packages/panel      │ │
│  │                    │    │                       │ │
│  │  discord.js        │    │  backend (Express)    │ │
│  │  LLM Agent         │◄───│  frontend (Vue 3)     │ │
│  │  Plugin Loader     │    │                       │ │
│  │  Internal HTTP API │    └───────────────────────┘ │
│  └─────────┬──────────┘                              │
│            │                                         │
│  ┌─────────▼──────────┐    ┌───────────────────────┐ │
│  │   Database         │    │   plugins/            │ │
│  │   (SQLite / PG)    │    │   built-in & custom   │ │
│  └────────────────────┘    └───────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Bot runtime | Node.js + discord.js |
| LLM integration | Provider-agnostic (OpenAI / Anthropic / etc.) |
| Panel backend | Node.js + Express |
| Panel frontend | Vue 3 |
| Database | SQLite (dev) / PostgreSQL (prod) |

## Features

### Roles & Bot Instances

ZakoBot separates **who the AI is** from **where it runs**:

- **Role** — An AI character definition:
  - Name and system prompt (personality / behavior)
  - LLM provider + model + API key
  - Enabled tools (web search, web browse, etc.)

- **Bot Instance** — A platform connection:
  - Platform (Discord / QQ)
  - Bot token
  - Bound to exactly one Role

Multiple bot instances can share the same role, or each can have a unique one.

```
Role A (助手小智)          Role B (毒舌评论家)
  model: gpt-4o              model: claude-opus
  tools: [search, browse]    tools: []
      ▲                           ▲
      │                           │
 Bot Instance 1             Bot Instance 2
 platform: discord          platform: discord
 (server: 游戏社群)          (server: 影评频道)
```

### Core (Bot Process)

- **Multi-instance manager** — Runs multiple platform bots simultaneously, each isolated
- **Platform Adapters** — Discord (first), QQ (planned)
- **LLM Agent** — Conversational AI with tool use per role:
  - Web search
  - Open and read web pages
  - Extensible tool interface
- **Plugin System** — JS module-based plugins, managed by core:
  - Lifecycle hooks (onLoad, onUnload)
  - Scheduled task management
  - Access to bot messaging API
- **Internal HTTP API** — Panel communicates with core via REST

### Panel (Web Process)

- **Role management** — Create / edit roles, set system prompts, configure LLM per role
- **Bot instance management** — Add bots, bind roles, enable/disable
- Plugin management (enable / disable / configure)
- Push target management (channels, webhooks)
- Log viewer

### Built-in Plugins

- **Live stream monitor** — Poll streaming platforms, push notifications to specified channels

## Project Structure

```
zakobot/
├── packages/
│   ├── core/           # Bot process
│   └── panel/          # Web panel (backend + frontend)
├── plugins/            # Built-in plugins
├── shared/             # Shared types and utilities
└── README.md
```

## Roadmap

- [x] Architecture design
- [x] Monorepo scaffold (pnpm workspaces)
- [ ] Database schema (roles, bot instances, plugins)
- [ ] Core: multi-instance bot manager
- [ ] Core: Discord adapter
- [ ] Core: LLM agent with tool use
- [ ] Core: plugin loader
- [ ] Panel: role management UI
- [ ] Panel: bot instance management UI
- [ ] Panel: plugin management UI
- [ ] Built-in plugin: live stream monitor
- [ ] QQ adapter

## License

MIT

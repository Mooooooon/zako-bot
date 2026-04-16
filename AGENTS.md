# AGENTS.md

## 项目概览

这是一个基于 `pnpm workspace` 的 TypeScript monorepo，用来承载 ZakoBot 的几个核心部分：

- `packages/core`：机器人运行时，负责 Bot 生命周期、LLM 能力、插件加载和内部 API
- `packages/panel`：管理后台，使用 Nuxt 提供页面和服务端接口
- `packages/database`：数据库连接、Drizzle Schema、查询和迁移
- `packages/cli`：命令行入口，用来启动 core / panel
- `shared`：跨包共享的类型定义

当前架构是两个独立进程共享同一个 SQLite 数据库：

1. `core` 负责 bot 运行和内部 HTTP API
2. `panel` 负责 Web UI，并通过 `CORE_API_URL` 调用 `core`

## 技术栈

### 基础设施

- Node.js
- TypeScript
- `pnpm workspace`
- ESM 模块
- `concurrently` 用于本地多进程开发

### Core

- `discord.js`：Discord Bot 适配层
- `openai`：LLM 客户端接入
- `node-cron`：插件定时任务
- `dotenv`：环境变量加载
- Node 原生 `http`：内部 API 服务

### Panel

- Nuxt 4
- Vue 3
- Nitro Server API
- `@nuxt/ui`
- Tailwind CSS 4

### Database

- `drizzle-orm`
- `drizzle-kit`
- `better-sqlite3`

当前仓库里的数据库实现是 SQLite。`packages/database/src/client.ts` 中开启了 WAL 模式，方便 `core` 与 `panel` 并发访问同一数据库文件。

### CLI

- `commander`

## 目录结构

```text
zako-bot/
├─ package.json                 # workspace 根脚本
├─ pnpm-workspace.yaml          # workspace 包范围
├─ tsconfig.base.json           # 根 TS 配置
├─ README.md
├─ AGENTS.md
├─ packages/
│  ├─ cli/
│  │  └─ src/
│  │     └─ index.ts            # CLI 入口，负责 init / start / core / panel
│  ├─ core/
│  │  └─ src/
│  │     ├─ api/
│  │     │  └─ server.ts        # core 内部 HTTP API
│  │     ├─ bot/
│  │     │  ├─ bot-manager.ts   # Bot 实例管理
│  │     │  └─ discord-adapter.ts
│  │     ├─ llm/
│  │     │  ├─ agent.ts
│  │     │  ├─ client.ts
│  │     │  └─ conversation-store.ts
│  │     ├─ plugins/
│  │     │  ├─ loader.ts
│  │     │  └─ scheduler.ts
│  │     ├─ index.ts            # core 进程入口
│  │     └─ seed.ts
│  ├─ database/
│  │  ├─ migrations/            # Drizzle SQL 迁移文件
│  │  └─ src/
│  │     ├─ client.ts           # DB 连接创建
│  │     ├─ index.ts
│  │     ├─ migrate.ts
│  │     ├─ schema/             # roles / plugins / bot-instances
│  │     └─ queries/
│  └─ panel/
│     ├─ assets/
│     │  └─ css/
│     ├─ components/
│     ├─ composables/
│     ├─ layouts/
│     ├─ pages/                 # 页面路由
│     ├─ server/
│     │  ├─ api/                # Nitro 服务端接口
│     │  └─ utils/
│     ├─ app.vue
│     └─ nuxt.config.ts
└─ shared/
   └─ src/
      ├─ index.ts
      └─ types/                 # api / llm / plugin / role / bot-instance
```

## 运行与开发

根目录常用命令：

- `pnpm dev`：同时启动依赖包监听、core 和 panel
- `pnpm dev:deps`：启动 `shared` 和 `database` 的 watch build
- `pnpm dev:core`：只启动 core
- `pnpm dev:panel`：只启动 panel
- `pnpm build`：构建整个 monorepo
- `pnpm lint`：执行所有包的 lint 脚本

数据库相关命令：

- `pnpm --filter @zakobot/database db:generate`
- `pnpm --filter @zakobot/database db:migrate`
- `pnpm --filter @zakobot/database db:studio`

默认端口：

- `panel`: `http://127.0.0.1:3000`
- `core api`: `http://127.0.0.1:3001`

## 协作提示

### 优先查看这些源码目录

- `packages/core/src`
- `packages/panel/pages`
- `packages/panel/server`
- `packages/database/src`
- `shared/src`

### 一般可以忽略这些生成产物

- `node_modules/`
- `dist/`
- `.nuxt/`
- `.output/`
- `*.log`
- `*.db`
- `*.db-shm`
- `*.db-wal`

### 代码阅读建议

- 想看系统入口，从 `packages/cli/src/index.ts` 和 `packages/core/src/index.ts` 开始
- 想看 panel 如何访问 core，从 `packages/panel/server/utils/core-client.ts` 开始
- 想看数据模型，从 `packages/database/src/schema` 开始
- 想看跨包类型，从 `shared/src/types` 开始

### 当前实现上的事实

- README 中提到的一些规划项还在演进中，协作时应以源码为准
- 目前内部 API 使用的是 Node 原生 `http`，不是 Express
- 当前已落地的数据库驱动是 SQLite，没有看到 PostgreSQL 实现代码

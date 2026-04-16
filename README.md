# ZakoBot

ZakoBot 是一个基于 TypeScript 的模块化 Bot 框架，目标是把 Bot 运行时、LLM 能力、插件系统和 Web 管理面板拆成清晰的几个包，便于持续扩展。

当前仓库已经搭好了 monorepo 基础设施，并实现了可运行的 `core + panel + database + shared + cli` 结构。

## 当前状态

目前可以确认的已实现部分：

- `pnpm workspace` monorepo
- `core` 进程入口
- Discord Bot 适配器
- 基于角色配置的 LLM Agent
- 插件加载器与定时任务调度
- `core` 内部 HTTP API
- 基于 Nuxt 的管理面板
- 面板首页状态展示
- 模型平台配置页与模型列表拉取
- SQLite + Drizzle ORM 数据层
- CLI 启动入口

当前仍在继续完善的部分：

- 角色管理 CRUD
- 机器人实例管理 CRUD
- 插件配置管理
- 更多平台适配器，例如 QQ
- 更完整的插件生态

## 架构说明

当前架构是两个独立进程共享同一个数据库文件：

```text
packages/core   -> 机器人运行时、LLM、插件、内部 API
packages/panel  -> Web 管理面板（页面 + Nitro 服务端接口）
packages/database -> Drizzle schema / queries / migrations
shared          -> 跨包共享类型
```

`panel` 不直接操作 bot runtime，而是通过 `CORE_API_URL` 调用 `core` 暴露的内部接口。

数据库当前使用 SQLite，`packages/database/src/client.ts` 中启用了 WAL 模式，以支持 `core` 和 `panel` 并发访问。

## 技术栈

| 层 | 技术 |
|---|---|
| Monorepo | `pnpm workspace` |
| 语言 | TypeScript |
| 模块系统 | ESM |
| Bot Runtime | Node.js + `discord.js` |
| LLM | `openai` SDK（当前按 OpenAI 兼容接口接入） |
| Plugin Scheduler | `node-cron` |
| Panel | Nuxt 4 + Vue 3 + Nitro |
| UI | `@nuxt/ui` + Tailwind CSS 4 |
| Database | `drizzle-orm` + `drizzle-kit` + `better-sqlite3` |
| CLI | `commander` |

## 目录结构

```text
zako-bot/
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ AGENTS.md
├─ packages/
│  ├─ cli/
│  │  └─ src/index.ts
│  ├─ core/
│  │  └─ src/
│  │     ├─ api/
│  │     ├─ bot/
│  │     ├─ llm/
│  │     ├─ plugins/
│  │     ├─ index.ts
│  │     └─ seed.ts
│  ├─ database/
│  │  ├─ migrations/
│  │  └─ src/
│  │     ├─ client.ts
│  │     ├─ schema/
│  │     ├─ queries/
│  │     └─ migrate.ts
│  └─ panel/
│     ├─ assets/
│     ├─ components/
│     ├─ composables/
│     ├─ layouts/
│     ├─ pages/
│     ├─ server/
│     ├─ app.vue
│     └─ nuxt.config.ts
└─ shared/
   └─ src/
      ├─ index.ts
      └─ types/
```

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发环境

```bash
pnpm dev
```

这会并行启动：

- `@zakobot/shared` 的 watch build
- `@zakobot/database` 的 watch build
- `@zakobot/core`
- `@zakobot/panel`

默认地址：

- Panel: [http://127.0.0.1:6324](http://127.0.0.1:6324)
- Core API: [http://127.0.0.1:6325](http://127.0.0.1:6325)

### 3. 单独启动某个包

```bash
pnpm dev:deps
pnpm dev:core
pnpm dev:panel
```

### 4. 构建

```bash
pnpm build
```

## 数据库命令

```bash
pnpm --filter @zakobot/database db:generate
pnpm --filter @zakobot/database db:migrate
pnpm --filter @zakobot/database db:studio
```

## 包职责

### `packages/core`

负责：

- 从数据库读取启用中的 bot 实例
- 为每个实例创建运行时适配器
- 根据角色配置调用 LLM
- 维护对话历史
- 加载根目录 `plugins/` 下的插件
- 提供 `/status`、`/plugins` 等内部 API

当前已明确支持的平台是 Discord。虽然 schema 中已经预留了 `qq`，但 runtime 里还没有实际适配器实现。

### `packages/panel`

负责：

- 提供 Web 管理界面
- 通过 Nitro server routes 代理或调用 `core`
- 展示运行状态和插件信息
- 管理模型平台配置，并调用兼容 OpenAI 的 `/v1/models` 获取模型列表

### `packages/database`

负责：

- 建立 SQLite 连接
- 定义 `roles`、`bot_instances`、`plugins` 表
- 提供查询函数
- 管理 Drizzle 迁移

### `shared`

负责：

- 提供跨包共享的 TypeScript 类型
- 约束 `core` 和 `panel` 之间的 API 数据结构
- 定义插件接口

### `packages/cli`

负责：

- 提供 `zakobot` CLI 入口
- 启动 `core`
- 启动 `panel`
- 同时启动两者

## 当前可见页面

当前面板里比较明确的页面状态：

- `/`：控制台首页，可查看运行时状态与插件列表
- `/settings/models`：模型平台配置与模型列表拉取
- `/roles`、`/bots`、`/plugins`：目前还是占位页

## 开发时的阅读入口

建议按下面顺序理解项目：

1. `packages/cli/src/index.ts`
2. `packages/core/src/index.ts`
3. `packages/core/src/bot/bot-manager.ts`
4. `packages/core/src/api/server.ts`
5. `packages/panel/server/utils/core-client.ts`
6. `packages/database/src/schema/*`
7. `shared/src/types/*`

## 注意

- README 应以源码为准，历史规划描述可能已经落后于当前实现
- 当前内部 API 使用的是 Node 原生 `http`，不是 Express
- 当前仓库内只有 SQLite 实现，没有 PostgreSQL 驱动代码

## License

MIT

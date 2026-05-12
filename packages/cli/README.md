# zakobot

ZakoBot CLI for running the bot core and web management panel.

## Install

```bash
npm install -g zakobot
```

Or run it without installing:

```bash
npx zakobot init
npx zakobot start
```

If you use pnpm:

```bash
pnpm dlx zakobot init
pnpm dlx zakobot start
```

## Quick Start

Initialize the working directory:

```bash
zakobot init
```

Start both the core service and panel:

```bash
zakobot start
```

Open:

- Panel: [http://127.0.0.1:6324](http://127.0.0.1:6324)
- Core API: [http://127.0.0.1:6325](http://127.0.0.1:6325)

When you open the panel for the first time, sign in with the default password:

```text
123456
```

After logging in, change it from the settings page as soon as possible.

## Commands

```bash
zakobot init
zakobot start
zakobot core
zakobot panel
```

- `zakobot init`: initialize the ZakoBot working directory
- `zakobot start`: start both `core` and `panel`
- `zakobot core`: start only the bot core process
- `zakobot panel`: start only the web panel

## Data Directory

By default, ZakoBot stores its data in:

```text
~/.zakobot
```

The default SQLite database path is:

```text
~/.zakobot/data.db
```

## Environment Variables

Common runtime settings:

```bash
ZAKOBOT_HOME=~/.zakobot
CORE_API_PORT=6325
PANEL_PORT=6324
DATABASE_URL=/path/to/zakobot.db
CORE_API_URL=http://127.0.0.1:6325
```

- `ZAKOBOT_HOME`: working directory
- `CORE_API_PORT`: core API port
- `PANEL_PORT`: panel port
- `DATABASE_URL`: SQLite database file path
- `CORE_API_URL`: panel-to-core API URL

## Notes

- Current runtime support is focused on Discord.
- Model access is based on OpenAI-compatible APIs.
- `zakobot init` creates `~/.zakobot/.env`, and the CLI loads it automatically on startup.

## Repository

- GitHub: [Mooooooon/zako-bot](https://github.com/Mooooooon/zako-bot)

## License

MIT

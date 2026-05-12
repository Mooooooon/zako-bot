#!/usr/bin/env node
import { program } from 'commander'
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { config as loadDotenv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

loadRuntimeEnv()

program
  .name('zakobot')
  .description('ZakoBot — modular LLM bot framework')
  .version(pkg.version)

program
  .command('init')
  .description('Initialize ZakoBot config directory (~/.zakobot)')
  .action(cmdInit)

program
  .command('core')
  .description('Start the bot core process')
  .action(() => { runPackage('core') })

program
  .command('panel')
  .description('Start the web panel (http://localhost:6324)')
  .action(() => { runPackage('panel') })

program
  .command('start')
  .description('Start both core and panel')
  .action(cmdStart)

program.parse()

// ─── commands ────────────────────────────────────────────────────────────────

function cmdInit() {
  const home = zakobotHome()
  mkdirSync(home, { recursive: true })

  const envFile = resolve(home, '.env')
  if (!existsSync(envFile)) {
    writeFileSync(envFile, [
      '# ZakoBot configuration',
      '# CORE_API_PORT=6325',
      '# PANEL_PORT=6324',
    ].join('\n') + '\n')
  }

  console.log(`Initialized ZakoBot at ${home}`)
  console.log('')
  console.log('Next steps:')
  console.log('  1. Run: zakobot start')
  console.log('  2. Open: http://localhost:6324')
  console.log('  3. Add a Bot and configure your LLM in the panel')
}

function cmdStart(): void {
  const coreProc = runPackage('core')
  const panelProc = runPackage('panel')

  const shutdown = () => {
    coreProc.kill('SIGTERM')
    panelProc.kill('SIGTERM')
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function zakobotHome() {
  return process.env.ZAKOBOT_HOME ?? resolve(homedir(), '.zakobot')
}

function loadRuntimeEnv() {
  const initialHome = zakobotHome()
  loadEnvFile(resolve(initialHome, '.env'))

  const resolvedHome = zakobotHome()
  if (resolvedHome !== initialHome) {
    loadEnvFile(resolve(resolvedHome, '.env'))
  }
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return
  }

  loadDotenv({
    path,
    override: false,
  })
}

function resolveEntry(pkgName: 'core' | 'panel'): string {
  const pkgJsonPath = require.resolve(`@zakobot/${pkgName}/package.json`) as string
  const pkgJson = require(pkgJsonPath) as { main: string }
  return resolve(dirname(pkgJsonPath), pkgJson.main)
}

function runPackage(pkgName: 'core' | 'panel') {
  const entry = resolveEntry(pkgName)
  const home = zakobotHome()
  mkdirSync(home, { recursive: true })
  const coreApiPort = process.env.CORE_API_PORT ?? '6325'
  const panelPort = process.env.PANEL_PORT ?? process.env.NITRO_PORT ?? process.env.PORT ?? '6324'
  const packageEnv = pkgName === 'panel'
    ? {
        CORE_API_URL: process.env.CORE_API_URL ?? `http://127.0.0.1:${coreApiPort}`,
        NITRO_PORT: panelPort,
        PORT: panelPort,
      }
    : {}

  const child = spawn(process.execPath, [entry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...packageEnv,
      ZAKOBOT_HOME: home,
    },
  })

  child.on('error', (err) => {
    console.error(`[${pkgName}] Failed to start:`, err.message)
    process.exit(1)
  })

  return child
}

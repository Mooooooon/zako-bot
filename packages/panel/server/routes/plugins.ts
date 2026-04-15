import { Router, type Router as ExpressRouter } from 'express'
import { coreGet } from '../core-client.js'
import type { PluginInfo } from '@zakobot/shared'

export const pluginRoutes: ExpressRouter = Router()

pluginRoutes.get('/', async (_req, res) => {
  try {
    const plugins = await coreGet<PluginInfo[]>('/plugins')
    res.json({ ok: true, data: plugins })
  } catch {
    res.status(503).json({ ok: false, error: 'Core is unreachable' })
  }
})

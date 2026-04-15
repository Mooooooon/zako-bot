import { Router, type Router as ExpressRouter } from 'express'
import { coreGet } from '../core-client.js'
import type { CoreStatus } from '@zakobot/shared'

export const statusRoutes: ExpressRouter = Router()

statusRoutes.get('/', async (_req, res) => {
  try {
    const status = await coreGet<CoreStatus>('/status')
    res.json({ ok: true, data: status })
  } catch {
    res.status(503).json({ ok: false, error: 'Core is unreachable' })
  }
})

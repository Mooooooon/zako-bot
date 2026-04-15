import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { pluginRoutes } from './routes/plugins.js'
import { statusRoutes } from './routes/status.js'

const app = express()
const port = Number(process.env.PANEL_PORT ?? 3000)
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

app.use('/api/status', statusRoutes)
app.use('/api/plugins', pluginRoutes)

// In production, serve the built Vue app
if (isProd) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const clientDir = join(__dirname, '../client')
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir))
    app.get('*', (_req, res) => res.sendFile(join(clientDir, 'index.html')))
  }
}

app.listen(port, () => {
  console.log(`[Panel] Server running on http://localhost:${port}`)
})

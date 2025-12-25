/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import modelingRoutes from './routes/modeling.js'
import bomRoutes from './routes/bom.js'
import positionsRoutes from './routes/positions.js'
import logsRoutes from './routes/logs.js'
import fs from 'fs'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/modeling', modelingRoutes)
app.use('/api/bom', bomRoutes)
app.use('/api/positions', positionsRoutes)
app.use('/api/logs', logsRoutes)
/**
 * static exports
 */
app.get('/api/exports/:name', (req: Request, res: Response) => {
  const name = req.params.name
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), './tmp/exports', name)
  if (fs.existsSync(file)) {
    res.sendFile(file)
  } else {
    res.status(404).json({ success: false, error: 'Not Found' })
  }
})

/**
 * serve client build
 */
const clientDir = path.resolve(__dirname, '../dist')
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir))
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) return next()
    const indexHtml = path.join(clientDir, 'index.html')
    if (fs.existsSync(indexHtml)) res.sendFile(indexHtml)
    else next()
  })
}

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
  })
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app

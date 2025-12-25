import { Router, type Request, type Response } from 'express'
import { readJSON, writeJSON } from '../lib/storage.js'
import crypto from 'crypto'

type LogEntry = {
  id: string
  type: string
  message: string
  data?: any
  createdAt: string
}

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const logs = readJSON<LogEntry[]>('op-logs.json', [])
  res.json({ success: true, logs })
})

router.post('/write', (req: Request, res: Response) => {
  const { type = 'info', message = '', data = null } = req.body ?? {}
  const logs = readJSON<LogEntry[]>('op-logs.json', [])
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    type,
    message,
    data,
    createdAt: new Date().toISOString(),
  }
  logs.push(entry)
  writeJSON('op-logs.json', logs)
  res.json({ success: true, entry })
})

export default router


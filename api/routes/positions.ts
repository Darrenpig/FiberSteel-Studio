import { Router, type Request, type Response } from 'express'
import { readJSON, writeJSON } from '../lib/storage.js'

type PositionRecord = {
  id: string
  group: string
  instanceIndex: number
  x: number
  y: number
  z: number
  updatedAt: string
}

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const positions = readJSON<PositionRecord[]>('positions.json', [])
  res.json({ success: true, positions })
})

router.post('/save', (req: Request, res: Response) => {
  const payload = req.body as Partial<PositionRecord> & { id?: string }
  if (typeof payload.instanceIndex !== 'number') {
    res.status(400).json({ success: false, error: 'Invalid payload' })
    return
  }
  const positions = readJSON<PositionRecord[]>('positions.json', [])
  const id = payload.id ?? `${payload.group ?? 'default'}:${payload.instanceIndex}`
  const record: PositionRecord = {
    id,
    group: payload.group ?? 'default',
    instanceIndex: payload.instanceIndex!,
    x: Number(payload.x ?? 0),
    y: Number(payload.y ?? 0),
    z: Number(payload.z ?? 0),
    updatedAt: new Date().toISOString(),
  }
  const idx = positions.findIndex(p => p.id === id)
  if (idx >= 0) positions[idx] = record
  else positions.push(record)
  writeJSON('positions.json', positions)
  res.json({ success: true, record })
})

export default router


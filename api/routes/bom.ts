import { Router, type Request, type Response } from 'express'
import { writeExportFile, getExportPublicPath, readJSON, writeJSON, listExports, readExportFile } from '../lib/storage.js'
import crypto from 'crypto'

type BomItem = {
  partNo: string
  name: string
  spec: string
  qty: number
  unit: string
  remark?: string
}

const router = Router()

router.get('/history', (req: Request, res: Response) => {
  const history = readJSON<{ id: string; type: 'excel' | 'pdf'; filename: string; createdAt: string; count: number; }[]>('export-history.json', [])
  res.json({ success: true, history })
})

router.get('/exports', (req: Request, res: Response) => {
  const files = listExports()
  res.json({ success: true, files })
})

router.get('/file/:name', (req: Request, res: Response) => {
  const name = req.params.name
  try {
    const buf = readExportFile(name)
    if (name.endsWith('.xls')) {
      res.setHeader('Content-Type', 'application/vnd.ms-excel')
    } else if (name.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
    }
    res.send(buf)
  } catch (e) {
    res.status(404).json({ success: false, error: 'Not Found' })
  }
})

function bomToExcelHtml(items: BomItem[]): string {
  const rows = items.map(i => `<tr><td>${i.partNo}</td><td>${i.name}</td><td>${i.spec}</td><td>${i.qty}</td><td>${i.unit}</td><td>${i.remark ?? ''}</td></tr>`).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BOM</title></head><body><table border="1" cellspacing="0" cellpadding="4"><thead><tr><th>零件编号</th><th>名称</th><th>规格</th><th>数量</th><th>单位</th><th>备注</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
}

function bomToPrintHtml(items: BomItem[], title: string): string {
  const rows = items.map(i => `<tr><td>${i.partNo}</td><td>${i.name}</td><td>${i.spec}</td><td>${i.qty}</td><td>${i.unit}</td><td>${i.remark ?? ''}</td></tr>`).join('\n')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #888;padding:6px;text-align:left}</style></head><body><h2>${title}</h2><table><thead><tr><th>零件编号</th><th>名称</th><th>规格</th><th>数量</th><th>单位</th><th>备注</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`
}

router.post('/export/excel', (req: Request, res: Response) => {
  const items: BomItem[] = Array.isArray(req.body?.items) ? req.body.items : []
  const pageSize = Math.max(1, Number(req.body?.pageSize ?? items.length))
  const batches: BomItem[][] = []
  for (let i = 0; i < items.length; i += pageSize) {
    batches.push(items.slice(i, i + pageSize))
  }
  const result: { url: string; filename: string }[] = []
  for (let b = 0; b < batches.length; b++) {
    const html = bomToExcelHtml(batches[b])
    const filename = `bom_${Date.now()}_${b + 1}.xls`
    writeExportFile(filename, html)
    result.push({ url: getExportPublicPath(filename), filename })
    const history = readJSON<any[]>('export-history.json', [])
    history.push({ id: crypto.randomUUID(), type: 'excel', filename, createdAt: new Date().toISOString(), count: batches[b].length })
    writeJSON('export-history.json', history)
  }
  res.json({ success: true, files: result })
})

router.post('/export/pdf', (req: Request, res: Response) => {
  const items: BomItem[] = Array.isArray(req.body?.items) ? req.body.items : []
  const pageSize = Math.max(1, Number(req.body?.pageSize ?? items.length))
  const batches: BomItem[][] = []
  for (let i = 0; i < items.length; i += pageSize) {
    batches.push(items.slice(i, i + pageSize))
  }
  const result: { url: string; filename: string }[] = []
  for (let b = 0; b < batches.length; b++) {
    const html = bomToPrintHtml(batches[b], `BOM 第${b + 1}批`)
    const filename = `bom_${Date.now()}_${b + 1}.html`
    writeExportFile(filename, html)
    result.push({ url: getExportPublicPath(filename), filename })
    const history = readJSON<any[]>('export-history.json', [])
    history.push({ id: crypto.randomUUID(), type: 'pdf', filename, createdAt: new Date().toISOString(), count: batches[b].length })
    writeJSON('export-history.json', history)
  }
  res.json({ success: true, files: result })
})

export default router


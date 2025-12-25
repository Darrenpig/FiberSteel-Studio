import { useEffect, useRef, useState } from 'react'
// fabric will be loaded dynamically to avoid ESM named export issues
import { Card, Segmented, Button, Space, Tooltip, InputNumber, Select } from 'antd'
import { cn } from '@/lib/utils'
import { Undo2, Redo2 } from 'lucide-react'

type Tool = 'select' | 'line' | 'rect'

export default function CAD() {
  const canvasRef = useRef<any>(null)
  const fabricRef = useRef<any>(null)
  const toolRef = useRef<Tool>('select')
  const gridSize = 10
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const historyLockRef = useRef(false)
  const drawingActiveRef = useRef(false)
  const idSeedRef = useRef(1)
  const [bindingMode, setBindingMode] = useState<'strong' | 'weak'>('strong')
  const [boundItems, setBoundItems] = useState<Array<{ id: string; type: string; x: number; y: number; w?: number; h?: number; angle?: number }>>([])
  const pendingApplyRef = useRef<Record<string, Partial<{ x: number; y: number; w: number; h: number; angle: number }>>>({})
  const applyTimerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gridGroupRef = useRef<any>(null)
  const clipboardRef = useRef<any[]>([])

  const pushHistory = () => {
    const c = canvasRef.current
    if (!c || historyLockRef.current) return
    try {
      const json = JSON.stringify(c.toJSON())
      const last = undoStackRef.current[undoStackRef.current.length - 1]
      if (last !== json) {
        undoStackRef.current.push(json)
        redoStackRef.current = []
      }
    } catch {}
  }

  const undo = () => {
    const c = canvasRef.current
    const fabric = fabricRef.current
    if (!c || !fabric) return
    if (undoStackRef.current.length <= 1) return
    const current = undoStackRef.current.pop()!
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    redoStackRef.current.push(current)
    historyLockRef.current = true
    c.loadFromJSON(prev, () => {
      c.renderAll()
      historyLockRef.current = false
    })
  }

  const redo = () => {
    const c = canvasRef.current
    const fabric = fabricRef.current
    if (!c || !fabric) return
    if (redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    historyLockRef.current = true
    c.loadFromJSON(next, () => {
      c.renderAll()
      historyLockRef.current = false
    })
  }

  const assignId = (o: any) => {
    const d = o.data ?? {}
    if (!d.id) {
      d.id = String(idSeedRef.current++)
      o.data = d
    }
  }

  const updateBoundItems = () => {
    const c = canvasRef.current
    if (!c) return
    const list = c.getObjects().filter((o: any) => o.selectable).map((o: any) => {
      const t = o.type
      const x = Math.round((o.left ?? 0))
      const y = Math.round((o.top ?? 0))
      const angle = o.angle ?? 0
      const w = t === 'rect' ? Math.round(o.width ?? 0) : undefined
      const h = t === 'rect' ? Math.round(o.height ?? 0) : undefined
      assignId(o)
      return { id: String(o.data.id), type: t, x, y, w, h, angle }
    })
    setBoundItems(list)
  }

  const scheduleApply = () => {
    if (applyTimerRef.current) return
    applyTimerRef.current = setTimeout(() => {
      const c = canvasRef.current
      const fabric = fabricRef.current
      if (!c || !fabric) {
        applyTimerRef.current = null
        return
      }
      const pending = pendingApplyRef.current
      const byId: Record<string, any> = {}
      c.getObjects().forEach((o: any) => {
        if (o.selectable) {
          assignId(o)
          byId[String(o.data.id)] = o
        }
      })
      Object.entries(pending).forEach(([id, patch]) => {
        const o = byId[id]
        if (!o) return
        const p: any = {}
        if (patch.x !== undefined) p.left = patch.x
        if (patch.y !== undefined) p.top = patch.y
        if (patch.w !== undefined && o.type === 'rect') p.width = patch.w
        if (patch.h !== undefined && o.type === 'rect') p.height = patch.h
        if (patch.angle !== undefined) p.angle = patch.angle
        if (Object.keys(p).length > 0) {
          o.set(p)
          o.setCoords()
        }
      })
      c.renderAll()
      pendingApplyRef.current = {}
      applyTimerRef.current = null
      pushHistory()
      updateBoundItems()
    }, 150)
  }

  const autoConnectForRect = (rect: any) => {
    const c = canvasRef.current
    if (!c) return
    rect.setCoords()
    const ac = rect.aCoords
    if (!ac) return
    const leftX = Math.min(ac.tl.x, ac.bl.x)
    const rightX = Math.max(ac.tr.x, ac.br.x)
    const topY = Math.min(ac.tl.y, ac.tr.y)
    const bottomY = Math.max(ac.bl.y, ac.br.y)
    const tol = gridSize
    const others = c.getObjects().filter((o: any) => o !== rect && o.selectable && o.type === 'rect')
    others.forEach((o: any) => {
      o.setCoords()
      const oc = o.aCoords
      if (!oc) return
      const oLeftX = Math.min(oc.tl.x, oc.bl.x)
      const oRightX = Math.max(oc.tr.x, oc.br.x)
      const oTopY = Math.min(oc.tl.y, oc.tr.y)
      const oBottomY = Math.max(oc.bl.y, oc.br.y)
      const overlapY = !(bottomY < oTopY || topY > oBottomY)
      const overlapX = !(rightX < oLeftX || leftX > oRightX)
      if (overlapY) {
        if (Math.abs(oLeftX - rightX) <= tol) {
          const dx = rightX - oLeftX
          o.set({ left: (o.left ?? 0) + dx })
          o.setCoords()
        } else if (Math.abs(oRightX - leftX) <= tol) {
          const dx = leftX - oRightX
          o.set({ left: (o.left ?? 0) + dx })
          o.setCoords()
        }
      }
      if (overlapX) {
        if (Math.abs(oTopY - bottomY) <= tol) {
          const dy = bottomY - oTopY
          o.set({ top: (o.top ?? 0) + dy })
          o.setCoords()
        } else if (Math.abs(oBottomY - topY) <= tol) {
          const dy = topY - oBottomY
          o.set({ top: (o.top ?? 0) + dy })
          o.setCoords()
        }
      }
    })
    c.requestRenderAll()
  }

  useEffect(() => {
    let disposed = false
    ;(async () => {
      if (canvasRef.current) return
      const mod = await import('fabric')
      const fabric = (mod as any).fabric ?? (mod as any)
      fabricRef.current = fabric
      const canvas = new fabric.Canvas('cad-canvas', {
        selection: true,
        preserveObjectStacking: true,
      })
      if (disposed) {
        canvas.dispose()
        return
      }
      canvasRef.current = canvas

      const containerEl = containerRef.current
      const width = containerEl?.clientWidth ?? window.innerWidth * 0.75
      const height = containerEl?.clientHeight ?? window.innerHeight - 64
      canvas.setWidth(width)
      canvas.setHeight(height)

      const buildGrid = (w: number, h: number) => {
        const lines: any[] = []
        for (let i = 0; i < w / gridSize; i++) {
          lines.push(
            new fabric.Line([i * gridSize, 0, i * gridSize, h], {
              stroke: '#eee',
              selectable: false,
              evented: false,
            }),
          )
        }
        for (let i = 0; i < h / gridSize; i++) {
          lines.push(
            new fabric.Line([0, i * gridSize, w, i * gridSize], {
              stroke: '#eee',
              selectable: false,
              evented: false,
            }),
          )
        }
        const group = new fabric.Group(lines, { selectable: false, evented: false })
        if (gridGroupRef.current) canvas.remove(gridGroupRef.current)
        gridGroupRef.current = group
        canvas.add(group)
      }
      buildGrid(width, height)
      pushHistory()

      let drawingLine: any | null = null
      let drawingRect: any | null = null

      const snap = (v: number) => Math.round(v / gridSize) * gridSize

      canvas.on('mouse:down', (opt) => {
        const p = canvas.getPointer(opt.e)
        const x = snap(p.x)
        const y = snap(p.y)
        if (toolRef.current === 'line') {
          drawingLine = new fabric.Line([x, y, x, y], {
            stroke: '#333',
            selectable: true,
          })
          canvas.add(drawingLine)
          drawingActiveRef.current = true
          assignId(drawingLine)
        } else if (toolRef.current === 'rect') {
          drawingRect = new fabric.Rect({
            left: x,
            top: y,
            width: 0,
            height: 0,
            fill: 'rgba(0,0,0,0.05)',
            stroke: '#333',
            selectable: true,
          })
          canvas.add(drawingRect)
          drawingActiveRef.current = true
          assignId(drawingRect)
        }
      })

      canvas.on('mouse:move', (opt) => {
        const p = canvas.getPointer(opt.e)
        const x = snap(p.x)
        const y = snap(p.y)
        if (drawingLine) {
          drawingLine.set({ x2: x, y2: y })
          canvas.renderAll()
        } else if (drawingRect) {
          const rect = drawingRect
          const w = x - (rect.left ?? 0)
          const h = y - (rect.top ?? 0)
          rect.set({
            width: Math.abs(w),
            height: Math.abs(h),
            left: w < 0 ? x : rect.left,
            top: h < 0 ? y : rect.top,
          })
          canvas.renderAll()
        }
      })

      canvas.on('mouse:up', () => {
        drawingLine = null
        drawingRect = null
        if (drawingActiveRef.current) {
          pushHistory()
          drawingActiveRef.current = false
        }
        updateBoundItems()
      })
      canvas.on('object:modified', (e: any) => {
        const t = e?.target
        if (t && t.type === 'rect') {
          autoConnectForRect(t)
        }
        pushHistory()
        updateBoundItems()
      })
      canvas.on('object:removed', () => {
        pushHistory()
        updateBoundItems()
      })
      canvas.on('object:added', () => {
        updateBoundItems()
      })
      updateBoundItems()
      if (containerEl) {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const cw = entry.contentRect.width
            const ch = entry.contentRect.height
            canvas.setWidth(cw)
            canvas.setHeight(ch)
            buildGrid(cw, ch)
            canvas.renderAll()
          }
        })
        ro.observe(containerEl)
      }
    })()

    return () => {
      disposed = true
      if (canvasRef.current) {
        canvasRef.current.dispose()
        canvasRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) {
        return
      }
      if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) {
        e.preventDefault()
        redo()
      }
      const c = canvasRef.current
      const fabric = fabricRef.current
      if (!c || !fabric) return
      const selectAll = () => {
        const objs = c.getObjects().filter((o: any) => o.selectable)
        if (objs.length === 0) return
        const sel = new fabric.ActiveSelection(objs, { canvas: c })
        c.setActiveObject(sel)
        c.requestRenderAll()
      }
      const copy = () => {
        const objs = c.getActiveObjects()
        clipboardRef.current = objs.map((o: any) => {
          assignId(o)
          const base: any = { left: o.left ?? 0, top: o.top ?? 0, angle: o.angle ?? 0, stroke: o.stroke, fill: o.fill, selectable: true }
          if (o.type === 'rect') return { type: 'rect', ...base, width: o.width ?? 0, height: o.height ?? 0 }
          if (o.type === 'circle') return { type: 'circle', ...base, radius: o.radius ?? 0 }
          if (o.type === 'line') return { type: 'line', ...base, x1: o.x1 ?? 0, y1: o.y1 ?? 0, x2: o.x2 ?? 0, y2: o.y2 ?? 0 }
          return null
        }).filter(Boolean)
      }
      const paste = () => {
        if (clipboardRef.current.length === 0) return
        const offset = 10
        clipboardRef.current.forEach((item: any) => {
          if (item.type === 'rect') {
            const o = new fabric.Rect({ left: item.left + offset, top: item.top + offset, width: item.width, height: item.height, fill: item.fill, stroke: item.stroke, selectable: true, angle: item.angle })
            assignId(o)
            c.add(o)
          } else if (item.type === 'circle') {
            const o = new fabric.Circle({ left: item.left + offset, top: item.top + offset, radius: item.radius, fill: item.fill, stroke: item.stroke, selectable: true, angle: item.angle })
            assignId(o)
            c.add(o)
          } else if (item.type === 'line') {
            const o = new fabric.Line([item.x1, item.y1, item.x2, item.y2], { left: item.left + offset, top: item.top + offset, stroke: item.stroke, selectable: true, angle: item.angle })
            assignId(o)
            c.add(o)
          }
        })
        c.requestRenderAll()
        pushHistory()
        updateBoundItems()
      }
      const cut = () => {
        copy()
        const objs = c.getActiveObjects()
        objs.forEach((o: any) => c.remove(o))
        c.discardActiveObject()
        c.requestRenderAll()
        pushHistory()
        updateBoundItems()
      }
      const del = () => {
        const objs = c.getActiveObjects()
        objs.forEach((o: any) => c.remove(o))
        c.discardActiveObject()
        c.requestRenderAll()
        pushHistory()
        updateBoundItems()
      }
      if (e.ctrlKey && e.code === 'KeyA') {
        e.preventDefault()
        selectAll()
      }
      if (e.ctrlKey && e.code === 'KeyC') {
        e.preventDefault()
        copy()
      }
      if (e.ctrlKey && e.code === 'KeyV') {
        e.preventDefault()
        paste()
      }
      if (e.ctrlKey && e.code === 'KeyX') {
        e.preventDefault()
        cut()
      }
      if (e.code === 'Delete') {
        e.preventDefault()
        del()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={cn('grid h-[calc(100vh-16px)] grid-cols-12 gap-2 p-2')}> 
      <Card className="col-span-9 h-full p-0" styles={{ body: { height: '100%', padding: 0 } }}>
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
          <canvas id="cad-canvas" />
          <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="flex gap-0.5 bg-white/90 p-1 rounded border shadow-sm pointer-events-auto">
              <Tooltip title="撤销" placement="right">
                <Button type="text" size="small" onClick={undo}>
                  <Undo2 size={16} className="mr-1" /> 撤销
                </Button>
              </Tooltip>
              <Tooltip title="重做" placement="right">
                <Button type="text" size="small" onClick={redo}>
                  <Redo2 size={16} className="mr-1" /> 重做
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </Card>
      <Card title="绘图工具" className="col-span-3 h-full overflow-auto">
        <Segmented
          options={[
            { label: '选择', value: 'select' },
            { label: '直线', value: 'line' },
            { label: '矩形', value: 'rect' },
          ]}
          onChange={(v) => {
            toolRef.current = v as Tool
            canvasRef.current?.discardActiveObject()
          }}
          defaultValue="select"
        />
        <Space direction="vertical" className="mt-3" style={{ width: '100%' }}>
          <Button
            type="primary"
            onClick={() => {
              const c = canvasRef.current
              const fabric = fabricRef.current
              if (!c || !fabric) return
              const active = c.getActiveObjects()
              let cx = gridSize * 10
              let cy = gridSize * 10
              let angle = 0
              if (active.length === 1 && active[0] instanceof fabric.Rect) {
                const rect = active[0] as any
                const center = rect.getCenterPoint()
                cx = Math.round(center.x / gridSize) * gridSize
                cy = Math.round(center.y / gridSize) * gridSize
                angle = rect.angle ?? 0
              }
              const plateWidth = 40
              const plateHeight = 20
              const holeDiameter = 3.2
              const holeRadius = holeDiameter / 2
              const holeDistance = 20
              const plate = new fabric.Rect({
                left: cx - plateWidth / 2,
                top: cy - plateHeight / 2,
                width: plateWidth,
                height: plateHeight,
                fill: 'rgba(0,0,0,0.05)',
                stroke: '#333',
                selectable: true,
                angle,
              })
              const h1 = new fabric.Circle({
                left: cx - holeDistance / 2 - holeRadius,
                top: cy - holeRadius,
                radius: holeRadius,
                fill: 'rgba(0,0,0,0)',
                stroke: '#333',
                selectable: true,
                angle,
              })
              const h2 = new fabric.Circle({
                left: cx + holeDistance / 2 - holeRadius,
                top: cy - holeRadius,
                radius: holeRadius,
                fill: 'rgba(0,0,0,0)',
                stroke: '#333',
                selectable: true,
                angle,
              })
              ;(plate as any).data = { type: 'connector-plate' }
              ;(h1 as any).data = { type: 'm3-hole' }
              ;(h2 as any).data = { type: 'm3-hole' }
              assignId(plate)
              assignId(h1)
              assignId(h2)
              c.add(plate, h1, h2)
              c.setActiveObject(plate)
              c.renderAll()
              updateBoundItems()
            }}
            block
          >
            自动连接板
          </Button>
          <Button
            onClick={() => {
              const c = canvasRef.current
              if (!c) return
              const svg = c.toSVG()
              const blob = new Blob([svg], { type: 'image/svg+xml' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'drawing.svg'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            block
          >
            导出SVG
          </Button>
          <Button
            onClick={() => {
              const c = canvasRef.current
              if (!c) return
              const url = c.toDataURL({ format: 'png', multiplier: 2 })
              const a = document.createElement('a')
              a.href = url
              a.download = 'drawing.png'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }}
            block
          >
            导出PNG
          </Button>
          <Button
            onClick={() => {
              const c = canvasRef.current
              const fabric = fabricRef.current
              if (!c || !fabric) return
              const codes: (string | number)[] = []
              const push = (code: string | number, value?: string | number) => {
                codes.push(String(code))
                if (value !== undefined) codes.push(String(value))
              }
              push(0, 'SECTION')
              push(2, 'HEADER')
              push(9, '$INSUNITS')
              push(70, 4)
              push(0, 'ENDSEC')
              push(0, 'SECTION')
              push(2, 'ENTITIES')
              const objects = c.getObjects().filter((o) => o.selectable)
              objects.forEach((o) => {
                o.setCoords()
                if (o.type === 'line') {
                  const line = o as any
                  const p1 = new fabric.Point(line.x1 ?? 0, line.y1 ?? 0)
                  const p2 = new fabric.Point(line.x2 ?? 0, line.y2 ?? 0)
                  const m = line.calcTransformMatrix()
                  const tp1 = fabric.util.transformPoint(p1, m)
                  const tp2 = fabric.util.transformPoint(p2, m)
                  push(0, 'LINE')
                  push(8, 'ENGRAVE')
                  push(10, tp1.x)
                  push(20, tp1.y)
                  push(11, tp2.x)
                  push(21, tp2.y)
                } else if (o.type === 'circle') {
                  const circle = o as any
                  const center = circle.getCenterPoint()
                  push(0, 'CIRCLE')
                  push(8, 'ENGRAVE')
                  push(10, center.x)
                  push(20, center.y)
                  push(40, circle.radius ?? 0)
                } else if (o.type === 'rect') {
                  const rect = o as any
                  const tl = rect.aCoords?.tl
                  const tr = rect.aCoords?.tr
                  const br = rect.aCoords?.br
                  const bl = rect.aCoords?.bl
                  if (tl && tr && br && bl) {
                    push(0, 'LWPOLYLINE')
                    push(8, 'ENGRAVE')
                    push(90, 4)
                    push(70, 1)
                    ;[tl, tr, br, bl].forEach((p) => {
                      push(10, p.x)
                      push(20, p.y)
                    })
                  }
                }
              })
              push(0, 'ENDSEC')
              push(0, 'EOF')
              const content = codes.join('\n')
              const blob = new Blob([content], { type: 'application/dxf' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'drawing.dxf'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            block
          >
            导出DXF
          </Button>
          <Button
            danger
            onClick={() => {
              const c = canvasRef.current
              if (!c) return
              c.getObjects().forEach((o) => {
                if (o.selectable) c.remove(o)
              })
              c.renderAll()
              pushHistory()
            }}
            block
          >
            清空绘图
          </Button>
          <Card size="small" title="绑定">
            <div className="mb-2">
              <Select
                value={bindingMode}
                options={[
                  { label: '强绑定', value: 'strong' },
                  { label: '弱绑定', value: 'weak' },
                ]}
                onChange={(v) => setBindingMode(v as any)}
                style={{ width: '100%' }}
                size="small"
              />
            </div>
            <div className="space-y-2">
              {boundItems.map((item) => (
                <div key={item.id} className="border rounded p-2">
                  <div className="text-xs mb-1">{item.type} #{item.id}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <InputNumber
                      size="small"
                      value={item.x}
                      step={1}
                      onChange={(v) => {
                        const val = Number(v)
                        if (bindingMode === 'strong') {
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), x: val }
                          scheduleApply()
                        } else {
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), x: val }
                          scheduleApply()
                        }
                        setBoundItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, x: val } : it)))
                      }}
                      placeholder="X"
                    />
                    <InputNumber
                      size="small"
                      value={item.y}
                      step={1}
                      onChange={(v) => {
                        const val = Number(v)
                        if (bindingMode === 'strong') {
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), y: val }
                          scheduleApply()
                        } else {
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), y: val }
                          scheduleApply()
                        }
                        setBoundItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, y: val } : it)))
                      }}
                      placeholder="Y"
                    />
                    {item.w !== undefined && (
                      <InputNumber
                        size="small"
                        value={item.w}
                        step={1}
                        onChange={(v) => {
                          const val = Number(v)
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), w: val }
                          scheduleApply()
                          setBoundItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, w: val } : it)))
                        }}
                        placeholder="W"
                      />
                    )}
                    {item.h !== undefined && (
                      <InputNumber
                        size="small"
                        value={item.h}
                        step={1}
                        onChange={(v) => {
                          const val = Number(v)
                          pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), h: val }
                          scheduleApply()
                          setBoundItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, h: val } : it)))
                        }}
                        placeholder="H"
                      />
                    )}
                    <InputNumber
                      size="small"
                      value={item.angle ?? 0}
                      step={1}
                      onChange={(v) => {
                        const val = Number(v)
                        pendingApplyRef.current[item.id] = { ...(pendingApplyRef.current[item.id] ?? {}), angle: val }
                        scheduleApply()
                        setBoundItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, angle: val } : it)))
                      }}
                      placeholder="角度"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Space>
      </Card>
    </div>
  )
}


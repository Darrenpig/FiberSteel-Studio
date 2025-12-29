import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { useModelingStore } from '@/store/modeling'
import { useInsertStore } from '@/store/insert'
import { useInteractionStore } from '@/store/interaction'
import { Card, Button, Tooltip, Collapse, Form, InputNumber, Select, Switch, Segmented, message } from 'antd'
import { cn } from '@/lib/utils'
import { calcSquareTubeProps, calcPriceCny } from '@/lib/properties'
import { downloadText } from '@/lib/download'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { 
  MousePointer2, BoxSelect, Box, MoveDown, Settings, Ruler, Circle, Undo2, Redo2, Scissors
} from 'lucide-react'
import { AxisSelector, AxisType } from '@/components/designer/AxisSelector'
import { ViewportToolbar } from '@/components/designer/ViewportToolbar'
import { TopBar } from '@/components/designer/TopBar'
import { SidebarPanel } from '@/components/designer/SidebarPanel'
import { PricePanel } from '@/components/designer/PricePanel'
import { ContextMenu } from '@/components/designer/ContextMenu'

export default function Designer() {
  const squareTube = useModelingStore((s) => s.squareTube)
  const setSquareTube = useModelingStore((s) => s.setSquareTube)
  const tubeArray = useModelingStore((s) => s.tubeArray)
  const setTubeArray = useModelingStore((s) => s.setTubeArray)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const tubesGroupRef = useRef<THREE.Group | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const topCamRef = useRef<THREE.OrthographicCamera | null>(null)
  const frontCamRef = useRef<THREE.OrthographicCamera | null>(null)
  const rightCamRef = useRef<THREE.OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const exporterRef = useRef<STLExporter | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<OutlinePass | null>(null)
  const highlightMeshRef = useRef<THREE.Mesh | null>(null)
  const insertPlaneRef = useRef<THREE.Plane | null>(null)
  const dragAxesRef = useRef<THREE.Group | null>(null)
  const hudSceneRef = useRef<THREE.Scene | null>(null)
  const hudCameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const hudAxesRef = useRef<THREE.Group | null>(null)
  const [insertRotationY, setInsertRotationY] = useState<number>(0)
  const [insertAxis, setInsertAxis] = useState<'X' | 'Y' | 'Z'>('Z')
  const [selectedRotateAxis, setSelectedRotateAxis] = useState<'X' | 'Y' | 'Z'>('Y')
  useEffect(() => { axisRef.current = selectedRotateAxis }, [selectedRotateAxis])
  const lengthHelperRef = useRef<THREE.Group | null>(null)
  const lengthAdjustStateRef = useRef<{ active: boolean; base: THREE.Vector3; dir: THREE.Vector3 } | null>(null)
  const lengthCandidateRef = useRef<number | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const axisRef = useRef<'X' | 'Y' | 'Z'>('Y')
  const [remoteProps, setRemoteProps] = useState<null | { volume: number; weight: number; surfaceArea: number }>(null)
  const positionOverrides = useModelingStore((s) => s.positionOverrides)
  const setPosition = useModelingStore((s) => s.setPosition)
  const rotations = useModelingStore((s) => s.rotations)
  const setRotationY = useModelingStore((s) => s.setRotationY)
  const setRotationX = useModelingStore((s) => s.setRotationX)
  const setRotationZ = useModelingStore((s) => s.setRotationZ)
  const locks = useModelingStore((s) => s.locks)
  const toggleLock = useModelingStore((s) => s.toggleLock)
  const holes = useModelingStore((s) => s.holes)
  const toggleHoles = useModelingStore((s) => s.toggleHoles)
  const holeSpec = useModelingStore((s) => s.holeSpec)
  const setHoleSpec = useModelingStore((s) => s.setHoleSpec)
  const undo = useModelingStore((s) => s.undo)
  const redo = useModelingStore((s) => s.redo)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [deletedMap, setDeletedMap] = useState<Record<number, boolean>>({})
  const draggingRef = useRef<{ index: number; startX: number; startZ: number } | null>(null)
  const raycasterRef = useRef<THREE.Raycaster | null>(null)
  const dragAxisRef = useRef<'x' | 'y' | 'z' | null>(null)
  const [lang, setLang] = useState<'en' | 'zh'>('zh')
  const t = (key: string) => {
    const d: Record<string, { zh: string; en: string }> = {
      file: { zh: '文件', en: 'File' },
      edit: { zh: '编辑', en: 'Edit' },
      view: { zh: '视图', en: 'View' },
      draw: { zh: '绘图', en: 'Draw' },
      widgets: { zh: '控件', en: 'Widgets' },
      help: { zh: '帮助', en: 'Help' },
      new: { zh: '新建', en: 'New' },
      open: { zh: '打开', en: 'Open' },
      save: { zh: '保存', en: 'Save' },
      export: { zh: '导出', en: 'Export' },
      undo: { zh: '撤销', en: 'Undo' },
      redo: { zh: '重做', en: 'Redo' },
      copy: { zh: '复制', en: 'Copy' },
      paste: { zh: '粘贴', en: 'Paste' },
      resetView: { zh: '重置视图', en: 'Reset View' },
      select: { zh: '选择', en: 'Select' },
      extrude: { zh: '拉伸', en: 'Extrude' },
      angle: { zh: '角度', en: 'Ang...' },
      price: { zh: '价格', en: 'Price' },
      properties: { zh: '属性', en: 'Properties' },
      steering: { zh: '方向盘', en: 'Steering Wheel' },
      viewCube: { zh: '最佳视角', en: 'Best View' },
      man: { zh: '人物', en: 'Man' },
      showProfiles: { zh: '仅型材', en: 'Show only the profiles' },
      lowDetail: { zh: '低细节', en: 'Low detail mode' },
    }
    return d[key]?.[lang] ?? key
  }
  const [showPricePanel, setShowPricePanel] = useState(true)
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true)
  const [onlyProfiles, setOnlyProfiles] = useState(false)
  const [lowDetail, setLowDetail] = useState(false)
  const gridRef = useRef<THREE.GridHelper | null>(null)
  const boardRef = useRef<THREE.Mesh | null>(null)
  const axesRef = useRef<THREE.Group | null>(null)
  const insertMode = useInsertStore((s) => s.insertMode)
  const setInsertMode = useInsertStore((s) => s.setInsertMode)
  const basePoint = useInsertStore((s) => s.basePoint)
  const setBasePoint = useInsertStore((s) => s.setBasePoint)
  const snapSize = useInsertStore((s) => s.snapSize)
  const setSnapSize = useInsertStore((s) => s.setSnapSize)
  const snapToPoint = useInsertStore((s) => s.snapToPoint)
  const setSnapToPoint = useInsertStore((s) => s.setSnapToPoint)
  const addInserted = useInsertStore((s) => s.addInserted)
  const insertGroupRef = useRef<THREE.Group | null>(null)
  const previewMeshRef = useRef<THREE.Mesh | null>(null)
  const plateMeshRef = useRef<THREE.Mesh | null>(null)
  const [plateSelected, setPlateSelected] = useState<boolean>(false)
  const interaction = useInteractionStore((s) => s.interaction)
  const setInteractionAxisLock = useInteractionStore((s) => s.setInteractionAxisLock)
  const setInteractionSnapSize = useInteractionStore((s) => s.setInteractionSnapSize)
  const setInteractionBasePoint = useInteractionStore((s) => s.setInteractionBasePoint)
  const setInteractionRawPoint = useInteractionStore((s) => s.setInteractionRawPoint)
  const setInteractionSolvedPoint = useInteractionStore((s) => s.setInteractionSolvedPoint)
  const resetInteraction = useInteractionStore((s) => s.resetInteraction)
  const [activeTool, setActiveTool] = useState<'select' | 'profile' | 'measure'>('select')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null)
  const [batchEditOpen, setBatchEditOpen] = useState(false)
  const [boxSelection, setBoxSelection] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [selectionModifiers, setSelectionModifiers] = useState<{ ctrl: boolean; shift: boolean; alt: boolean }>({ ctrl: false, shift: false, alt: false })
  const orientHelperRef = useRef<THREE.Group | null>(null)
  
  const inputXRef = useRef<HTMLInputElement>(null)
  const inputYRef = useRef<HTMLInputElement>(null)
  const inputZRef = useRef<HTMLInputElement>(null)

  // Mock icon for MinusSquare since it wasn't imported
  const MinusSquare = ({ className }: { className?: string }) => <div className={cn("w-6 h-6 border-2 border-current rounded-sm flex items-center justify-center", className)}><div className="w-4 h-0.5 bg-current" /></div>

  const tools = [
    { id: 'select', label: '选择', labelEn: 'Select', icon: MousePointer2, action: () => { 
      setInsertMode(false); 
      setActiveTool('select');
      insertPlaneRef.current = null
      setMeasureText('')
      setMeasurePos(null)
      if (previewMeshRef.current) previewMeshRef.current.visible = false
      needsRenderRef.current = true
    } },
    { id: 'profile', label: '方管', labelEn: 'Square Tube', icon: BoxSelect, action: () => { 
      setActiveTool('profile')
      setInsertMode(true)
      setSquareTube({ width: 20, height: 20 })
      setInteractionBasePoint(null)
      if (previewMeshRef.current) {
        previewMeshRef.current.visible = true
        previewMeshRef.current.rotation.y = THREE.MathUtils.degToRad(insertRotationY)
      }
      needsRenderRef.current = true
    } },
    { 
      id: 'holes', 
      label: '定位孔', 
      labelEn: 'Holes', 
      icon: Circle, 
      action: () => {
        if (selectedIndex != null) {
          toggleHoles(selectedIndex)
        }
      } 
    },
    { id: 'box', label: '箱体', labelEn: 'Box', icon: Box, action: () => {} },
    { id: 'rail', label: '导轨', labelEn: 'Rail', icon: MoveDown, action: () => {} },
    { id: 'accessory', label: '配件', labelEn: 'Accessory', icon: Settings, action: () => {} },
    { id: 'foot', label: '地脚', labelEn: 'Foot', icon: MoveDown, action: () => {} },
    { id: 'measure', label: '测量', labelEn: 'Measure', icon: Ruler, action: () => { setInsertMode(false); setActiveTool('measure') } },
    { id: 'cut', label: '剪切', labelEn: 'Cut', icon: Scissors, action: () => { 
      setActiveTool('select')
      setInsertMode(false)
      setCutMode(true)
      setCutFirstIndex(null)
      if (previewMeshRef.current) previewMeshRef.current.visible = false
    } },
  ]

  const [measureText, setMeasureText] = useState<string>('')
  const [measurePos, setMeasurePos] = useState<{ x: number; y: number } | null>(null)
  const needsRenderRef = useRef<boolean>(true)
  const animIdRef = useRef<number | null>(null)
  const [multiViewEnabled, setMultiViewEnabled] = useState<boolean>(false)
  const [cutMode, setCutMode] = useState<boolean>(false)
  const [cutFirstIndex, setCutFirstIndex] = useState<number | null>(null)
  const performCut = (targetIndex: number, toolIndex: number) => {
    setDeletedMap((prev) => ({ ...prev, [targetIndex]: true }))
    needsRenderRef.current = true
  }
  const safeFetch = async (url: string, init?: RequestInit) => {
    try {
      await fetch(url, init)
    } catch {}
  }
  const [rotationSnapEnabled, setRotationSnapEnabled] = useState<boolean>(false)
  const [rotationSnapDeg, setRotationSnapDeg] = useState<number>(15)
  const [rxInput, setRxInput] = useState<number>(0)
  const [ryInput, setRyInput] = useState<number>(0)
  const [rzInput, setRzInput] = useState<number>(0)
  const [cplaneMode, setCplaneMode] = useState<'WorldXY' | 'WorldYZ' | 'WorldZX' | 'Object'>('WorldXY')
  const [orthoEnabled, setOrthoEnabled] = useState<boolean>(false)
  const [osnapEnd, setOsnapEnd] = useState<boolean>(true)
  const [osnapMid, setOsnapMid] = useState<boolean>(false)
  const [touchpadMode, setTouchpadMode] = useState<boolean>(false)
  const sideHoles = useModelingStore((s) => s.sideHoles)
  const setSideHoles = useModelingStore((s) => s.setSideHoles)
  const [sideFaces, setSideFaces] = useState<Array<'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'>>([])
  const [sideDiameter, setSideDiameter] = useState<number>(3.2)
  const [sideSpacing, setSideSpacing] = useState<number>(20)
  const [sideRows, setSideRows] = useState<number>(2)
  const [sideMode, setSideMode] = useState<'single_wall' | 'through'>('single_wall')
  const [sideMargin, setSideMargin] = useState<number>(2)
  const [gridSnapEnabled, setGridSnapEnabled] = useState<boolean>(false)

  const createTubeGeometry = useMemo(() => {
    const cache = new Map<string, THREE.ExtrudeGeometry>()
    return (width: number, height: number, thickness: number, length: number) => {
      const key = `${width}x${height}x${thickness}x${length}`
      const cached = cache.get(key)
      if (cached) return cached.clone()
      const outer = new THREE.Shape()
      const w = width
      const h = height
      outer.moveTo(-w / 2, -h / 2)
      outer.lineTo(w / 2, -h / 2)
      outer.lineTo(w / 2, h / 2)
      outer.lineTo(-w / 2, h / 2)
      outer.lineTo(-w / 2, -h / 2)
      const inner = new THREE.Path()
      const iw = Math.max(0, w - 2 * thickness)
      const ih = Math.max(0, h - 2 * thickness)
      inner.moveTo(-iw / 2, -ih / 2)
      inner.lineTo(iw / 2, -ih / 2)
      inner.lineTo(iw / 2, ih / 2)
      inner.lineTo(-iw / 2, ih / 2)
      inner.lineTo(-iw / 2, -ih / 2)
      outer.holes.push(inner)
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        steps: 1,
        depth: length,
        bevelEnabled: false,
      }
      const base = new THREE.ExtrudeGeometry(outer, extrudeSettings)
      base.translate(0, h / 2, -length / 2)
      cache.set(key, base)
      return base.clone()
    }
  }, [])
  const createPlateGeometry = useMemo(() => {
    const cache = new Map<string, THREE.ExtrudeGeometry>()
    return (width: number, height: number, thickness: number, holes: Array<{ x: number; y: number; r: number }>) => {
      const key = `plate_${width}x${height}x${thickness}_holes:${holes.map(h => `${h.x},${h.y},${h.r}`).join('|')}`
      const cached = cache.get(key)
      if (cached) return cached.clone()
      const shape = new THREE.Shape()
      const w = width
      const h = height
      shape.moveTo(-w / 2, -h / 2)
      shape.lineTo(w / 2, -h / 2)
      shape.lineTo(w / 2, h / 2)
      shape.lineTo(-w / 2, h / 2)
      shape.lineTo(-w / 2, -h / 2)
      holes.forEach((hole) => {
        const p = new THREE.Path()
        p.absarc(hole.x, hole.y, hole.r, 0, Math.PI * 2, false)
        shape.holes.push(p)
      })
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        steps: 1,
        depth: thickness,
        bevelEnabled: false,
      }
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geo.rotateX(-Math.PI / 2)
      geo.translate(0, thickness / 2, 0)
      cache.set(key, geo)
      return geo.clone()
    }
  }, [])

  const mkAxis = (color: string | number, axis: 'x' | 'y' | 'z', scale = 1.0) => {
    const shaftLen = 180 * scale
    const headLen = 20 * scale
    const shaftRadius = 3 * scale
    const headRadius = 8 * scale
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 24)
    const headGeo = new THREE.ConeGeometry(headRadius, headLen, 24)
    const mat = new THREE.MeshBasicMaterial({ color })
    const shaft = new THREE.Mesh(shaftGeo, mat)
    const head = new THREE.Mesh(headGeo, mat)
    shaft.name = `axis-${axis}-shaft`
    head.name = `axis-${axis}-head`
    if (axis === 'y') {
      shaft.position.set(0, shaftLen / 2, 0)
      head.position.set(0, shaftLen + headLen / 2, 0)
    } else if (axis === 'x') {
      shaft.rotation.z = -Math.PI / 2
      shaft.position.set(shaftLen / 2, 0, 0)
      head.rotation.z = -Math.PI / 2
      head.position.set(shaftLen + headLen / 2, 0, 0)
    } else {
      shaft.rotation.x = Math.PI / 2
      shaft.position.set(0, 0, shaftLen / 2)
      head.rotation.x = Math.PI / 2
      head.position.set(0, 0, shaftLen + headLen / 2)
    }
    const g = new THREE.Group()
    g.add(shaft)
    g.add(head)
    g.name = `axis-${axis}`
    return g
  }

  const makeHudLabel = (text: string, color: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(255,255,255,0.0)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'bold 72px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 8
    ctx.lineWidth = 6
    ctx.strokeStyle = '#222'
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = color
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    const spr = new THREE.Sprite(mat)
    spr.scale.set(40, 40, 1)
    return spr
  }

  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#E5E7EB')
    sceneRef.current = scene
    const width = mount.clientWidth || 800
    const height = mount.clientHeight || 600
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(600, 400, 600)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls
    exporterRef.current = new STLExporter()

    const tctrl = new TransformControls(camera, renderer.domElement)
    tctrl.setMode('translate')
    tctrl.setSpace('local')
    tctrl.visible = false
    tctrl.addEventListener('dragging-changed', (e: any) => {
      if (controlsRef.current) controlsRef.current.enabled = !e.value
    })
    scene.add(tctrl)
    transformControlsRef.current = tctrl

    const composer = new EffectComposer(renderer)
    composer.setSize(width, height)
    composer.setPixelRatio(window.devicePixelRatio)
    composerRef.current = composer

    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    const outlinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera)
    outlinePass.edgeStrength = 5
    outlinePass.edgeGlow = 0
    outlinePass.edgeThickness = 1
    outlinePass.pulsePeriod = 0
    outlinePass.visibleEdgeColor.set('#ff8800')
    outlinePass.hiddenEdgeColor.set('#ff8800')
    composer.addPass(outlinePass)
    outlinePassRef.current = outlinePass

    const outputPass = new OutputPass()
    composer.addPass(outputPass)

    const ambient = new THREE.AmbientLight(0xffffff, 0.2)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(5, 10, 7)
    scene.add(dir)
    const grid = new THREE.GridHelper(400, 40, '#dddddd', '#dddddd')
    scene.add(grid)
    gridRef.current = grid
    {
      const boardMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })
      const board = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), boardMat)
      board.rotation.x = -Math.PI / 2
      board.position.y = -0.01
      scene.add(board)
      boardRef.current = board
      const pts = [
        new THREE.Vector3(-200, 0.01, -200),
        new THREE.Vector3(200, 0.01, -200),
        new THREE.Vector3(200, 0.01, 200),
        new THREE.Vector3(-200, 0.01, 200),
        new THREE.Vector3(-200, 0.01, -200),
      ]
      const borderGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const borderMat = new THREE.LineBasicMaterial({ color: '#999999' })
      const border = new THREE.Line(borderGeo, borderMat)
      scene.add(border)
    }
    const originAxes = new THREE.Group()
    
    originAxes.add(mkAxis('#ff0000', 'x'))
    originAxes.add(mkAxis('#00ff00', 'y'))
    originAxes.add(mkAxis('#0000ff', 'z'))
    originAxes.visible = false
    scene.add(originAxes)
    axesRef.current = originAxes
    const makeOrthoCam = () => new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 5000)
    const topCam = makeOrthoCam()
    topCam.position.set(0, 1000, 0)
    topCam.up.set(0, 0, -1)
    topCam.lookAt(0, 0, 0)
    scene.add(topCam)
    topCamRef.current = topCam
    const frontCam = makeOrthoCam()
    frontCam.position.set(0, 0, 1000)
    frontCam.lookAt(0, 0, 0)
    scene.add(frontCam)
    frontCamRef.current = frontCam
    const rightCam = makeOrthoCam()
    rightCam.position.set(1000, 0, 0)
    rightCam.lookAt(0, 0, 0)
    scene.add(rightCam)
    rightCamRef.current = rightCam
    const dragAxes = new THREE.Group()
    dragAxes.add(mkAxis('#ff3b30', 'x', 0.8))
    dragAxes.add(mkAxis('#34c759', 'y', 0.8))
    dragAxes.add(mkAxis('#0a84ff', 'z', 0.8))
    dragAxes.visible = false
    dragAxes.traverse((obj: any) => {
      if (obj.material) {
        obj.material.depthTest = false
      }
    })
    scene.add(dragAxes)
    dragAxesRef.current = dragAxes
    const hudScene = new THREE.Scene()
    hudSceneRef.current = hudScene
    const hudSize = 60
    const hudCam = new THREE.OrthographicCamera(-hudSize, hudSize, hudSize, -hudSize, 0.1, 10)
    hudCam.position.set(0, 0, 5)
    hudCam.lookAt(0, 0, 0)
    hudCameraRef.current = hudCam
    const hudAxes = new THREE.Group()
    hudAxes.add(mkAxis('#ff3b30', 'x', 1.0))
    hudAxes.add(mkAxis('#34c759', 'y', 1.0))
    hudAxes.add(mkAxis('#0a84ff', 'z', 1.0))
    const labelX = makeHudLabel('X', '#ff3b30')
    const labelY = makeHudLabel('Y', '#34c759')
    const labelZ = makeHudLabel('Z', '#0a84ff')
    labelX.position.set(80, 0, 0)
    labelY.position.set(0, 80, 0)
    labelZ.position.set(0, 0, 80)
    hudAxes.add(labelX)
    hudAxes.add(labelY)
    hudAxes.add(labelZ)
    hudAxes.scale.set(1.0, 1.0, 1.0)
    const hudBg = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 })
    )
    hudBg.position.set(0, 0, -0.01)
    hudBg.renderOrder = 0
    hudAxes.renderOrder = 1
    hudScene.add(hudBg)
    hudScene.add(hudAxes)
    hudAxesRef.current = hudAxes
    const tubesGroup = new THREE.Group()
    scene.add(tubesGroup)
    tubesGroupRef.current = tubesGroup
    const insertGroup = new THREE.Group()
    scene.add(insertGroup)
    insertGroupRef.current = insertGroup

    const highlightMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    )
    highlightMesh.visible = false
    
    // Add local axes to highlight mesh
    const localAxes = new THREE.Group()
    localAxes.add(mkAxis('#ff0000', 'x', 0.6))
    localAxes.add(mkAxis('#00ff00', 'y', 0.6))
    localAxes.add(mkAxis('#0000ff', 'z', 0.6))
    if (localAxes instanceof THREE.Object3D) {
      highlightMesh.add(localAxes)
    }
    
    scene.add(highlightMesh)
    highlightMeshRef.current = highlightMesh
    {
      const g = new THREE.Group()
      const planeGeo = new THREE.BoxGeometry(squareTube.width, squareTube.height, 1)
      const planeMat = new THREE.MeshBasicMaterial({ color: '#ff9900', transparent: true, opacity: 0.25 })
      const planeMesh = new THREE.Mesh(planeGeo, planeMat)
      g.add(planeMesh)
      const shaftGeo = new THREE.CylinderGeometry(2, 2, 120, 16)
      const headGeo = new THREE.ConeGeometry(6, 20, 16)
      const mat = new THREE.MeshBasicMaterial({ color: '#4b9ef5' })
      const shaft = new THREE.Mesh(shaftGeo, mat)
      const head = new THREE.Mesh(headGeo, mat)
      shaft.rotation.x = Math.PI / 2
      head.rotation.x = Math.PI / 2
      shaft.position.set(0, 0, 60)
      head.position.set(0, 0, 120)
      g.add(shaft)
      g.add(head)
      g.visible = false
      scene.add(g)
      lengthHelperRef.current = g
    }
    {
      const g = new THREE.Group()
      const shaftGeo = new THREE.CylinderGeometry(2, 2, 60, 16)
      const headGeo = new THREE.ConeGeometry(6, 16, 16)
      const mat = new THREE.MeshBasicMaterial({ color: '#ff3344' })
      const shaft = new THREE.Mesh(shaftGeo, mat)
      const head = new THREE.Mesh(headGeo, mat)
      shaft.rotation.x = Math.PI / 2
      head.rotation.x = Math.PI / 2
      shaft.position.set(0, 0, 30)
      head.position.set(0, 0, 60)
      g.add(shaft)
      g.add(head)
      g.visible = false
      scene.add(g)
      orientHelperRef.current = g
    }

    const buildGroup = () => {
      const geometry = createTubeGeometry(squareTube.width, squareTube.height, squareTube.thickness, squareTube.length)
      const material = squareTube.material === '碳管'
        ? new THREE.MeshStandardMaterial({ color: '#2b2b2b', metalness: 0.2, roughness: 0.85 })
        : new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.9, roughness: 0.25 })
      const instCount = Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY)
      const inst = new THREE.InstancedMesh(geometry, material, instCount)
      let i = 0
      for (let ix = 0; ix < Math.max(1, tubeArray.countX); ix++) {
        for (let iy = 0; iy < Math.max(1, tubeArray.countY); iy++) {
          const mx = new THREE.Matrix4()
          const ov = positionOverrides[i] ?? { x: 0, y: 0, z: 0 }
          const rot = rotations[i]?.ry ?? 0
          const r = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(rot))
          const t = new THREE.Matrix4().makeTranslation(ix * tubeArray.spacingX + ov.x, ov.y, iy * tubeArray.spacingY + ov.z)
          mx.multiplyMatrices(t, r)
          inst.setMatrixAt(i++, mx)
        }
      }
      inst.instanceMatrix.needsUpdate = true
      tubesGroup.clear()
      tubesGroup.add(inst)
      ;(inst as any).name = 'square-tube-array'
    }
    buildGroup()
    {
      const g = createTubeGeometry(squareTube.width, squareTube.height, squareTube.thickness, squareTube.length)
      const m = squareTube.material === '碳管'
        ? new THREE.MeshStandardMaterial({ color: '#253038', transparent: true, opacity: 0.45, metalness: 0.2, roughness: 0.85 })
        : new THREE.MeshStandardMaterial({ color: '#a9b6c6', transparent: true, opacity: 0.45, metalness: 0.9, roughness: 0.25 })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      scene.add(mesh)
      previewMeshRef.current = mesh
    }
    // import latest plate from CAD
    ;(async () => {
      try {
        const res = await fetch('/api/plates/latest')
        const data = await res.json()
        if (data?.plate) {
          const { width, height, thickness, holes } = data.plate
          const g = createPlateGeometry(width, height, thickness, holes ?? [])
          const m = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.2, roughness: 0.8 })
          const plateMesh = new THREE.Mesh(g, m)
          plateMesh.position.set(0, thickness / 2, 0)
          scene.add(plateMesh)
          plateMeshRef.current = plateMesh
        }
      } catch {}
    })()
    const handle = () => {
      controls.update()
      if (needsRenderRef.current) {
        const rendererSize = new THREE.Vector2()
        renderer.getSize(rendererSize)
        if (multiViewEnabled && topCamRef.current && frontCamRef.current && rightCamRef.current) {
          const halfW = Math.floor(rendererSize.x / 2)
          const halfH = Math.floor(rendererSize.y / 2)
          renderer.setScissorTest(true)
          // Top-left: Top
          renderer.setViewport(0, halfH, halfW, halfH)
          renderer.setScissor(0, halfH, halfW, halfH)
          renderer.render(scene, topCamRef.current)
          // Top-right: Front
          renderer.setViewport(halfW, halfH, halfW, halfH)
          renderer.setScissor(halfW, halfH, halfW, halfH)
          renderer.render(scene, frontCamRef.current)
          // Bottom-left: Right
          renderer.setViewport(0, 0, halfW, halfH)
          renderer.setScissor(0, 0, halfW, halfH)
          renderer.render(scene, rightCamRef.current)
          // Bottom-right: Perspective (main camera)
          renderer.setViewport(halfW, 0, halfW, halfH)
          renderer.setScissor(halfW, 0, halfW, halfH)
          renderer.render(scene, camera)
          // HUD render in bottom-right only to avoid clutter
          const overlay = Math.min(halfW, halfH) * 0.35
          const margin = 8
          const hx = halfW + halfW - overlay - margin
          const hy = overlay + margin
          if (hudAxesRef.current && hudCameraRef.current && hudSceneRef.current) {
            hudAxesRef.current.quaternion.copy(camera.quaternion)
            renderer.clearDepth()
            renderer.setViewport(hx, hy, overlay, overlay)
            renderer.setScissor(hx, hy, overlay, overlay)
            renderer.render(hudSceneRef.current, hudCameraRef.current)
          }
          renderer.setViewport(0, 0, rendererSize.x, rendererSize.y)
          renderer.setScissor(0, 0, rendererSize.x, rendererSize.y)
          renderer.setScissorTest(false)
        } else {
          composer.render()
          const overlay = 140
          const margin = 12
          const x = rendererSize.x - overlay - margin
          const y = margin
          if (hudAxesRef.current && hudCameraRef.current && hudSceneRef.current) {
            hudAxesRef.current.quaternion.copy(camera.quaternion)
            renderer.clearDepth()
            renderer.setScissorTest(true)
            renderer.setViewport(x, y, overlay, overlay)
            renderer.setScissor(x, y, overlay, overlay)
            renderer.render(hudSceneRef.current, hudCameraRef.current)
            renderer.setViewport(0, 0, rendererSize.x, rendererSize.y)
            renderer.setScissor(0, 0, rendererSize.x, rendererSize.y)
            renderer.setScissorTest(false)
          }
        }
        needsRenderRef.current = false
      }
      animIdRef.current = requestAnimationFrame(handle)
    }
    handle()
    controls.addEventListener('change', () => { needsRenderRef.current = true })
    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(() => {
      onResize()
    })
    resizeObserver.observe(mount)
    const updateHelpers = () => {
      if (gridRef.current) gridRef.current.visible = !onlyProfiles
      if (axesRef.current) axesRef.current.visible = false
    }
    updateHelpers()
    raycasterRef.current = new THREE.Raycaster()
    const dom = renderer.domElement
    controls.enabled = false
    const CONTROL_OVERLAY = 140
    const CONTROL_MARGIN = 12
    const inControlRegion = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const left = rect.width - CONTROL_OVERLAY - CONTROL_MARGIN
      const right = rect.width - CONTROL_MARGIN
      const top = CONTROL_MARGIN
      const bottom = CONTROL_MARGIN + CONTROL_OVERLAY
      return x >= left && x <= right && y >= top && y <= bottom
    }
    const toNdc = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      return new THREE.Vector2(x, y)
    }
    const getScreenPosition = (worldPos: THREE.Vector3) => {
      const v = worldPos.clone().project(camera)
      const rect = dom.getBoundingClientRect()
      const x = (v.x + 1) / 2 * rect.width
      const y = (-v.y + 1) / 2 * rect.height
      return { x, y }
    }
    const isPointInBox = (point: { x: number; y: number }, box: { start: { x: number; y: number }; current: { x: number; y: number } }) => {
      const minX = Math.min(box.start.x, box.current.x)
      const maxX = Math.max(box.start.x, box.current.x)
      const minY = Math.min(box.start.y, box.current.y)
      const maxY = Math.max(box.start.y, box.current.y)
      return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    }
    const onPointerDownControl = (e: MouseEvent) => {
      const active = inControlRegion(e)
      controls.enabled = active
      if (!active) return
    }
    const onPointerUpControl = () => {
      controls.enabled = false
    }
    const onWheelControl = (e: WheelEvent) => {
      if (!inControlRegion(e as any)) {
        e.preventDefault()
      } else {
        controls.enabled = true
      }
    }
    dom.addEventListener('pointerdown', onPointerDownControl)
    dom.addEventListener('pointerup', onPointerUpControl)
    dom.addEventListener('wheel', onWheelControl, { passive: false })
    const pointerDown = (e: MouseEvent) => {
      // Update modifier key states
      setSelectionModifiers({
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      })
      
      // Check if click is in control region (for viewport rotation)
      const inControl = inControlRegion(e)
      
      // If not in control region and no special modes active, start box selection
      if (!inControl && !insertMode && !cutMode && activeTool === 'select') {
        const rect = dom.getBoundingClientRect()
        const startX = e.clientX - rect.left
        const startY = e.clientY - rect.top
        
        // Store modifier state for this selection operation
        const modifiers = {
          ctrl: e.ctrlKey || e.metaKey,
          shift: e.shiftKey,
          alt: e.altKey
        }
        
        setBoxSelection({ 
          start: { x: startX, y: startY }, 
          current: { x: startX, y: startY }
        })
        
        // Disable viewport controls during box selection
        if (controlsRef.current) controlsRef.current.enabled = false
        return
      }
      
      const ndc = toNdc(e)
      const raycaster = raycasterRef.current!
      raycaster.setFromCamera(ndc, camera)
      if (plateMeshRef.current) {
        const hits = raycaster.intersectObject(plateMeshRef.current, true)
        if (hits.length > 0) {
          setPlateSelected(true)
          if (transformControlsRef.current) {
            transformControlsRef.current.attach(plateMeshRef.current)
            transformControlsRef.current.visible = true
            transformControlsRef.current.setMode('translate')
          }
          needsRenderRef.current = true
          return
        } else {
          setPlateSelected(false)
          if (transformControlsRef.current && transformControlsRef.current.object === plateMeshRef.current) {
            transformControlsRef.current.detach()
            transformControlsRef.current.visible = false
          }
        }
      }
      
      if (cutMode) {
        const groupRef = tubesGroupRef.current
        const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
        if (!instanced) return
        const intersects = raycaster.intersectObject(instanced, true)
        if (intersects.length > 0 && typeof (intersects[0] as any).instanceId === 'number') {
          const packedId = (intersects[0] as any).instanceId as number
          const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
          const index = indexMap ? indexMap[packedId] : packedId
          if (cutFirstIndex == null) {
            setCutFirstIndex(index)
            setSelectedIndex(index)
          } else {
            const targetIndex = cutFirstIndex
            const toolIndex = index
            setCutMode(false)
            setCutFirstIndex(null)
            performCut(targetIndex, toolIndex)
          }
        }
        return
      }
      
      if (insertMode) {
        const snap = (v: number) => Math.round(v / snapSize) * snapSize
        const pos = new THREE.Vector3()
        
          // Try intersecting objects first
          const instanced = tubesGroupRef.current?.children[0] as THREE.InstancedMesh
          let hitObject = false
          let planeNormal: THREE.Vector3 | null = null
          if (instanced) {
               const intersects = raycaster.intersectObject(instanced, false)
               if (intersects.length > 0) {
                   pos.copy(intersects[0].point)
                   hitObject = true
                   
                   // Snap to closest vertex if enabled
                   if (snapToPoint) {
                       const inter = intersects[0]
                       if (inter.face && inter.object) {
                           const mesh = inter.object as THREE.Mesh
                           const geometry = mesh.geometry
                           const posAttr = geometry.attributes.position
                           const a = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.a)
                           const b = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.b)
                           const c = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.c)
                           
                           // Transform vertices to world space
                           // Note: InstancedMesh intersection point is already in world space, 
                           // but we need to handle instance matrix if we want to get vertex positions correctly.
                           // However, InstancedMesh raycast returns intersection with the specific instance.
                           // The 'object' in intersection is the InstancedMesh itself.
                           // The intersection point is correct.
                           // We need to find the closest vertex of the face in world space.
                           
                           // The standard way to get world vertices from instanced mesh intersection:
                           // 1. Get the instance matrix
                           // 2. Apply it to the geometry vertices
                           
                           const instanceId = inter.instanceId!
                           const matrix = new THREE.Matrix4()
                           instanced.getMatrixAt(instanceId, matrix)
                           
                           a.applyMatrix4(matrix)
                           b.applyMatrix4(matrix)
                           c.applyMatrix4(matrix)
                           
                           const ab = new THREE.Vector3().subVectors(b, a)
                           const ac = new THREE.Vector3().subVectors(c, a)
                           planeNormal = new THREE.Vector3().crossVectors(ab, ac).normalize()
                           
                           const da = pos.distanceToSquared(a)
                           const db = pos.distanceToSquared(b)
                           const dc = pos.distanceToSquared(c)
                           
                           if (da <= db && da <= dc) pos.copy(a)
                           else if (db <= da && db <= dc) pos.copy(b)
                           else pos.copy(c)
                       }
                   }
               }
          }
        
        if (!hitObject) {
            const board = boardRef.current
            if (board) {
              const ib = raycaster.intersectObject(board, false)
              if (ib.length > 0) {
                pos.copy(ib[0].point)
                hitObject = true
                planeNormal = new THREE.Vector3(0, 1, 0)
              }
            }
        }
        if (!hitObject) return

        let bp = { x: snap(pos.x), y: snap(pos.y), z: snap(pos.z) }
        
        // If snapped to point (vertex), use exact position
        if (snapToPoint && hitObject) {
            bp = { x: pos.x, y: pos.y, z: pos.z }
        }

        setBasePoint(bp)
        setInteractionBasePoint(new THREE.Vector3(bp.x, bp.y, bp.z))
        setInteractionRawPoint(new THREE.Vector3(bp.x, bp.y, bp.z))
        setInteractionSolvedPoint(new THREE.Vector3(bp.x, bp.y, bp.z))
        if (previewMeshRef.current) {
          previewMeshRef.current.position.set(bp.x, bp.y, bp.z)
          previewMeshRef.current.visible = true
          previewMeshRef.current.rotation.y = THREE.MathUtils.degToRad(insertRotationY)
        }
        if (orientHelperRef.current) {
          orientHelperRef.current.position.set(bp.x, bp.y, bp.z)
          orientHelperRef.current.visible = true
        }
        if (cplaneMode === 'WorldXY') {
          insertPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(bp.x, bp.y, bp.z))
        } else if (cplaneMode === 'WorldYZ') {
          insertPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(bp.x, bp.y, bp.z))
        } else if (cplaneMode === 'WorldZX') {
          insertPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(bp.x, bp.y, bp.z))
        } else if (cplaneMode === 'Object' && highlightMeshRef.current) {
          const yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(highlightMeshRef.current.quaternion).normalize()
          insertPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(yAxis, new THREE.Vector3(bp.x, bp.y, bp.z))
        } else if (planeNormal) {
          insertPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, new THREE.Vector3(bp.x, bp.y, bp.z))
        }
        setMeasureText('0 mm')
        const toScreen = (p: THREE.Vector3) => {
          const v = p.clone().project(camera)
          const rect = dom.getBoundingClientRect()
          const sx = (v.x + 1) / 2 * rect.width
          const sy = (-v.y + 1) / 2 * rect.height
          setMeasurePos({ x: sx, y: sy })
        }
        toScreen(new THREE.Vector3(bp.x, bp.y, bp.z))
        return
      }
      const groupRef = tubesGroupRef.current
      const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
      if (!instanced) return
      
      if (selectedIndex != null && highlightMeshRef.current && highlightMeshRef.current.visible) {
        const axisHits = raycaster.intersectObject(highlightMeshRef.current, true)
        if (axisHits.length > 0) {
          let obj = axisHits[0].object
          while (obj && !obj.name?.startsWith('axis-') && obj.parent) {
            obj = obj.parent
          }
          if (obj && obj.name && obj.name.startsWith('axis-')) {
            const axis = obj.name.includes('axis-x') ? 'x' : obj.name.includes('axis-y') ? 'y' : 'z'
            const dirLocal =
              axis === 'x' ? new THREE.Vector3(1, 0, 0) : axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
            const dirWorld = dirLocal.clone().applyQuaternion(highlightMeshRef.current.quaternion).normalize()
            const step = Math.max(1, snapSize || 10)
            const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }
            const next = {
              x: ov.x + dirWorld.x * step,
              y: ov.y + dirWorld.y * step,
              z: ov.z + dirWorld.z * step,
            }
            setPosition(selectedIndex, next, true)
            fetch('/api/positions/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }),
            })
            fetch('/api/logs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'move', message: `Axis ${axis} step`, data: { index: selectedIndex, ...next } }),
            })
            return
          }
        }
      }

      let hitIndex: number | null = null
      let hitInter: THREE.Intersection | null = null
      let isAxisHit = false

      // 1. Check Highlight Mesh (Axes)
      if (selectedIndex != null && highlightMeshRef.current && highlightMeshRef.current.visible) {
        const intersects = raycaster.intersectObject(highlightMeshRef.current, true)
        if (intersects.length > 0) {
           hitIndex = selectedIndex
           isAxisHit = true
           // We don't have a specific instance intersection, but we know the index
        }
      }

      // 2. Check Instanced Mesh if not hit axis
      if (hitIndex === null) {
        const intersects = raycaster.intersectObject(instanced, true)
        if (intersects.length > 0 && typeof (intersects[0] as any).instanceId === 'number') {
          const packedId = (intersects[0] as any).instanceId as number
          const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
          hitIndex = indexMap ? indexMap[packedId] : packedId
          hitInter = intersects[0]
        }
      }

      if (hitIndex != null) {
        const index = hitIndex
        if (locks[index]) return
        if (deletedMap[index]) return
        setSelectedIndex(index)
        // Clear box selection when individual object is clicked
        setSelectedIndices(new Set())
        if (insertMode) {
          setInsertMode(false)
          insertPlaneRef.current = null
          setMeasureText('')
          setMeasurePos(null)
          if (previewMeshRef.current) previewMeshRef.current.visible = false
          if (orientHelperRef.current) orientHelperRef.current.visible = false
        }
        
        // Calculate logic for move vs resize
        let isBoundary = false
        if (!isAxisHit && hitInter) {
          const inter = hitInter
          const pWorld = inter.point.clone()
          const m = new THREE.Matrix4()
          instanced.getMatrixAt(inter.instanceId!, m)
          const inv = new THREE.Matrix4().copy(m).invert()
          const pLocal = pWorld.clone().applyMatrix4(inv)
          const half = squareTube.length / 2
          isBoundary = Math.abs(pLocal.z - half) < 10 || Math.abs(pLocal.z + half) < 10
        }

        if (isBoundary && hitInter) {
            const inter = hitInter
            const pWorld = inter.point.clone()
            const m = new THREE.Matrix4()
            instanced.getMatrixAt(inter.instanceId!, m)
            const base = pWorld.clone()
            const dir = new THREE.Vector3(0, 0, 1)
            const r = new THREE.Matrix4().extractRotation(m)
            dir.applyMatrix4(r).normalize()
            const helper = lengthHelperRef.current
            if (helper) {
              helper.position.copy(base)
              const q = new THREE.Quaternion().setFromRotationMatrix(r)
              helper.setRotationFromQuaternion(q)
              helper.visible = true
            }
            setMeasureText('0 mm')
            const v = base.clone().project(camera)
            const rect = dom.getBoundingClientRect()
            const sx = (v.x + 1) / 2 * rect.width
            const sy = (-v.y + 1) / 2 * rect.height
            setMeasurePos({ x: sx, y: sy })
            lengthAdjustStateRef.current = { active: true, base, dir }
            lengthCandidateRef.current = 0
            const tctrl = transformControlsRef.current
            if (tctrl) tctrl.visible = false
        } else {
            // Move mode (Center or Axis)
            const helper = lengthHelperRef.current
            if (helper) helper.visible = false
            lengthAdjustStateRef.current = null
            lengthCandidateRef.current = null

            // If we hit the axis, we need a point to start dragging from.
            // If we hit the instance, we have hitInter.point
            // If we hit the axis, we can use the intersection point on the axis?
            // Yes, let's get the intersection point for axis hit too.
            let startPoint = new THREE.Vector3()
            if (isAxisHit) {
               const intersects = raycaster.intersectObject(highlightMeshRef.current!, true)
               if (intersects.length > 0) {
                 startPoint.copy(intersects[0].point)
                 let obj2: any = intersects[0].object
                 while (obj2 && !obj2.name?.startsWith('axis-') && obj2.parent) obj2 = obj2.parent
                 if (obj2 && obj2.name && obj2.name.startsWith('axis-')) {
                   dragAxisRef.current = obj2.name.includes('axis-x') ? 'x' : obj2.name.includes('axis-y') ? 'y' : 'z'
                 }
               }
            } else if (hitInter) {
               startPoint.copy(hitInter.point)
               dragAxisRef.current = null
            }

            draggingRef.current = { index, startX: startPoint.x, startZ: startPoint.z }
            if (dragAxesRef.current) {
              dragAxesRef.current.position.set(startPoint.x, startPoint.y ?? 0, startPoint.z)
              dragAxesRef.current.visible = true
            }
            if (controlsRef.current) controlsRef.current.enabled = false
        }
      } else {
        setSelectedIndex(null)
        // Clear box selection when clicking on empty space
        setSelectedIndices(new Set())
        draggingRef.current = null
        const helper = lengthHelperRef.current
        if (helper) helper.visible = false
        lengthAdjustStateRef.current = null
        lengthCandidateRef.current = null
        dragAxisRef.current = null
      }
    }
    const pointerMove = (e: MouseEvent) => {
      // Update modifier key states in real-time
      setSelectionModifiers({
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      })
      
      // Handle box selection
      if (boxSelection) {
        const rect = dom.getBoundingClientRect()
        const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
        const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        setBoxSelection(prev => prev ? { ...prev, current: { x: currentX, y: currentY } } : null)
        
        // Find objects within selection box
        const groupRef = tubesGroupRef.current
        const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
        if (instanced) {
          const currentSelection = new Set<number>(selectedIndices)
          const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
          const newlySelected = new Set<number>()
          
          // Check each instance
          for (let i = 0; i < instanced.count; i++) {
            const matrix = new THREE.Matrix4()
            instanced.getMatrixAt(i, matrix)
            const position = new THREE.Vector3().setFromMatrixPosition(matrix)
            const screenPos = getScreenPosition(position)
            
            if (isPointInBox(screenPos, boxSelection)) {
              const index = indexMap ? indexMap[i] : i
              if (!deletedMap[index]) {
                newlySelected.add(index)
              }
            }
          }
          
          // Apply selection based on modifier keys
          if (selectionModifiers.ctrl) {
            // Ctrl: Add to selection (union)
            newlySelected.forEach(idx => currentSelection.add(idx))
          } else if (selectionModifiers.alt) {
            // Alt: Remove from selection (difference)
            newlySelected.forEach(idx => currentSelection.delete(idx))
          } else if (selectionModifiers.shift) {
            // Shift: Toggle selection (symmetric difference)
            newlySelected.forEach(idx => {
              if (currentSelection.has(idx)) {
                currentSelection.delete(idx)
              } else {
                currentSelection.add(idx)
              }
            })
          } else {
            // No modifiers: Replace selection
            newlySelected.forEach(idx => currentSelection.add(idx))
            // Remove items not in the new selection
            currentSelection.forEach(idx => {
              if (!newlySelected.has(idx)) {
                currentSelection.delete(idx)
              }
            })
          }
          
          setSelectedIndices(currentSelection)
        }
        needsRenderRef.current = true
        return
      }
      
      if (lengthAdjustStateRef.current) {
        const ndc = toNdc(e)
        const raycaster = raycasterRef.current!
        raycaster.setFromCamera(ndc, camera)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(lengthAdjustStateRef.current.base.y))
        const pos = new THREE.Vector3()
        raycaster.ray.intersectPlane(plane, pos)
        const delta = new THREE.Vector3().subVectors(pos, lengthAdjustStateRef.current.base)
        const dist = Math.max(0, delta.dot(lengthAdjustStateRef.current.dir))
        const rounded = Math.round(dist)
        lengthCandidateRef.current = rounded
        setMeasureText(`${rounded} mm`)
        const v = pos.clone().project(camera)
        const rect = dom.getBoundingClientRect()
        const sx = (v.x + 1) / 2 * rect.width
        const sy = (-v.y + 1) / 2 * rect.height
        setMeasurePos({ x: sx, y: sy })
        const helper = lengthHelperRef.current
        if (helper) {
          const s = THREE.MathUtils.clamp(rounded, 20, 5000)
          const shaft = helper.children[1] as THREE.Mesh
          const head = helper.children[2] as THREE.Mesh
          shaft.position.set(0, 0, Math.min(60, s / 2))
          head.position.set(0, 0, Math.min(120, s))
        }
        return
      }
      if (insertMode && previewMeshRef.current) {
        const ndc = toNdc(e)
        const raycaster = raycasterRef.current!
        raycaster.setFromCamera(ndc, camera)
        const snap = (v: number) => Math.round(v / snapSize) * snapSize
        if (!interaction.basePoint) {
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
          const pos = new THREE.Vector3()
          raycaster.ray.intersectPlane(plane, pos)
          const x = snap(pos.x)
          const y = 0
          const z = snap(pos.z)
          previewMeshRef.current.position.set(x, y, z)
          const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(insertRotationY))
          previewMeshRef.current.setRotationFromQuaternion(yawQ)
          const v = new THREE.Vector3(x, y, z).project(camera)
          const rect = dom.getBoundingClientRect()
          const sx = (v.x + 1) / 2 * rect.width
          const sy = (-v.y + 1) / 2 * rect.height
          setMeasurePos({ x: sx, y: sy })
          setMeasureText(`${Math.round(Math.hypot(x, z))} mm`)
          needsRenderRef.current = true
          return
        }
        let x = 0, y = 0, z = 0
        const pos = new THREE.Vector3()

        // Handle Point Snapping in Move Phase (if hovering object)
        // Note: For simplicity, move phase mainly relies on axis lock or plane intersection.
        // Full vertex snapping during move would require raycasting objects again.
        
        let hitObject = false
        if ((osnapEnd || osnapMid) && interaction.axisLock === 'NONE') {
             // Try intersecting objects first for move-snap
             const instanced = tubesGroupRef.current?.children[0] as THREE.InstancedMesh
             if (instanced) {
                  const intersects = raycaster.intersectObject(instanced, false)
                  if (intersects.length > 0) {
                      pos.copy(intersects[0].point)
                      hitObject = true
                      
                       const inter = intersects[0]
                       if (inter.face && inter.object) {
                           const mesh = inter.object as THREE.Mesh
                           const geometry = mesh.geometry
                           const posAttr = geometry.attributes.position
                           const a = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.a)
                           const b = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.b)
                           const c = new THREE.Vector3().fromBufferAttribute(posAttr, inter.face.c)
                           
                           const instanceId = inter.instanceId!
                           const matrix = new THREE.Matrix4()
                           instanced.getMatrixAt(instanceId, matrix)
                           
                           a.applyMatrix4(matrix)
                           b.applyMatrix4(matrix)
                           c.applyMatrix4(matrix)
                           
                           const da = pos.distanceToSquared(a)
                           const db = pos.distanceToSquared(b)
                           const dc = pos.distanceToSquared(c)
                           if (osnapMid) {
                             const ab = pos.distanceToSquared(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5))
                             const bc = pos.distanceToSquared(new THREE.Vector3().addVectors(b, c).multiplyScalar(0.5))
                             const ca = pos.distanceToSquared(new THREE.Vector3().addVectors(c, a).multiplyScalar(0.5))
                             if (ab <= bc && ab <= ca) pos.copy(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5))
                             else if (bc <= ab && bc <= ca) pos.copy(new THREE.Vector3().addVectors(b, c).multiplyScalar(0.5))
                             else pos.copy(new THREE.Vector3().addVectors(c, a).multiplyScalar(0.5))
                           } else {
                             if (da <= db && da <= dc) pos.copy(a)
                             else if (db <= da && db <= dc) pos.copy(b)
                             else pos.copy(c)
                           }
                       }
                  }
             }
        }

        if (hitObject) {
             x = pos.x
             y = pos.y
             z = pos.z
        } else {
            if (interaction.axisLock === 'Y') {
                 const viewDir = new THREE.Vector3()
                 camera.getWorldDirection(viewDir)
                 viewDir.y = 0
                 if (viewDir.lengthSq() < 0.01) {
                     viewDir.set(0, 0, 1)
                 }
                 viewDir.normalize()
                 const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(viewDir, new THREE.Vector3(basePoint.x, basePoint.y, basePoint.z))
                 raycaster.ray.intersectPlane(plane, pos)
                 
                 x = basePoint.x
                 z = basePoint.z
                 y = snap(pos.y)
            } else {
                 const plane = insertPlaneRef.current ?? new THREE.Plane(new THREE.Vector3(0, 1, 0), -basePoint.y)
                 raycaster.ray.intersectPlane(plane, pos)
                 x = snap(pos.x)
                 y = basePoint.y
                 z = snap(pos.z)
            }
    
            if (interaction.axisLock === 'X') {
              z = basePoint.z
            } else if (interaction.axisLock === 'Z') {
              x = basePoint.x
            }
            if (orthoEnabled && interaction.axisLock === 'NONE' && !e.shiftKey) {
              const dx = x - basePoint.x
              const dz = z - basePoint.z
              if (Math.abs(dx) >= Math.abs(dz)) {
                z = basePoint.z
              } else {
                x = basePoint.x
              }
            }
            if (e.shiftKey) {
              const forwardWorld = previewMeshRef.current
                ? new THREE.Vector3(0, 0, 1).applyQuaternion(previewMeshRef.current.quaternion).normalize()
                : new THREE.Vector3(0, 0, 1)
              const delta = new THREE.Vector3(x - basePoint.x, y - basePoint.y, z - basePoint.z)
              const t = delta.dot(forwardWorld)
              const snapped = forwardWorld.clone().multiplyScalar(t)
              const np = new THREE.Vector3(basePoint.x, basePoint.y, basePoint.z).add(snapped)
              x = np.x
              y = np.y
              z = np.z
            }
            if (gridSnapEnabled) {
              const s = snapSize || 10
              x = Math.round(x / s) * s
              z = Math.round(z / s) * s
              if (interaction.axisLock === 'Y') {
                y = Math.round(y / s) * s
              }
            }
        }
        
        setInteractionRawPoint(new THREE.Vector3(x, y, z))
        previewMeshRef.current.position.set(x, y, z)
        const dx = x - basePoint.x
        const dz = z - basePoint.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        const dy = y - basePoint.y
        const dir = new THREE.Vector3(dx, dy, dz)
        setInteractionSolvedPoint(new THREE.Vector3(x, y, z))
        if (dir.lengthSq() > 1e-6) {
          let qTarget: THREE.Quaternion
          if (insertAxis === 'Z') {
            const forward = dir.clone().normalize()
            const qAlign = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward)
            const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(insertRotationY))
            qTarget = qAlign.clone().multiply(yawQ)
          } else {
            const axisVec = insertAxis === 'X' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
            qTarget = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisVec)
          }
          previewMeshRef.current.quaternion.slerp(qTarget, 0.3)
          if (orientHelperRef.current) orientHelperRef.current.setRotationFromQuaternion(qTarget)
          const yaw = Math.atan2(dx, dz) * 180 / Math.PI
          setMeasureText(`${Math.round(dist)} mm | ${Math.round(yaw)}°`)
        } else {
          setMeasureText(`${Math.round(dist)} mm`)
        }
        const v = new THREE.Vector3(x, y, z).project(camera)
        const rect = dom.getBoundingClientRect()
        const sx = (v.x + 1) / 2 * rect.width
        const sy = (-v.y + 1) / 2 * rect.height
        setMeasurePos({ x: sx, y: sy })
        needsRenderRef.current = true
        return
      }
      if (!draggingRef.current) return
      const ndc = toNdc(e)
      const raycaster = raycasterRef.current!
      raycaster.setFromCamera(ndc, camera)
      // Pointer intersect
      const pos = new THREE.Vector3()
      const index = draggingRef.current.index
      if (locks[index]) return
      const baseIx = Math.floor(index / Math.max(1, tubeArray.countY))
      const baseIy = index % Math.max(1, tubeArray.countY)
      const bx = baseIx * tubeArray.spacingX
      const bz = baseIy * tubeArray.spacingY
      if (dragAxisRef.current === 'y') {
        const viewDir = new THREE.Vector3()
        camera.getWorldDirection(viewDir)
        viewDir.y = 0
        if (viewDir.lengthSq() < 0.01) viewDir.set(0, 0, 1)
        viewDir.normalize()
        const planeY = new THREE.Plane().setFromNormalAndCoplanarPoint(viewDir, new THREE.Vector3(bx, 0, bz))
        raycaster.ray.intersectPlane(planeY, pos)
      } else {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        raycaster.ray.intersectPlane(plane, pos)
      }
      let wx = pos.x
      let wz = pos.z
      let wy = pos.y
      if (gridSnapEnabled) {
        const s = snapSize || 10
        wx = Math.round(wx / s) * s
        wz = Math.round(wz / s) * s
        wy = Math.round(wy / s) * s
      }
      let nx = wx - bx
      let nz = wz - bz
      let ny = 0
      if (dragAxisRef.current === 'y') {
        nx = 0
        nz = 0
        ny = wy
      }
      if ((e.shiftKey || dragAxisRef.current === 'x' || dragAxisRef.current === 'z') && highlightMeshRef.current) {
        const axisWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(highlightMeshRef.current.quaternion).normalize()
        let axisXZ = new THREE.Vector3(axisWorld.x, 0, axisWorld.z)
        if (axisXZ.lengthSq() < 1e-6) axisXZ = new THREE.Vector3(1, 0, 0)
        axisXZ.normalize()
        const t = nx * axisXZ.x + nz * axisXZ.z
        nx = axisXZ.x * t
        nz = axisXZ.z * t
        if (gridSnapEnabled) {
          const s = snapSize || 10
          const wx2 = bx + nx
          const wz2 = bz + nz
          const wxs = Math.round(wx2 / s) * s
          const wzs = Math.round(wz2 / s) * s
          nx = wxs - bx
          nz = wzs - bz
        }
      }
      setPosition(index, { x: nx, y: ny, z: nz }, false)
      if (dragAxesRef.current) dragAxesRef.current.visible = true
    }
    const pointerUp = () => {
      // Finalize box selection
      if (boxSelection) {
        setBoxSelection(null)
        // Re-enable viewport controls after box selection
        if (controlsRef.current) controlsRef.current.enabled = true
        return
      }
      
      if (controlsRef.current) controlsRef.current.enabled = true
      if (lengthAdjustStateRef.current) {
        const candidate = lengthCandidateRef.current ?? null
        if (candidate != null && candidate > 0) {
          const clamped = Math.max(50, Math.min(5000, candidate))
          setSquareTube({ length: clamped })
          fetch('/api/logs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'length', message: 'Adjust length', data: { length: clamped } }),
          })
        }
        const helper = lengthHelperRef.current
        if (helper) helper.visible = false
        setMeasureText('')
        setMeasurePos(null)
        lengthAdjustStateRef.current = null
        lengthCandidateRef.current = null
      }
      if (insertMode && previewMeshRef.current && insertGroupRef.current) {
        const p = previewMeshRef.current.position
        addInserted({ x: p.x, y: p.y, z: p.z, ry: insertRotationY })
        const mesh = new THREE.Mesh(
          createTubeGeometry(squareTube.width, squareTube.height, squareTube.thickness, squareTube.length),
          new THREE.MeshStandardMaterial({ color: '#8a8a8a', metalness: 0.6, roughness: 0.3 }),
        )
        mesh.position.set(p.x, p.y, p.z)
        mesh.quaternion.copy(previewMeshRef.current.quaternion)
        insertGroupRef.current.add(mesh)
        previewMeshRef.current.visible = false
        setMeasureText('')
        setMeasurePos(null)
        insertPlaneRef.current = null
        if (orientHelperRef.current) orientHelperRef.current.visible = false
        resetInteraction()
        fetch('/api/logs/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'insert', message: 'Insert tube', data: { x: p.x, y: p.y, z: p.z } }),
        })
        return
      }
      if (!draggingRef.current) return
      const index = draggingRef.current.index
      const ov = positionOverrides[index] ?? { x: 0, y: 0, z: 0 }
      setPosition(index, ov, true)
      draggingRef.current = null
      dragAxisRef.current = null
      if (dragAxesRef.current) dragAxesRef.current.visible = false
      safeFetch('/api/positions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: 'square-tube', instanceIndex: index, x: ov.x, y: ov.y, z: ov.z }),
      })
      safeFetch('/api/logs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'move', message: 'Moved tube', data: { index, ...ov } }),
      })
    }
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const ndc = toNdc(e)
      const raycaster = raycasterRef.current!
      raycaster.setFromCamera(ndc, camera)
      const groupRef = tubesGroupRef.current
      const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
      if (!instanced) return
      const intersects = raycaster.intersectObject(instanced, true)
      if (intersects.length > 0 && typeof (intersects[0] as any).instanceId === 'number') {
        const packedId = (intersects[0] as any).instanceId as number
        const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
        const index = indexMap ? indexMap[packedId] : packedId
        setContextMenu({ x: e.clientX, y: e.clientY, index })
        setSelectedIndex(index)
      } else {
        setContextMenu(null)
      }
    }
    dom.addEventListener('contextmenu', onContextMenu)
    dom.addEventListener('mousedown', pointerDown)
    dom.addEventListener('mousemove', pointerMove)
    dom.addEventListener('mouseup', pointerUp)
    dom.addEventListener('pointerdown', onPointerDownControl)
    dom.addEventListener('pointerup', onPointerUpControl)
    dom.addEventListener('wheel', onWheelControl as any)
    return () => {
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      if (animIdRef.current != null) cancelAnimationFrame(animIdRef.current)
      dom.removeEventListener('contextmenu', onContextMenu)
      dom.removeEventListener('mousedown', pointerDown)
      dom.removeEventListener('mousemove', pointerMove)
      dom.removeEventListener('mouseup', pointerUp)
      dom.removeEventListener('pointerdown', onPointerDownControl)
      dom.removeEventListener('pointerup', onPointerUpControl)
      dom.removeEventListener('wheel', onWheelControl as any)
    }
  }, [])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    }
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    } as any
    controls.enableDamping = touchpadMode
    controls.dampingFactor = touchpadMode ? 0.08 : 0
    controls.rotateSpeed = touchpadMode ? 0.7 : 1.0
    controls.zoomSpeed = touchpadMode ? 0.5 : 1.0
    controls.panSpeed = touchpadMode ? 0.8 : 1.0
    ;(controls as any).zoomToCursor = true
    controls.screenSpacePanning = true
  }, [activeTool, touchpadMode])

 

  useEffect(() => {
    const tctrl = transformControlsRef.current
    if (!tctrl) return
    tctrl.setTranslationSnap((interaction.snapSize ?? snapSize) || 0)
  }, [interaction.snapSize, snapSize])

  useEffect(() => {
    const tctrl = transformControlsRef.current
    if (!tctrl) return
    if (rotationSnapEnabled && rotationSnapDeg > 0) {
      tctrl.setRotationSnap(THREE.MathUtils.degToRad(rotationSnapDeg))
    } else {
      tctrl.setRotationSnap(null as any)
    }
  }, [rotationSnapEnabled, rotationSnapDeg])

  useEffect(() => {
    if (selectedIndex == null) return
    const rot = rotations[selectedIndex] ?? { ry: 0, rx: 0, rz: 0 }
    setRxInput(rot.rx ?? 0)
    setRyInput(rot.ry ?? 0)
    setRzInput(rot.rz ?? 0)
  }, [selectedIndex, rotations])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Insert mode: Space to rotate preview, Enter to finish
      if (e.code === 'Space') {
        if (insertMode) {
          e.preventDefault()
          setInsertAxis((a) => (a === 'Z' ? 'X' : a === 'X' ? 'Y' : 'Z'))
          if (previewMeshRef.current) {
            const target = a => (a === 'X' ? new THREE.Vector3(1, 0, 0) : a === 'Y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1))
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), target(insertAxis))
            previewMeshRef.current.setRotationFromQuaternion(q)
          }
        }
      }
      if (e.code === 'Enter') {
        if (insertMode) {
          e.preventDefault()
          setInsertMode(false)
          insertPlaneRef.current = null
          setMeasureText('')
          setMeasurePos(null)
          if (previewMeshRef.current) previewMeshRef.current.visible = false
        }
      }
      if (e.ctrlKey && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey && e.code === 'KeyY') || (e.ctrlKey && e.shiftKey && e.code === 'KeyZ')) {
        e.preventDefault()
        redo()
      }
      // Selection mode: T for translate, R for rotate
      if (!insertMode && selectedIndex != null) {
        const tctrl = transformControlsRef.current
        if (!tctrl) return
        if (e.shiftKey && e.code === 'Space') {
          e.preventDefault()
          setSelectedRotateAxis((a) => (a === 'Y' ? 'X' : a === 'X' ? 'Z' : 'Y'))
          return
        }
        if (e.code === 'Space') {
          e.preventDefault()
          const highlight = highlightMeshRef.current
          if (!highlight) return
          const axisVec = axisRef.current === 'Y' ? new THREE.Vector3(0, 1, 0) : axisRef.current === 'X' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
          const deltaQ = new THREE.Quaternion().setFromAxisAngle(axisVec, THREE.MathUtils.degToRad(90))
          highlight.quaternion.multiply(deltaQ)
          if (orientHelperRef.current) orientHelperRef.current.setRotationFromQuaternion(highlight.quaternion)
          const euler = new THREE.Euler().setFromQuaternion(highlight.quaternion, 'YXZ')
          const degY = THREE.MathUtils.radToDeg(euler.y)
          const degX = THREE.MathUtils.radToDeg(euler.x)
          const degZ = THREE.MathUtils.radToDeg(euler.z)
          setRotationY(selectedIndex, degY)
          setRotationX(selectedIndex, degX)
          setRotationZ(selectedIndex, degZ)
          tctrl.setMode('rotate')
          needsRenderRef.current = true
          return
        }
        if (e.code === 'KeyT') {
          e.preventDefault()
          tctrl.setMode('translate')
        } else if (e.code === 'KeyR') {
          e.preventDefault()
          tctrl.setMode('rotate')
        } else if (e.code === 'Delete') {
          e.preventDefault()
          deleteSelected()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [insertMode, selectedIndex])

  useEffect(() => {
    // Keep legacy snapSize in sync with interaction.snapSize to avoid behavior breaks
    setInteractionSnapSize(snapSize)
  }, [snapSize])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Delete' && plateSelected && plateMeshRef.current && sceneRef.current) {
        sceneRef.current.remove(plateMeshRef.current)
        plateMeshRef.current = null
        setPlateSelected(false)
        if (transformControlsRef.current) {
          transformControlsRef.current.detach()
          transformControlsRef.current.visible = false
        }
        needsRenderRef.current = true
      }
      
      // Selection shortcuts
      if (e.code === 'Escape') {
        // Clear all selections
        setSelectedIndices(new Set())
        setSelectedIndex(null)
        needsRenderRef.current = true
      }
      
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        // Select all (when in select mode)
        if (activeTool === 'select' && !insertMode && !cutMode) {
          e.preventDefault()
          selectAllVisible()
        }
      }
      
      if (e.code === 'KeyI' && (e.ctrlKey || e.metaKey)) {
        // Invert selection (when in select mode)
        if (activeTool === 'select' && !insertMode && !cutMode) {
          e.preventDefault()
          invertSelection()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [plateSelected, activeTool, insertMode, cutMode, selectedIndices, deletedMap])
  useEffect(() => {
    const scene = sceneRef.current
    const group = tubesGroupRef.current
    if (!group || !scene) return
    const geometry = createTubeGeometry(
      squareTube.width,
      squareTube.height,
      squareTube.thickness,
      squareTube.length,
    )
    const material = new THREE.MeshStandardMaterial({ color: '#8a8a8a', metalness: 0.6, roughness: 0.3 })
    const totalX = Math.max(1, tubeArray.countX)
    const totalY = Math.max(1, tubeArray.countY)
    let activeCount = 0
    const indexMap: number[] = []
    for (let ix = 0; ix < totalX; ix++) {
      for (let iy = 0; iy < totalY; iy++) {
        const originalIndex = ix * totalY + iy
        if (deletedMap[originalIndex]) continue
        activeCount++
        indexMap.push(originalIndex)
      }
    }
    const inst = new THREE.InstancedMesh(geometry, material, Math.max(0, activeCount))
    ;(inst as any).name = 'square-tube-array'
    ;(inst as any).userData = { indexMap }
    
    // Holes logic
    const holeRadius = (holeSpec.diameter ?? 3.2) / 2
    const holeLength = (squareTube.thickness ?? 2) + 2
    const holeGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, holeLength, 24)
    holeGeometry.rotateX(Math.PI / 2) // Orient along Z initially
    const holeMaterial = new THREE.MeshBasicMaterial({ color: '#000000' })
    const holeInst = new THREE.InstancedMesh(holeGeometry, holeMaterial, Math.max(1, activeCount) * 40) // Reserve enough for multiple holes
    ;(holeInst as any).name = 'holes'
    let holeIdx = 0

    let j = 0
    for (let ix = 0; ix < totalX; ix++) {
      for (let iy = 0; iy < totalY; iy++) {
        const originalIndex = ix * totalY + iy
        if (deletedMap[originalIndex]) continue
        const mx = new THREE.Matrix4()
        const ov = positionOverrides[originalIndex] ?? { x: 0, y: 0, z: 0 }
        const rot = rotations[originalIndex]?.ry ?? 0
        const rx = rotations[originalIndex]?.rx ?? 0
        const rz = rotations[originalIndex]?.rz ?? 0
        const euler = new THREE.Euler(THREE.MathUtils.degToRad(rx), THREE.MathUtils.degToRad(rot), THREE.MathUtils.degToRad(rz), 'YXZ')
        const r = new THREE.Matrix4().makeRotationFromEuler(euler)
        const t = new THREE.Matrix4().makeTranslation(ix * tubeArray.spacingX + ov.x, ov.y, iy * tubeArray.spacingY + ov.z)
        mx.multiplyMatrices(t, r)
        inst.setMatrixAt(j, mx)

    const side = sideHoles[originalIndex]
    if (side && side.length > 0 && sceneRef.current && tubesGroupRef.current) {
          const boardColor = '#E5E7EB'
          side.forEach((h) => {
            const r = (h.diameter ?? holeSpec.diameter) / 2
            const depth = squareTube.thickness + 2
            const cylGeo = new THREE.CylinderGeometry(r, r, h.mode === 'through' ? squareTube.width + 4 : depth, 24)
            const cylMat = new THREE.MeshBasicMaterial({ color: boardColor, depthWrite: false })
            const cyl = new THREE.Mesh(cylGeo, cylMat)
            // Orient cylinder along face normal
            if (h.face === 'TOP') cyl.rotation.x = -Math.PI / 2
            else if (h.face === 'BOTTOM') cyl.rotation.x = Math.PI / 2
            else if (h.face === 'LEFT') cyl.rotation.y = Math.PI / 2
            else if (h.face === 'RIGHT') cyl.rotation.y = -Math.PI / 2
            cyl.position.set(0, 0, 0)
            const local = new THREE.Matrix4()
            local.makeTranslation(h.face === 'TOP' ? 0 : h.face === 'BOTTOM' ? 0 : h.face === 'LEFT' ? squareTube.width / 2 : -squareTube.width / 2, h.face === 'TOP' ? squareTube.height / 2 : h.face === 'BOTTOM' ? -squareTube.height / 2 : 0, h.z)
            const world = new THREE.Matrix4()
            world.multiplyMatrices(mx, local)
            cyl.applyMatrix4(world)
            tubesGroupRef.current!.add(cyl)
          })
        }
    if (holes[originalIndex]) {
          const w = squareTube.width
          const h = squareTube.height
          const l = squareTube.length
          const pitch = holeSpec.pitch ?? 20
          const count = Math.floor(l / pitch)
          const startZ = -l / 2 + (l - (count - 1) * pitch) / 2
          
          for (let k = 0; k < count; k++) {
            const z = startZ + k * pitch
            if (holeSpec.faces?.includes('TOP')) {
              const mTop = new THREE.Matrix4()
              mTop.makeRotationX(-Math.PI / 2)
              mTop.setPosition(0, h / 2, z)
              mTop.premultiply(mx)
              holeInst.setMatrixAt(holeIdx++, mTop)
            }
            if (holeSpec.faces?.includes('BOTTOM')) {
              const mBot = new THREE.Matrix4()
              mBot.makeRotationX(Math.PI / 2)
              mBot.setPosition(0, -h / 2, z)
              mBot.premultiply(mx)
              holeInst.setMatrixAt(holeIdx++, mBot)
            }
            if (holeSpec.faces?.includes('LEFT')) {
              const mLeft = new THREE.Matrix4()
              mLeft.makeRotationY(Math.PI / 2)
              mLeft.setPosition(w / 2, 0, z)
              mLeft.premultiply(mx)
              holeInst.setMatrixAt(holeIdx++, mLeft)
            }
            if (holeSpec.faces?.includes('RIGHT')) {
              const mRight = new THREE.Matrix4()
              mRight.makeRotationY(-Math.PI / 2)
              mRight.setPosition(-w / 2, 0, z)
              mRight.premultiply(mx)
              holeInst.setMatrixAt(holeIdx++, mRight)
            }
          }
        }
        j++
      }
    }
    inst.instanceMatrix.needsUpdate = true
    holeInst.count = holeIdx
    holeInst.instanceMatrix.needsUpdate = true
    group.clear()
    group.add(inst)
    group.add(holeInst)
    needsRenderRef.current = true
  }, [squareTube.width, squareTube.height, squareTube.thickness, squareTube.length, squareTube.material, tubeArray.countX, tubeArray.countY, tubeArray.spacingX, tubeArray.spacingY, positionOverrides, rotations, holes, deletedMap])

  useEffect(() => {
    const highlight = highlightMeshRef.current
    const outline = outlinePassRef.current
    const group = tubesGroupRef.current
    const tctrl = transformControlsRef.current
    if (!highlight || !outline || !group) return

    // Handle box selection highlighting
    if (selectedIndices.size > 0) {
      const groupRef = tubesGroupRef.current
      const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
      if (instanced) {
        const highlightedObjects: THREE.Object3D[] = []
        const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
        
        selectedIndices.forEach(selectedIdx => {
          const i = selectedIdx
          const packedId = indexMap ? indexMap.indexOf(i) : i
          if (packedId >= 0 && packedId < instanced.count) {
            // Create a temporary mesh for highlighting
            const tempMesh = new THREE.Mesh()
            const matrix = new THREE.Matrix4()
            instanced.getMatrixAt(packedId, matrix)
            tempMesh.position.setFromMatrixPosition(matrix)
            tempMesh.rotation.setFromRotationMatrix(matrix)
            tempMesh.scale.setFromMatrixScale(matrix)
            highlightedObjects.push(tempMesh)
          }
        })
        outline.selectedObjects = highlightedObjects
        highlight.visible = false
        if (tctrl) tctrl.visible = false
      }
    } else if (selectedIndex != null) {
      const h = squareTube.height
      const geometry = createTubeGeometry(
        squareTube.width,
        h,
        squareTube.thickness,
        squareTube.length
      )
      // Shift geometry center to origin (center of mass)
      geometry.translate(0, -h / 2, 0)
      
      highlight.geometry.dispose()
      highlight.geometry = geometry
      
      const ix = Math.floor(selectedIndex / Math.max(1, tubeArray.countY))
      const iy = selectedIndex % Math.max(1, tubeArray.countY)
      const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }
      const rot = rotations[selectedIndex]?.ry ?? 0
      
      const mx = new THREE.Matrix4()
      const r = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(rot))
      const t = new THREE.Matrix4().makeTranslation(ix * tubeArray.spacingX + ov.x, ov.y, iy * tubeArray.spacingY + ov.z)
      mx.multiplyMatrices(t, r)
      
      highlight.position.setFromMatrixPosition(mx)
      highlight.position.y += h / 2 // Move mesh up to align center
      highlight.rotation.setFromRotationMatrix(mx)
      highlight.scale.setFromMatrixScale(mx)
      highlight.visible = true
      outline.selectedObjects = [highlight]

      if (tctrl) {
        tctrl.attach(highlight)
        tctrl.visible = true
        const onObjectChange = () => {
          const baseX = ix * tubeArray.spacingX
          const baseZ = iy * tubeArray.spacingY
          const p = highlight.position
          // Convert center position back to bottom position
          const bottomY = p.y - h / 2
          const next = { x: p.x - baseX, y: bottomY, z: p.z - baseZ }
          setPosition(selectedIndex, next, false)
          // Commit rotation Y as degrees
          const euler = new THREE.Euler().setFromQuaternion(highlight.quaternion, 'YXZ')
          const degY = THREE.MathUtils.radToDeg(euler.y)
          const degX = THREE.MathUtils.radToDeg(euler.x)
          setRotationY(selectedIndex, degY)
          setRotationX(selectedIndex, degX)
        }
        const onDragChange = (e: any) => {
          if (!e.value) {
            const baseX = ix * tubeArray.spacingX
            const baseZ = iy * tubeArray.spacingY
            const p = highlight.position
            const bottomY = p.y - h / 2
            const next = { x: p.x - baseX, y: bottomY, z: p.z - baseZ }
            setPosition(selectedIndex, next, true)
            fetch('/api/positions/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }),
            })
            // Log rotation if changed
            const euler = new THREE.Euler().setFromQuaternion(highlight.quaternion, 'YXZ')
            const degY = THREE.MathUtils.radToDeg(euler.y)
            const degX = THREE.MathUtils.radToDeg(euler.x)
            const degZ = THREE.MathUtils.radToDeg(euler.z)
            setRotationY(selectedIndex, degY)
            setRotationX(selectedIndex, degX)
            setRotationZ(selectedIndex, degZ)
            fetch('/api/logs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'move', message: 'TransformControls move', data: { index: selectedIndex, ...next, ry: degY, rx: degX, rz: degZ } }),
            })
          }
        }
        tctrl.addEventListener('objectChange', onObjectChange)
        tctrl.addEventListener('dragging-changed', onDragChange)
        return () => {
          tctrl.removeEventListener('objectChange', onObjectChange)
          tctrl.removeEventListener('dragging-changed', onDragChange)
        }
      }
    } else {
      highlight.visible = false
      outline.selectedObjects = []
      if (tctrl) {
        tctrl.detach()
        tctrl.visible = false
      }
    }
  }, [selectedIndex, selectedIndices, squareTube, tubeArray, positionOverrides, rotations, createTubeGeometry])

  const exportSTL = () => {
    const exporter = exporterRef.current
    const group = tubesGroupRef.current
    if (!exporter || !group) return
    const clones = new THREE.Group()
    const geometry = createTubeGeometry(squareTube.width, squareTube.height, squareTube.thickness, squareTube.length)
    const material = new THREE.MeshStandardMaterial({ color: '#8a8a8a', metalness: 0.6, roughness: 0.3 })
    for (let ix = 0; ix < Math.max(1, tubeArray.countX); ix++) {
      for (let iy = 0; iy < Math.max(1, tubeArray.countY); iy++) {
        const m = new THREE.Mesh(geometry.clone(), material)
        m.position.set(ix * tubeArray.spacingX, 0, iy * tubeArray.spacingY)
        clones.add(m)
      }
    }
    const stl = exporter.parse(clones)
    downloadText('square-tube-array.stl', typeof stl === 'string' ? stl : '')
  }

  const deleteSelected = () => {
    // Handle multi-selection deletion
    if (selectedIndices.size > 0) {
      setDeletedMap((prev) => {
        const newMap = { ...prev }
        selectedIndices.forEach(index => {
          newMap[index] = true
        })
        return newMap
      })
      fetch('/api/logs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delete', message: 'Delete multiple tubes', data: { count: selectedIndices.size } }),
      })
      setSelectedIndices(new Set())
      return
    }
    
    // Handle single selection deletion
    if (selectedIndex == null) return
    setDeletedMap((prev) => ({ ...prev, [selectedIndex]: true }))
    const index = selectedIndex
    setSelectedIndex(null)
    fetch('/api/logs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delete', message: 'Delete tube', data: { index } }),
    })
  }

  const clearAllSelections = () => {
    setSelectedIndices(new Set())
    setSelectedIndex(null)
    needsRenderRef.current = true
  }

  const selectAllVisible = () => {
    const groupRef = tubesGroupRef.current
    const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
    if (!instanced) return
    
    const allIndices = new Set<number>()
    const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
    for (let i = 0; i < instanced.count; i++) {
      const index = indexMap ? indexMap[i] : i
      if (!deletedMap[index]) {
        allIndices.add(index)
      }
    }
    setSelectedIndices(allIndices)
    needsRenderRef.current = true
  }

  const invertSelection = () => {
    const groupRef = tubesGroupRef.current
    const instanced = groupRef?.children?.find((c: any) => (c as any)?.name === 'square-tube-array') as THREE.InstancedMesh
    if (!instanced) return
    
    const invertedIndices = new Set<number>()
    const indexMap = (instanced as any).userData?.indexMap as number[] | undefined
    for (let i = 0; i < instanced.count; i++) {
      const index = indexMap ? indexMap[i] : i
      if (!deletedMap[index] && !selectedIndices.has(index)) {
        invertedIndices.add(index)
      }
    }
    setSelectedIndices(invertedIndices)
    needsRenderRef.current = true
  }

  useEffect(() => {
    const payload = {
      width: squareTube.width,
      height: squareTube.height,
      thickness: squareTube.thickness,
      length: squareTube.length,
      material: squareTube.material,
      standard: squareTube.standard,
    }
    fetch('/api/modeling/square-tube', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('bad response')
        const data = await res.json()
        const p = data?.properties
        if (p && typeof p.volume === 'number') {
          setRemoteProps({
            volume: p.volume,
            weight: p.weight,
            surfaceArea: p.surfaceArea,
          })
        } else {
          setRemoteProps(null)
        }
      })
      .catch(() => {
        setRemoteProps(null)
      })
  }, [squareTube.width, squareTube.height, squareTube.thickness, squareTube.length, squareTube.material, squareTube.standard])

  return (
    <div className={cn('grid h-[calc(100vh-16px)] grid-cols-12 gap-2 p-2')}>
      <TopBar
        lang={lang}
        setLang={setLang}
        t={t}
        tools={tools}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        undo={undo}
        redo={redo}
        deleteSelected={deleteSelected}
        selectedIndex={selectedIndex}
        exportSTL={exportSTL}
        showPricePanel={showPricePanel}
        setShowPricePanel={setShowPricePanel}
        showPropertiesPanel={showPropertiesPanel}
        setShowPropertiesPanel={setShowPropertiesPanel}
        onlyProfiles={onlyProfiles}
        setOnlyProfiles={setOnlyProfiles}
        lowDetail={lowDetail}
        setLowDetail={setLowDetail}
        batchEditOpen={batchEditOpen}
        setBatchEditOpen={setBatchEditOpen}
        tubeArray={tubeArray}
        setTubeArray={setTubeArray}
      />
      <Card className={cn('h-full p-0 relative', showPropertiesPanel ? 'col-span-9' : 'col-span-12')}>
        <div className="absolute top-2 right-2 z-10 bg-white/80 p-2 rounded border pointer-events-none">
          {measurePos && measureText && (
            <div className="text-sm font-medium">{measureText}</div>
          )}
          {selectedIndex != null && (
            <div className="text-xs text-gray-600 mt-1">
              <div>X: {positionOverrides[selectedIndex]?.x?.toFixed(1) ?? 0} mm</div>
              <div>Y: {positionOverrides[selectedIndex]?.y?.toFixed(1) ?? 0} mm</div>
              <div>Z: {positionOverrides[selectedIndex]?.z?.toFixed(1) ?? 0} mm</div>
            </div>
          )}
          
          {/* Selection mode indicator */}
          {selectedIndices.size > 0 && (
            <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded border border-blue-200">
              <div className="font-semibold">多选模式</div>
              <div>已选择: {selectedIndices.size} 个对象</div>
              {selectionModifiers.ctrl && <div className="text-blue-500">Ctrl: 添加到选择</div>}
              {selectionModifiers.shift && <div className="text-blue-500">Shift: 切换选择</div>}
              {selectionModifiers.alt && <div className="text-blue-500">Alt: 从选择中移除</div>}
            </div>
          )}
          
          {/* Box Selection Rectangle */}
          {boxSelection && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.max(0, Math.min(boxSelection.start.x, boxSelection.current.x))}px`,
                  top: `${Math.max(0, Math.min(boxSelection.start.y, boxSelection.current.y))}px`,
                  width: `${Math.abs(boxSelection.current.x - boxSelection.start.x)}px`,
                  height: `${Math.abs(boxSelection.current.y - boxSelection.start.y)}px`,
                  backgroundColor: selectionModifiers.ctrl ? 'rgba(34, 197, 94, 0.15)' : 
                                   selectionModifiers.alt ? 'rgba(239, 68, 68, 0.15)' :
                                   selectionModifiers.shift ? 'rgba(251, 146, 60, 0.15)' : 
                                   'rgba(59, 130, 246, 0.15)',
                  border: selectionModifiers.ctrl ? '1px solid rgba(34, 197, 94, 0.6)' : 
                             selectionModifiers.alt ? '1px solid rgba(239, 68, 68, 0.6)' :
                             selectionModifiers.shift ? '1px solid rgba(251, 146, 60, 0.6)' :
                             '1px solid rgba(59, 130, 246, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  borderRadius: '3px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              />
              {/* Selection counter */}
              {selectedIndices.size > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.max(5, Math.min(boxSelection.start.x, boxSelection.current.x) + 5)}px`,
                    top: `${Math.max(5, Math.min(boxSelection.start.y, boxSelection.current.y) - 20)}px`,
                    backgroundColor: selectionModifiers.ctrl ? 'rgba(34, 197, 94, 0.9)' : 
                                   selectionModifiers.alt ? 'rgba(239, 68, 68, 0.9)' :
                                   selectionModifiers.shift ? 'rgba(251, 146, 60, 0.9)' :
                                   'rgba(59, 130, 246, 0.9)',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    zIndex: 1001,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {selectedIndices.size} {selectionModifiers.ctrl ? '添加' : selectionModifiers.alt ? '移除' : selectionModifiers.shift ? '切换' : '已选择'}
                </div>
              )}
            </>
          )}
        </div>
        <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Bottom Left Toolbar */}
          <ViewportToolbar
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            tubesGroupRef={tubesGroupRef}
            multiViewEnabled={multiViewEnabled}
            setMultiViewEnabled={setMultiViewEnabled}
            needsRenderRef={needsRenderRef}
            t={t}
          />

          {measurePos && measureText && (
            <div
              style={{
                position: 'absolute',
                left: `${measurePos.x}px`,
                top: `${measurePos.y}px`,
                transform: 'translate(-50%, -150%)',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 12,
                pointerEvents: 'none',
              }}
            >
              {measureText}
            </div>
          )}
          
          {/* Box Selection Rectangle */}
          {boxSelection && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(boxSelection.start.x, boxSelection.current.x)}px`,
                top: `${Math.min(boxSelection.start.y, boxSelection.current.y)}px`,
                width: `${Math.abs(boxSelection.current.x - boxSelection.start.x)}px`,
                height: `${Math.abs(boxSelection.current.y - boxSelection.start.y)}px`,
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // Light blue with transparency
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            />
          )}
        </div>
        {plateSelected && (
          <div className="absolute bottom-2 left-2 z-10 flex gap-1 pointer-events-none">
            <div className="flex gap-1 bg-white/90 p-1 rounded border shadow-sm pointer-events-auto">
              <Tooltip title="移动">
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    if (transformControlsRef.current && plateMeshRef.current) {
                      transformControlsRef.current.attach(plateMeshRef.current)
                      transformControlsRef.current.visible = true
                      transformControlsRef.current.setMode('translate')
                      needsRenderRef.current = true
                    }
                  }}
                >
                  移动
                </Button>
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  danger
                  type="text"
                  size="small"
                  onClick={() => {
                    if (plateMeshRef.current && sceneRef.current) {
                      sceneRef.current.remove(plateMeshRef.current)
                      plateMeshRef.current = null
                      setPlateSelected(false)
                      if (transformControlsRef.current) {
                        transformControlsRef.current.detach()
                        transformControlsRef.current.visible = false
                      }
                      needsRenderRef.current = true
                    }
                  }}
                >
                  删除
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </Card>
      <Card 
        title="参数面板" 
        extra={
          <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-gray-400">#</span>
            <InputNumber
              size="small"
              value={selectedIndex ?? undefined}
              min={0}
              max={Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY) - 1}
              onChange={(v) => setSelectedIndex(v == null ? null : Number(v))}
              className="w-10 !text-xs !bg-transparent"
              variant="borderless"
              placeholder="-"
              controls={false}
            />
          </div>
        }
        className="col-span-3 h-full overflow-hidden flex flex-col" 
        size="small" 
        styles={{ body: { padding: '0', display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        <div className="p-2 border-b flex gap-2 shrink-0 bg-gray-50">
          <Button onClick={exportSTL} type="primary" size="small" ghost>导出STL</Button>
          <div className="flex-1" />
          <Tooltip title="撤销"><Button onClick={undo} size="small" icon={<Undo2 size={14} />} /></Tooltip>
          <Tooltip title="重做"><Button onClick={redo} size="small" icon={<Redo2 size={14} />} /></Tooltip>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Collapse
            ghost
            defaultActiveKey={['basic', 'transform', 'aids', 'sideholes']}
            expandIconPosition="end"
            size="small"
            items={[
              {
                key: 'basic',
                label: <span className="font-medium text-gray-600">基本属性 / Basic</span>,
                children: (
                  <Form layout="vertical" size="small" className="px-1">
                    <div className="grid grid-cols-2 gap-2">
                      <Form.Item label="长度 (mm)" className="mb-2">
                        <InputNumber value={squareTube.length} min={50} max={5000} step={10} onChange={(v) => setSquareTube({ length: Number(v) })} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="宽度 (mm)" className="mb-2">
                        <InputNumber value={squareTube.width} min={5} max={200} step={1} onChange={(v) => setSquareTube({ width: Number(v) })} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="高度 (mm)" className="mb-2">
                        <InputNumber value={squareTube.height} min={5} max={200} step={1} onChange={(v) => setSquareTube({ height: Number(v) })} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="壁厚 (mm)" className="mb-2">
                        <InputNumber value={squareTube.thickness} min={1} max={10} step={0.5} onChange={(v) => setSquareTube({ thickness: Number(v) })} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Form.Item label="材料" className="mb-2">
                        <Select value={squareTube.material} options={[{ label: '铝合金', value: '铝合金' }, { label: '碳管', value: '碳管' }]} onChange={(v) => setSquareTube({ material: v })} />
                      </Form.Item>
                      <Form.Item label="标准" className="mb-2">
                        <Select value={squareTube.standard} options={[{ label: 'GB/T 6728-2017', value: 'GB/T 6728-2017' }, { label: 'GB/T 700-2006', value: 'GB/T 700-2006' }]} onChange={(v) => setSquareTube({ standard: v })} />
                      </Form.Item>
                    </div>
                  </Form>
                )
              },
              {
                key: 'transform',
                label: <span className="font-medium text-gray-600">变换 / Transform</span>,
                children: (
                  <div className="space-y-3 px-1">
                    {selectedIndex != null ? (
                      <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                        <div className="text-xs text-blue-600 mb-1 font-medium">位置偏移 (Offset)</div>
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">X</div>
                            <InputNumber ref={inputXRef as any} size="small" value={positionOverrides[selectedIndex]?.x ?? 0} step={1} 
                              onChange={(v) => {
                                const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }; const next = { ...ov, x: Number(v) }
                                setPosition(selectedIndex, next, true)
                                safeFetch('/api/positions/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }) })
                              }} style={{ width: '100%' }} />
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Y</div>
                            <InputNumber ref={inputYRef as any} size="small" value={positionOverrides[selectedIndex]?.y ?? 0} step={1}
                              onChange={(v) => {
                                const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }; const next = { ...ov, y: Number(v) }
                                setPosition(selectedIndex, next, true)
                                safeFetch('/api/positions/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }) })
                              }} style={{ width: '100%' }} />
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Z</div>
                            <InputNumber ref={inputZRef as any} size="small" value={positionOverrides[selectedIndex]?.z ?? 0} step={1}
                              onChange={(v) => {
                                const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }; const next = { ...ov, z: Number(v) }
                                setPosition(selectedIndex, next, true)
                                safeFetch('/api/positions/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }) })
                              }} style={{ width: '100%' }} />
                          </div>
                        </div>
                      </div>
                    ) : <div className="text-xs text-gray-400 italic text-center py-2">未选择实例</div>}
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-medium text-gray-600">旋转 (Rotation)</div>
                        <AxisSelector currentAxis={selectedRotateAxis} onChange={(axis) => setSelectedRotateAxis(axis)} />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                         {/* Rotation Inputs */}
                         <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">RX (°)</div>
                            <InputNumber size="small" value={rxInput} step={1} style={{ width: '100%' }} 
                              onChange={(v) => {
                                const val = Number(v); setRxInput(val)
                                if (selectedIndex != null) {
                                  setRotationX(selectedIndex, val)
                                  if (highlightMeshRef.current) {
                                    const e = new THREE.Euler(THREE.MathUtils.degToRad(val), THREE.MathUtils.degToRad(ryInput), THREE.MathUtils.degToRad(rzInput), 'YXZ')
                                    highlightMeshRef.current.setRotationFromEuler(e); needsRenderRef.current = true
                                  }
                                }
                              }} />
                         </div>
                         <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">RY (°)</div>
                            <InputNumber size="small" value={ryInput} step={1} style={{ width: '100%' }}
                              onChange={(v) => {
                                const val = Number(v); setRyInput(val)
                                if (selectedIndex != null) {
                                  setRotationY(selectedIndex, val)
                                  if (highlightMeshRef.current) {
                                    const e = new THREE.Euler(THREE.MathUtils.degToRad(rxInput), THREE.MathUtils.degToRad(val), THREE.MathUtils.degToRad(rzInput), 'YXZ')
                                    highlightMeshRef.current.setRotationFromEuler(e); needsRenderRef.current = true
                                  }
                                }
                              }} />
                         </div>
                         <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">RZ (°)</div>
                            <InputNumber size="small" value={rzInput} step={1} style={{ width: '100%' }}
                              onChange={(v) => {
                                const val = Number(v); setRzInput(val)
                                if (selectedIndex != null) {
                                  setRotationZ(selectedIndex, val)
                                  if (highlightMeshRef.current) {
                                    const e = new THREE.Euler(THREE.MathUtils.degToRad(rxInput), THREE.MathUtils.degToRad(ryInput), THREE.MathUtils.degToRad(val), 'YXZ')
                                    highlightMeshRef.current.setRotationFromEuler(e); needsRenderRef.current = true
                                  }
                                }
                              }} />
                         </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 bg-gray-50 p-1 rounded">
                         <span className="text-[10px] text-gray-500">吸附</span>
                         <Switch size="small" checked={rotationSnapEnabled} onChange={setRotationSnapEnabled} />
                         <InputNumber size="small" value={rotationSnapDeg} min={1} max={180} step={5} onChange={(v) => setRotationSnapDeg(Number(v))} className="flex-1" />
                         <span className="text-[10px] text-gray-400">°</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">插入基点 (Base Point)</div>
                      <div className="grid grid-cols-3 gap-1">
                        <InputNumber size="small" prefix="X" value={basePoint.x} step={0.1} onChange={(v) => setBasePoint({ x: Number(v) })} style={{ width: '100%' }} />
                        <InputNumber size="small" prefix="Y" value={basePoint.y} step={0.1} onChange={(v) => setBasePoint({ y: Number(v) })} style={{ width: '100%' }} />
                        <InputNumber size="small" prefix="Z" value={basePoint.z} step={0.1} onChange={(v) => setBasePoint({ z: Number(v) })} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                )
              },
              {
                key: 'sideholes',
                label: <span className="font-medium text-gray-600">侧面通孔 / Side Holes</span>,
                children: (
                  <Form layout="vertical" size="small" className="px-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Form.Item label="面">
                        <Select
                          mode="multiple"
                          value={sideFaces}
                          options={[
                            { label: 'TOP', value: 'TOP' },
                            { label: 'BOTTOM', value: 'BOTTOM' },
                            { label: 'LEFT', value: 'LEFT' },
                            { label: 'RIGHT', value: 'RIGHT' },
                          ]}
                          onChange={(v) => setSideFaces(v as any)}
                        />
                      </Form.Item>
                      <Form.Item label="孔径 (mm)">
                        <InputNumber min={2} max={20} step={0.2} value={sideDiameter} onChange={(v) => setSideDiameter(Number(v))} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="间距 (mm)">
                        <InputNumber min={5} max={1000} step={1} value={sideSpacing} onChange={(v) => setSideSpacing(Number(v))} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="行数">
                        <InputNumber min={1} max={200} step={1} value={sideRows} onChange={(v) => setSideRows(Number(v))} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item label="模式">
                        <Select
                          value={sideMode}
                          options={[
                            { label: '单壁孔', value: 'single_wall' },
                            { label: '贯穿孔', value: 'through' },
                          ]}
                          onChange={(v) => setSideMode(v as any)}
                        />
                      </Form.Item>
                      <Form.Item label="安全距 (mm)">
                        <InputNumber min={0} max={50} step={1} value={sideMargin} onChange={(v) => setSideMargin(Number(v))} style={{ width: '100%' }} />
                      </Form.Item>
                    </div>
                    <Button
                      type="primary"
                      disabled={selectedIndex == null || sideFaces.length === 0}
                      onClick={() => {
                        if (selectedIndex == null) return
                        const w = squareTube.width
                        const l = squareTube.length
                        const cols = Math.max(1, sideRows)
                        const pitch = Math.max(5, sideSpacing)
                        const span = (cols - 1) * pitch
                        const startZ = -l / 2 + (l - span) / 2
                        const margin = Math.max(0, sideMargin)
                        const holes = []
                        for (let j = 0; j < cols; j++) {
                          const z = startZ + j * pitch
                          const x = 0 // 默认中线，可后续扩展为多列
                          if (x < -w / 2 + margin || x > w / 2 - margin) continue
                          sideFaces.forEach((face) => {
                            holes.push({ face, x, z, diameter: sideDiameter, mode: sideMode })
                          })
                        }
                        setSideHoles(selectedIndex, holes as any)
                        message.success('侧面通孔参数已设置')
                      }}
                    >
                      应用到选中管
                    </Button>
                    <Button
                      className="mt-2"
                      disabled={selectedIndex == null || sideFaces.length === 0}
                      onClick={async () => {
                        if (selectedIndex == null) return
                        try {
                          const res = await fetch('/api/plates/latest')
                          const data = await res.json()
                          const holesData: Array<{ x: number; y: number; r: number }> = data?.plate?.holes ?? []
                          if (!holesData.length) {
                            message.warning('未找到 CAD 阵列孔数据')
                            return
                          }
                          const margin = Math.max(0, sideMargin)
                          const w = squareTube.width
                          const mapped = holesData
                            .map(h => ({ x: h.x, z: h.y, diameter: h.r * 2 }))
                            .filter(h => h.x >= -w / 2 + margin && h.x <= w / 2 - margin)
                          const holes = []
                          mapped.forEach(h => {
                            sideFaces.forEach(face => holes.push({ face, x: h.x, z: h.z, diameter: h.diameter ?? sideDiameter, mode: sideMode }))
                          })
                          setSideHoles(selectedIndex, holes as any)
                          message.success('已从 CAD 投射孔阵列到选中管')
                        } catch {
                          message.error('读取 CAD 孔阵列失败')
                        }
                      }}
                    >
                      从 CAD 投射
                    </Button>
                  </Form>
                )
              },
              {
                key: 'aids',
                label: <span className="font-medium text-gray-600">辅助 / Aids</span>,
                children: (
                  <div className="space-y-3 px-1">
                     <div className="flex items-center justify-between">
                        <span className="text-xs">插入模式</span>
                        <Switch size="small" checked={insertMode} onChange={setInsertMode} />
                     </div>
                     
                     <div className="space-y-1">
                        <div className="text-xs text-gray-500">轴锁定 (Axis Lock)</div>
                        <Segmented size="small" block options={[{ label: '自由', value: 'NONE' }, { label: 'X', value: 'X' }, { label: 'Y', value: 'Y' }, { label: 'Z', value: 'Z' }]} value={interaction.axisLock} onChange={(v) => setInteractionAxisLock(v as any)} />
                     </div>

                     <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">CPlane</div>
                          <Select size="small" value={cplaneMode} onChange={(v) => setCplaneMode(v as any)} options={[{ label: 'World XY', value: 'WorldXY' }, { label: 'World YZ', value: 'WorldYZ' }, { label: 'World ZX', value: 'WorldZX' }, { label: 'Object', value: 'Object' }]} style={{ width: '100%' }} />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Osnap</div>
                          <Select size="small" mode="multiple" maxTagCount="responsive" value={[osnapEnd ? 'End' : null, osnapMid ? 'Mid' : null].filter(Boolean)} options={[{ label: 'End', value: 'End' }, { label: 'Mid', value: 'Mid' }]} onChange={(vals) => { setOsnapEnd((vals as any[]).includes('End')); setOsnapMid((vals as any[]).includes('Mid')) }} style={{ width: '100%' }} />
                        </div>
                     </div>

                     <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded">
                        <div className="flex items-center gap-2">
                           <span className="text-xs">Ortho</span>
                           <Switch size="small" checked={orthoEnabled} onChange={setOrthoEnabled} />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs">触控板</span>
                           <Switch size="small" checked={touchpadMode} onChange={setTouchpadMode} />
                        </div>
                     </div>

                     <div className="space-y-2 pt-2 border-t border-dashed">
                        <div className="flex items-center gap-2">
                           <span className="text-xs w-16">吸附步长</span>
                           <InputNumber size="small" value={snapSize} min={1} max={100} step={1} onChange={(v) => setSnapSize(Number(v))} className="flex-1" />
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1"><Switch size="small" checked={snapToPoint} onChange={setSnapToPoint} /><span className="text-xs">锁点</span></div>
                           <div className="flex items-center gap-1"><Switch size="small" checked={gridSnapEnabled} onChange={setGridSnapEnabled} /><span className="text-xs">格点</span></div>
                        </div>
                     </div>
                  </div>
                )
              },
              {
                key: 'tools',
                label: <span className="font-medium text-gray-600">工具 / Tools</span>,
                children: (
                  <div className="px-1">
                    <div className="text-xs font-medium mb-2">定位孔 (Holes)</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                       <InputNumber prefix="D" size="small" min={2.5} max={10} step={0.1} value={holeSpec.diameter} onChange={(v) => setHoleSpec({ ...holeSpec, diameter: Number(v) })} style={{ width: '100%' }} />
                       <InputNumber prefix="P" size="small" min={10} max={200} step={1} value={holeSpec.pitch} onChange={(v) => setHoleSpec({ ...holeSpec, pitch: Number(v) })} style={{ width: '100%' }} />
                    </div>
                    <Select mode="multiple" size="small" placeholder="选择孔面" value={holeSpec.faces} onChange={(v) => setHoleSpec({ ...holeSpec, faces: v as any })} options={[{ label: '顶面 (Y+)', value: 'TOP' }, { label: '底面 (Y-)', value: 'BOTTOM' }, { label: '左侧 (X+)', value: 'LEFT' }, { label: '右侧 (X-)', value: 'RIGHT' }]} style={{ width: '100%' }} />
                  </div>
                )
              },
              {
                key: 'stats',
                label: <span className="font-medium text-gray-600">统计 / Stats</span>,
                children: (
                  <div className="px-1">
                    {(() => {
                      const unit = remoteProps ?? calcSquareTubeProps(squareTube)
                      const count = Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY)
                      const unitWeight = (unit as any).weightKg ?? (unit as any).weight ?? 0
                      const totalWeight = unitWeight * count
                      const totalLength = (squareTube.length * count) / 1000 
                      const totalPrice = calcPriceCny(squareTube.material, totalWeight)
                      const items = [
                        {
                          partNo: `ST-${squareTube.width}x${squareTube.height}x${squareTube.thickness}`,
                          name: '方管',
                          spec: `${squareTube.width}×${squareTube.height}×t${squareTube.thickness}×L${squareTube.length}`,
                          qty: count,
                          unit: '件',
                          remark: squareTube.material,
                        },
                      ]
                      const handleExport = async (type: 'excel' | 'pdf') => {
                         const res = await fetch(`/api/bom/export/${type}`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ items, pageSize: 1000 }),
                         })
                         const data = await res.json()
                         if (data?.files) {
                           for (const f of data.files) window.open(f.url, '_blank')
                         }
                      }
                      return (
                        <div className="space-y-3">
                           <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded">
                              <div><div className="text-[10px] text-gray-400">总长(m)</div><div className="font-bold text-gray-700">{totalLength.toFixed(2)}</div></div>
                              <div><div className="text-[10px] text-gray-400">重量(kg)</div><div className="font-bold text-gray-700">{totalWeight.toFixed(2)}</div></div>
                              <div><div className="text-[10px] text-gray-400">价格(¥)</div><div className="font-bold text-blue-600">{totalPrice.toFixed(0)}</div></div>
                           </div>
                           <div className="flex gap-2">
                              <Button block size="small" onClick={() => handleExport('excel')}>Excel</Button>
                              <Button block size="small" onClick={() => handleExport('pdf')}>PDF</Button>
                           </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              }
            ]}
          />
        </div>
        
        {/* PRICE/WEIGHT Panel moved inside main card */}
        <PricePanel
          showPricePanel={showPricePanel}
          tubeArray={tubeArray}
          squareTube={squareTube}
        />
      </Card>

      <ContextMenu
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        deleteSelected={deleteSelected}
        setMode={(mode) => {
          if (transformControlsRef.current) transformControlsRef.current.setMode(mode)
        }}
        setShowPropertiesPanel={setShowPropertiesPanel}
        toggleLock={toggleLock}
      />
    </div>
  )
}

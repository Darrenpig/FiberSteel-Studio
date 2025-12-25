import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { useModelingStore } from '@/store/modeling'
import { Form, InputNumber, Select, Card, Statistic, Space, Dropdown, Segmented, Button as AntButton, Switch, Tooltip, Popover } from 'antd'
import { cn } from '@/lib/utils'
import { calcSquareTubeProps, calcPriceCny } from '@/lib/properties'
import { downloadText } from '@/lib/download'
import { Button } from 'antd'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { 
  MousePointer2, BoxSelect, Triangle, Box, DoorOpen, Link, LayoutTemplate, 
  Circle, Settings, MoveDown, Wrench, Ruler, Save, Scissors, Copy, 
  Clipboard, Trash2, Undo2, Redo2, Grid, Magnet, FileBox, Hexagon, Move, Hand, Rotate3d,
  Eye, Monitor, LayoutDashboard, DollarSign, User, Box as Cube, Navigation
} from 'lucide-react'

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
  const controlsRef = useRef<OrbitControls | null>(null)
  const exporterRef = useRef<STLExporter | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const outlinePassRef = useRef<OutlinePass | null>(null)
  const highlightMeshRef = useRef<THREE.Mesh | null>(null)
  const insertPlaneRef = useRef<THREE.Plane | null>(null)
  const [insertRotationY, setInsertRotationY] = useState<number>(0)
  const lengthHelperRef = useRef<THREE.Group | null>(null)
  const lengthAdjustStateRef = useRef<{ active: boolean; base: THREE.Vector3; dir: THREE.Vector3 } | null>(null)
  const lengthCandidateRef = useRef<number | null>(null)
  const transformControlsRef = useRef<TransformControls | null>(null)
  const [remoteProps, setRemoteProps] = useState<null | { volume: number; weight: number; surfaceArea: number }>(null)
  const positionOverrides = useModelingStore((s) => s.positionOverrides)
  const setPosition = useModelingStore((s) => s.setPosition)
  const rotations = useModelingStore((s) => s.rotations)
  const setRotationY = useModelingStore((s) => s.setRotationY)
  const locks = useModelingStore((s) => s.locks)
  const toggleLock = useModelingStore((s) => s.toggleLock)
  const holes = useModelingStore((s) => s.holes)
  const toggleHoles = useModelingStore((s) => s.toggleHoles)
  const undo = useModelingStore((s) => s.undo)
  const redo = useModelingStore((s) => s.redo)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [deletedMap, setDeletedMap] = useState<Record<number, boolean>>({})
  const draggingRef = useRef<{ index: number; startX: number; startZ: number } | null>(null)
  const raycasterRef = useRef<THREE.Raycaster | null>(null)
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
  const insertMode = useModelingStore((s) => s.insertMode)
  const setInsertMode = useModelingStore((s) => s.setInsertMode)
  const basePoint = useModelingStore((s) => s.basePoint)
  const setBasePoint = useModelingStore((s) => s.setBasePoint)
  const snapSize = useModelingStore((s) => s.snapSize)
  const setSnapSize = useModelingStore((s) => s.setSnapSize)
  const snapToPoint = useModelingStore((s) => s.snapToPoint)
  const setSnapToPoint = useModelingStore((s) => s.setSnapToPoint)
  const addInserted = useModelingStore((s) => s.addInserted)
  const insertGroupRef = useRef<THREE.Group | null>(null)
  const previewMeshRef = useRef<THREE.Mesh | null>(null)
  const [axisLock, setAxisLock] = useState<'free' | 'lockX' | 'lockZ' | 'lockY'>('free')
  const [activeTool, setActiveTool] = useState<'select' | 'profile' | 'measure'>('select')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null)
  const [batchEditOpen, setBatchEditOpen] = useState(false)
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
    } },
    { id: 'profile', label: '方管', labelEn: 'Square Tube', icon: BoxSelect, action: () => { setInsertMode(true); setActiveTool('profile') } },
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
  ]

  const [measureText, setMeasureText] = useState<string>('')
  const [measurePos, setMeasurePos] = useState<{ x: number; y: number } | null>(null)

  const createTubeGeometry = useMemo(() => {
    return (width: number, height: number, thickness: number, length: number) => {
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
      const geometry = new THREE.ExtrudeGeometry(outer, extrudeSettings)
      geometry.translate(0, h / 2, -length / 2)
      return geometry
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
    scene.add(originAxes)
    axesRef.current = originAxes
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
      const material = new THREE.MeshStandardMaterial({ color: '#8a8a8a', metalness: 0.6, roughness: 0.3 })
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
      const m = new THREE.MeshStandardMaterial({ color: '#4b9ef5', transparent: true, opacity: 0.5 })
      const mesh = new THREE.Mesh(g, m)
      mesh.visible = false
      scene.add(mesh)
      previewMeshRef.current = mesh
    }
    const handle = () => {
      controls.update()
      composer.render()
      requestAnimationFrame(handle)
    }
    handle()
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
      if (axesRef.current) axesRef.current.visible = true
    }
    updateHelpers()
    raycasterRef.current = new THREE.Raycaster()
    const dom = renderer.domElement
    const toNdc = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      return new THREE.Vector2(x, y)
    }
    const pointerDown = (e: MouseEvent) => {
      const ndc = toNdc(e)
      const raycaster = raycasterRef.current!
      raycaster.setFromCamera(ndc, camera)
      
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
        if (previewMeshRef.current) {
          previewMeshRef.current.position.set(bp.x, bp.y, bp.z)
          previewMeshRef.current.visible = true
          previewMeshRef.current.rotation.y = THREE.MathUtils.degToRad(insertRotationY)
        }
        if (orientHelperRef.current) {
          orientHelperRef.current.position.set(bp.x, bp.y, bp.z)
          orientHelperRef.current.visible = true
        }
        if (planeNormal) {
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
               // Re-raycast to get point
               const intersects = raycaster.intersectObject(highlightMeshRef.current!, true)
               if (intersects.length > 0) startPoint.copy(intersects[0].point)
            } else if (hitInter) {
               startPoint.copy(hitInter.point)
            }

            draggingRef.current = { index, startX: startPoint.x, startZ: startPoint.z } // Note: startX/Z are not strictly used, we project on plane in move
            if (controlsRef.current) controlsRef.current.enabled = false
        }
      } else {
        setSelectedIndex(null)
        draggingRef.current = null
        const helper = lengthHelperRef.current
        if (helper) helper.visible = false
        lengthAdjustStateRef.current = null
        lengthCandidateRef.current = null
      }
    }
    const pointerMove = (e: MouseEvent) => {
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
        let x = 0, y = 0, z = 0
        const pos = new THREE.Vector3()

        // Handle Point Snapping in Move Phase (if hovering object)
        // Note: For simplicity, move phase mainly relies on axis lock or plane intersection.
        // Full vertex snapping during move would require raycasting objects again.
        
        let hitObject = false
        if (snapToPoint && axisLock === 'free') {
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
                           
                           if (da <= db && da <= dc) pos.copy(a)
                           else if (db <= da && db <= dc) pos.copy(b)
                           else pos.copy(c)
                       }
                  }
             }
        }

        if (hitObject) {
             x = pos.x
             y = pos.y
             z = pos.z
        } else {
            if (axisLock === 'lockY') {
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
    
            if (axisLock === 'lockX') {
              z = basePoint.z
            } else if (axisLock === 'lockZ') {
              x = basePoint.x
            }
        }
        
        previewMeshRef.current.position.set(x, y, z)
        const dx = x - basePoint.x
        const dz = z - basePoint.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        const dy = y - basePoint.y
        const dir = new THREE.Vector3(dx, dy, dz)
        if (dir.lengthSq() > 1e-6) {
          const qTarget = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize())
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
        return
      }
      if (!draggingRef.current) return
      const ndc = toNdc(e)
      const raycaster = raycasterRef.current!
      raycaster.setFromCamera(ndc, camera)
      // Project onto XZ plane at y=0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const pos = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, pos)
      const index = draggingRef.current.index
      if (locks[index]) return
      const baseIx = Math.floor(index / Math.max(1, tubeArray.countY))
      const baseIy = index % Math.max(1, tubeArray.countY)
      const bx = baseIx * tubeArray.spacingX
      const bz = baseIy * tubeArray.spacingY
      const nx = pos.x - bx
      const nz = pos.z - bz
      setPosition(index, { x: nx, y: 0, z: nz }, false)
    }
    const pointerUp = () => {
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
      fetch('/api/positions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: 'square-tube', instanceIndex: index, x: ov.x, y: ov.y, z: ov.z }),
      })
      fetch('/api/logs/write', {
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
    return () => {
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      dom.removeEventListener('contextmenu', onContextMenu)
      dom.removeEventListener('mousedown', pointerDown)
      dom.removeEventListener('mousemove', pointerMove)
      dom.removeEventListener('mouseup', pointerUp)
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
  }, [activeTool])

 

  useEffect(() => {
    const tctrl = transformControlsRef.current
    if (!tctrl) return
    tctrl.setTranslationSnap(snapSize || 0)
  }, [snapSize])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Insert mode: Space to rotate preview, Enter to finish
      if (e.code === 'Space') {
        if (insertMode) {
          e.preventDefault()
          setInsertRotationY((r) => {
            const next = (r + 90) % 360
            if (previewMeshRef.current) {
              previewMeshRef.current.rotation.y = THREE.MathUtils.degToRad(next)
            }
            return next
          })
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
    const holeGeometry = new THREE.CylinderGeometry(1.5, 1.5, 5, 16)
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
        const r = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(rot))
        const t = new THREE.Matrix4().makeTranslation(ix * tubeArray.spacingX + ov.x, ov.y, iy * tubeArray.spacingY + ov.z)
        mx.multiplyMatrices(t, r)
        inst.setMatrixAt(j, mx)

        if (holes[originalIndex]) {
          const w = squareTube.width
          const h = squareTube.height
          const l = squareTube.length
          const pitch = 20
          const count = Math.floor(l / pitch)
          const startZ = -l / 2 + (l - (count - 1) * pitch) / 2
          
          for (let k = 0; k < count; k++) {
            const z = startZ + k * pitch
            // Top face (Y+)
            const mTop = new THREE.Matrix4()
            mTop.makeRotationX(-Math.PI / 2)
            mTop.setPosition(0, h / 2, z)
            mTop.premultiply(mx)
            holeInst.setMatrixAt(holeIdx++, mTop)

            // Bottom face (Y-)
            const mBot = new THREE.Matrix4()
            mBot.makeRotationX(Math.PI / 2)
            mBot.setPosition(0, -h / 2, z)
            mBot.premultiply(mx)
            holeInst.setMatrixAt(holeIdx++, mBot)

            // Left face (X+)
            const mLeft = new THREE.Matrix4()
            mLeft.makeRotationY(Math.PI / 2)
            mLeft.setPosition(w / 2, 0, z)
            mLeft.premultiply(mx)
            holeInst.setMatrixAt(holeIdx++, mLeft)

            // Right face (X-)
            const mRight = new THREE.Matrix4()
            mRight.makeRotationY(-Math.PI / 2)
            mRight.setPosition(-w / 2, 0, z)
            mRight.premultiply(mx)
            holeInst.setMatrixAt(holeIdx++, mRight)
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
  }, [squareTube.width, squareTube.height, squareTube.thickness, squareTube.length, tubeArray.countX, tubeArray.countY, tubeArray.spacingX, tubeArray.spacingY, positionOverrides, rotations, holes, deletedMap])

  useEffect(() => {
    const highlight = highlightMeshRef.current
    const outline = outlinePassRef.current
    const group = tubesGroupRef.current
    const tctrl = transformControlsRef.current
    if (!highlight || !outline || !group) return

    if (selectedIndex != null) {
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
            fetch('/api/logs/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'move', message: 'TransformControls move', data: { index: selectedIndex, ...next } }),
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
  }, [selectedIndex, squareTube, tubeArray, positionOverrides, rotations, createTubeGeometry])

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
      <div className="col-span-12 h-auto border bg-white/80 px-2 pb-1">
        <div className="flex h-8 items-center gap-3">
          <Dropdown
            menu={{
              items: [
                { key: 'new', label: t('new') },
                { key: 'open', label: t('open') },
                { key: 'save', label: t('save') },
                { key: 'export', label: t('export') },
              ],
            }}
          >
            <AntButton type="text">{t('file')}</AntButton>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                { key: 'undo', label: t('undo'), onClick: () => undo() },
                { key: 'redo', label: t('redo'), onClick: () => redo() },
                { key: 'copy', label: t('copy') },
                { key: 'paste', label: t('paste') },
              ],
            }}
          >
            <AntButton type="text">{t('edit')}</AntButton>
          </Dropdown>
          <AntButton type="text">{t('help')}</AntButton>
          <div className="ml-auto flex items-center gap-2">
            <Segmented options={['zh', 'en']} value={lang} onChange={(v) => setLang(v as any)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 border-t pt-1 pb-1">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded px-2 py-1 hover:bg-gray-100 min-w-[50px]',
                activeTool === tool.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              )}
              onClick={() => {
                if (tool.id === 'select' || tool.id === 'profile' || tool.id === 'measure') {
                  tool.action()
                } else {
                  // Placeholder action
                  setActiveTool(tool.id as any)
                }
              }}
            >
              <tool.icon className="h-6 w-6 mb-1" />
              <span className="text-[11px] leading-none">{lang === 'zh' ? tool.label : tool.labelEn}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t pt-1 mt-0.5">
          <Tooltip title={t('save')}><Button type="text" size="small" icon={<Save size={14} />} /></Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Tooltip title={t('undo')}><Button type="text" size="small" icon={<Undo2 size={14} />} onClick={undo} /></Tooltip>
          <Tooltip title={t('redo')}><Button type="text" size="small" icon={<Redo2 size={14} />} onClick={redo} /></Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Tooltip title={t('copy')}><Button type="text" size="small" icon={<Copy size={14} />} /></Tooltip>
          <Tooltip title={t('paste')}><Button type="text" size="small" icon={<Clipboard size={14} />} /></Tooltip>
          <Tooltip title="删除"><Button type="text" size="small" icon={<Trash2 size={14} />} onClick={deleteSelected} disabled={selectedIndex == null} /></Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Tooltip title={t('export')}><Button type="text" size="small" icon={<FileBox size={14} />} onClick={exportSTL} /></Tooltip>
          <Tooltip title="Grid Snap"><Button type="text" size="small" icon={<Grid size={14} />} /></Tooltip>
          <Tooltip title="Magnet"><Button type="text" size="small" icon={<Magnet size={14} />} /></Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Tooltip title={t('price')}>
            <Button type="text" size="small" onClick={() => setShowPricePanel(v => !v)}>
              <DollarSign size={14} className={cn("mr-1", showPricePanel ? 'text-blue-500' : '')} /> {t('price')}
            </Button>
          </Tooltip>
          <Tooltip title={t('properties')}>
            <Button type="text" size="small" onClick={() => setShowPropertiesPanel(v => !v)}>
              <LayoutDashboard size={14} className={cn("mr-1", showPropertiesPanel ? 'text-blue-500' : '')} /> {t('properties')}
            </Button>
          </Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Tooltip title={t('showProfiles')}>
            <Button type="text" size="small" onClick={() => setOnlyProfiles(v => !v)}>
              <Monitor size={14} className={cn("mr-1", onlyProfiles ? 'text-blue-500' : '')} /> {t('showProfiles')}
            </Button>
          </Tooltip>
          <Tooltip title={t('lowDetail')}>
            <Button type="text" size="small" onClick={() => setLowDetail(v => !v)}>
              <Eye size={14} className={cn("mr-1", lowDetail ? 'text-blue-500' : '')} /> {t('lowDetail')}
            </Button>
          </Tooltip>
          <div className="h-3 w-px bg-gray-300" />
          <Popover
            content={
              <div className="w-64">
                 <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-xs mb-1">数量X</div>
                      <InputNumber
                        value={tubeArray.countX}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => setTubeArray({ countX: Number(v) })}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </div>
                    <div>
                      <div className="text-xs mb-1">数量Y</div>
                      <InputNumber
                        value={tubeArray.countY}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => setTubeArray({ countY: Number(v) })}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs mb-1">间距X (mm)</div>
                      <InputNumber
                        value={tubeArray.spacingX}
                        min={0}
                        max={5000}
                        step={10}
                        onChange={(v) => setTubeArray({ spacingX: Number(v) })}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </div>
                    <div>
                      <div className="text-xs mb-1">间距Y (mm)</div>
                      <InputNumber
                        value={tubeArray.spacingY}
                        min={0}
                        max={5000}
                        step={10}
                        onChange={(v) => setTubeArray({ spacingY: Number(v) })}
                        style={{ width: '100%' }}
                        size="small"
                      />
                    </div>
                 </div>
              </div>
            }
            title="批量阵列设置"
            trigger="click"
            open={batchEditOpen}
            onOpenChange={setBatchEditOpen}
          >
            <Button type="text" size="small" className={cn(batchEditOpen ? 'text-blue-500' : '')}>
              <BoxSelect size={14} className="mr-1" /> 阵列
            </Button>
          </Popover>
        </div>
      </div>
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
        </div>
        <div ref={mountRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Bottom Left Toolbar */}
          <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            {/* View Controls */}
            <div className="flex gap-0.5 bg-white/90 p-1 rounded border shadow-sm pointer-events-auto">
              <Tooltip title="Top View" placement="right">
                <Button type="text" size="small" onClick={() => { cameraRef.current?.position.set(0, 1000, 0); cameraRef.current?.lookAt(0,0,0) }}>
                  <BoxSelect size={16} className="mr-1" /> Top
                </Button>
              </Tooltip>
              <Tooltip title="Front View" placement="right">
                <Button type="text" size="small" onClick={() => { cameraRef.current?.position.set(0, 0, 1000); cameraRef.current?.lookAt(0,0,0) }}>
                  <LayoutTemplate size={16} className="mr-1" /> Front
                </Button>
              </Tooltip>
              <Tooltip title="Right View" placement="right">
                <Button type="text" size="small" onClick={() => { cameraRef.current?.position.set(1000, 0, 0); cameraRef.current?.lookAt(0,0,0) }}>
                  <LayoutTemplate className="rotate-90 mr-1" size={16} /> Right
                </Button>
              </Tooltip>
              <Tooltip title="ISO View" placement="right">
                <Button type="text" size="small" onClick={() => { cameraRef.current?.position.set(600, 400, 600); cameraRef.current?.lookAt(0,0,0) }}>
                  <Cube size={16} className="mr-1" /> ISO
                </Button>
              </Tooltip>
              <div className="w-px bg-gray-200 mx-0.5" />
              <Tooltip title={t('resetView')} placement="right">
                <Button type="text" size="small" onClick={() => cameraRef.current?.position.set(600, 400, 600)}>
                  <Rotate3d size={16} className="mr-1" /> Reset
                </Button>
              </Tooltip>
              <div className="w-px bg-gray-200 mx-0.5" />
              <Tooltip title={t('steering')} placement="right">
                <Button type="text" size="small">
                  <Navigation size={16} className="mr-1" /> Steering
                </Button>
              </Tooltip>
              <Tooltip title={t('viewCube')} placement="right">
                <Button type="text" size="small" onClick={() => {
                  const group = tubesGroupRef.current
                  const controls = controlsRef.current
                  const camera = cameraRef.current
                  if (!group || !controls || !camera) return

                  const box = new THREE.Box3().setFromObject(group)
                  if (box.isEmpty()) {
                    camera.position.set(600, 400, 600)
                    camera.lookAt(0, 0, 0)
                    controls.target.set(0, 0, 0)
                    controls.update()
                    return
                  }
                  
                  const center = box.getCenter(new THREE.Vector3())
                  const size = box.getSize(new THREE.Vector3())
                  const maxDim = Math.max(size.x, size.y, size.z)
                  const fov = camera.fov * (Math.PI / 180)
                  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
                  cameraZ *= 1.5 // Zoom out a little so object fits in view

                  const direction = new THREE.Vector3(1, 1, 1).normalize()
                  const position = center.clone().add(direction.multiplyScalar(cameraZ))

                  camera.position.copy(position)
                  camera.lookAt(center)
                  controls.target.copy(center)
                  controls.update()
                }}>
                  <Cube size={16} className="mr-1" /> Best View
                </Button>
              </Tooltip>
              <Tooltip title={t('man')} placement="right">
                <Button type="text" size="small">
                  <User size={16} className="mr-1" /> Man
                </Button>
              </Tooltip>
            </div>
            
            {/* Display Options */}
            {/* <div className="flex gap-0.5 bg-white/90 p-1 rounded border shadow-sm pointer-events-auto">
              <Tooltip title={t('showProfiles')} placement="right">
                <Button type="text" size="small" onClick={() => setOnlyProfiles(v => !v)}>
                  <Monitor size={16} className={cn("mr-1", onlyProfiles ? 'text-blue-500' : '')} /> {t('showProfiles')}
                </Button>
              </Tooltip>
              <Tooltip title={t('lowDetail')} placement="right">
                <Button type="text" size="small" onClick={() => setLowDetail(v => !v)}>
                  <Eye size={16} className={cn("mr-1", lowDetail ? 'text-blue-500' : '')} /> {t('lowDetail')}
                </Button>
              </Tooltip>
            </div> */}

            {/* Widgets */}
            {/* <div className="flex gap-0.5 bg-white/90 p-1 rounded border shadow-sm pointer-events-auto">
              <Tooltip title={t('price')} placement="right">
                <Button type="text" size="small" onClick={() => setShowPricePanel(v => !v)}>
                  <DollarSign size={16} className={cn("mr-1", showPricePanel ? 'text-blue-500' : '')} /> {t('price')}
                </Button>
              </Tooltip>
              <Tooltip title={t('properties')} placement="right">
                <Button type="text" size="small" onClick={() => setShowPropertiesPanel(v => !v)}>
                  <LayoutDashboard size={16} className={cn("mr-1", showPropertiesPanel ? 'text-blue-500' : '')} /> {t('properties')}
                </Button>
              </Tooltip>
            </div> */}
          </div>

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
        </div>
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
        className="col-span-3 h-full overflow-auto" 
        size="small" 
        styles={{ body: { padding: '8px' } }}
      >
        <div className="mb-2 flex gap-2">
          <Button onClick={exportSTL} type="primary" size="small">导出STL</Button>
          <Button onClick={undo} size="small">撤销</Button>
          <Button onClick={redo} size="small">重做</Button>
        </div>
        <Form layout="vertical" size="small">
          <div className="bg-blue-50/50 p-2 rounded-md border border-blue-100 mb-2">
            <div className="grid grid-cols-2 gap-2">
              <Form.Item label="长度 (mm)" className="mb-0">
                <InputNumber
                  value={squareTube.length}
                  min={50}
                  max={5000}
                  step={10}
                  onChange={(v) => setSquareTube({ length: Number(v) })}
                  style={{ width: '100%' }}
                  className="border-blue-200"
                />
              </Form.Item>
              <Form.Item label="宽度 (mm)" className="mb-0">
                <InputNumber
                  value={squareTube.width}
                  min={5}
                  max={200}
                  step={1}
                  onChange={(v) => setSquareTube({ width: Number(v) })}
                  style={{ width: '100%' }}
                  className="border-blue-200"
                />
              </Form.Item>
            </div>
          </div>

          {selectedIndex != null && (
            <div className="grid grid-cols-3 gap-1 mb-2">
              <Form.Item label="偏移X" className="mb-0">
                <InputNumber
                  ref={inputXRef as any}
                  value={positionOverrides[selectedIndex]?.x ?? 0}
                  step={1}
                  onChange={(v) => {
                    const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }
                    const next = { ...ov, x: Number(v) }
                    setPosition(selectedIndex, next, true)
                    fetch('/api/positions/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }),
                    })
                    fetch('/api/logs/write', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'move', message: 'Set X offset', data: { index: selectedIndex, x: next.x } }),
                    })
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="偏移Y" className="mb-0">
                <InputNumber
                  ref={inputYRef as any}
                  value={positionOverrides[selectedIndex]?.y ?? 0}
                  step={1}
                  onChange={(v) => {
                    const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }
                    const next = { ...ov, y: Number(v) }
                    setPosition(selectedIndex, next, true)
                    fetch('/api/positions/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }),
                    })
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="偏移Z" className="mb-0">
                <InputNumber
                  ref={inputZRef as any}
                  value={positionOverrides[selectedIndex]?.z ?? 0}
                  step={1}
                  onChange={(v) => {
                    const ov = positionOverrides[selectedIndex] ?? { x: 0, y: 0, z: 0 }
                    const next = { ...ov, z: Number(v) }
                    setPosition(selectedIndex, next, true)
                    fetch('/api/positions/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ group: 'square-tube', instanceIndex: selectedIndex, ...next }),
                    })
                    fetch('/api/logs/write', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'move', message: 'Set Z offset', data: { index: selectedIndex, z: next.z } }),
                    })
                  }}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Form.Item label="高度 (mm)" className="mb-2">
              <InputNumber
                value={squareTube.height}
                min={5}
                max={200}
                step={1}
                onChange={(v) => setSquareTube({ height: Number(v) })}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="壁厚 (mm)" className="mb-2">
              <InputNumber
                value={squareTube.thickness}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => setSquareTube({ thickness: Number(v) })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Form.Item label="材料" className="mb-2">
              <Select
                value={squareTube.material}
                options={[
                  { label: 'Q235', value: 'Q235' },
                  { label: 'Q345', value: 'Q345' },
                ]}
                onChange={(v) => setSquareTube({ material: v })}
              />
            </Form.Item>
            <Form.Item label="标准" className="mb-2">
              <Select
                value={squareTube.standard}
                options={[
                  { label: 'GB/T 6728-2017', value: 'GB/T 6728-2017' },
                  { label: 'GB/T 700-2006', value: 'GB/T 700-2006' },
                ]}
                onChange={(v) => setSquareTube({ standard: v })}
              />
            </Form.Item>
          </div>
          {activeTool === 'profile' && (
          <Card title="放置 / Placement" size="small" className="mt-2" styles={{ body: { padding: '8px' } }}>
            <div className="flex items-center gap-2 mb-2">
              <Switch size="small" checked={insertMode} onChange={(v) => setInsertMode(v)} />
              <span className="text-xs">模式</span>
              <Segmented
                size="small"
                options={[
                  { label: '自由', value: 'free' },
                  { label: '锁X', value: 'lockX' },
                  { label: '锁Y', value: 'lockY' },
                  { label: '锁Z', value: 'lockZ' },
                ]}
                value={axisLock}
                onChange={(v) => setAxisLock(v as any)}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div>
                <div className="text-xs mb-1">基点X</div>
                <InputNumber size="small" value={basePoint.x} step={0.1} onChange={(v) => setBasePoint({ x: Number(v) })} style={{ width: '100%' }} />
              </div>
              <div>
                <div className="text-xs mb-1">基点Y</div>
                <InputNumber size="small" value={basePoint.y} step={0.1} onChange={(v) => setBasePoint({ y: Number(v) })} style={{ width: '100%' }} />
              </div>
              <div>
                <div className="text-xs mb-1">基点Z</div>
                <InputNumber size="small" value={basePoint.z} step={0.1} onChange={(v) => setBasePoint({ z: Number(v) })} style={{ width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs whitespace-nowrap">吸附步长</div>
              <InputNumber size="small" value={snapSize} min={1} max={100} step={1} onChange={(v) => setSnapSize(Number(v))} className="flex-1" />
              <div className="flex items-center gap-1">
                 <Switch size="small" checked={snapToPoint} onChange={(v) => setSnapToPoint(v)} />
                 <span className="text-xs whitespace-nowrap">锁点</span>
              </div>
              <Button
                size="small"
                onClick={() => {
                  setInsertMode(true)
                }}
                type="primary"
              >
                开启
              </Button>
            </div>
          </Card>
          )}
        </Form>
        <Card title="BOM导出" size="small" className="mt-2" styles={{ body: { padding: '8px' } }}>
          {(() => {
            const count = Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY)
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
            return (
              <Space orientation="vertical" style={{ width: '100%' }}>
                <div>
                  <div>分页大小</div>
                  <InputNumber id="bom-page-size" min={1} max={500} defaultValue={items.length} style={{ width: '100%' }} />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      const pageSizeEl = document.getElementById('bom-page-size') as HTMLInputElement
                      const pageSize = Number(pageSizeEl?.value ?? items.length)
                      const res = await fetch('/api/bom/export/excel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items, pageSize }),
                      })
                      const data = await res.json()
                      if (data?.files) {
                        fetch('/api/logs/write', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'export', message: 'Export BOM Excel', data: { files: data.files } }),
                        })
                        for (const f of data.files) {
                          window.open(f.url, '_blank')
                        }
                      }
                    }}
                  >
                    导出Excel
                  </Button>
                  <Button
                    onClick={async () => {
                      const pageSizeEl = document.getElementById('bom-page-size') as HTMLInputElement
                      const pageSize = Number(pageSizeEl?.value ?? items.length)
                      const res = await fetch('/api/bom/export/pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items, pageSize }),
                      })
                      const data = await res.json()
                      if (data?.files) {
                        fetch('/api/logs/write', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'export', message: 'Export BOM PDF', data: { files: data.files } }),
                        })
                        for (const f of data.files) {
                          window.open(f.url, '_blank')
                        }
                      }
                    }}
                  >
                    导出PDF
                  </Button>

                </div>
                <div className="border-t pt-2 mt-2">
                  {(() => {
                    const unit = remoteProps ?? calcSquareTubeProps(squareTube)
                    const count = Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY)
                    const unitWeight = (unit as any).weightKg ?? (unit as any).weight ?? 0
                    const totalWeight = unitWeight * count
                    const totalLength = (squareTube.length * count) / 1000 // Convert to meters
                    const totalPrice = calcPriceCny(squareTube.material, totalWeight)
                    return (
                      <Space style={{ width: '100%' }}>
                        <Statistic
                          title="总长度 (m)"
                          value={totalLength.toFixed(2)}
                          styles={{ content: { fontSize: '16px' } }}
                        />
                        <Statistic
                          title="重量 (kg)"
                          value={totalWeight.toFixed(3)}
                          styles={{ content: { fontSize: '16px' } }}
                        />
                        <Statistic
                          title="价格 (¥)"
                          value={totalPrice.toFixed(2)}
                          styles={{ content: { fontSize: '16px' } }}
                        />
                      </Space>
                    )
                  })()}
                </div>
              </Space>
            )
          })()}
        </Card>
      </Card>
      {showPricePanel && (
        <Card title="PRICE/WEIGHT / 价格/重量" className="col-span-3 h-full overflow-auto">
          <Space style={{ width: '100%' }}>
            <AntButton>Maytec (USA) / Maytec (美国)</AntButton>
            <AntButton
              onClick={async () => {
                const count = Math.max(1, tubeArray.countX) * Math.max(1, tubeArray.countY)
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
                await fetch('/api/logs/write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'bom', message: 'Get Bill Of Materials', data: { items } }),
                })
              }}
            >
              Get Bill Of Materials / 生成物料清单
            </AntButton>
            <AntButton>Add Parts / 添加零件</AntButton>
            <AntButton>Edit BOM... / 编辑物料清单...</AntButton>
            <AntButton>REVIEW and QUOTE / 审核与报价</AntButton>
          </Space>
        </Card>
      )}

      {contextMenu && (
        <div 
          className="fixed z-50 bg-white border shadow-md rounded w-48 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              // TODO: Cut logic
            }}
          >
            <div className="flex items-center gap-2"><Scissors size={14} /> 剪切(C)</div>
            <span className="text-gray-400 text-xs">Ctrl+X</span>
          </div>
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              // TODO: Clone logic
            }}
          >
            <div className="flex items-center gap-2"><Copy size={14} /> 复制(O)</div>
            <span className="text-gray-400 text-xs">Ctrl+C</span>
          </div>
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              deleteSelected()
            }}
          >
            <div className="flex items-center gap-2"><Trash2 size={14} /> 删除(D)</div>
            <span className="text-gray-400 text-xs">Del</span>
          </div>
          <div className="h-px bg-gray-200 my-1" />
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              const tctrl = transformControlsRef.current
              if (tctrl) tctrl.setMode('translate')
            }}
          >
            <div className="flex items-center gap-2"><Move size={14} /> 移动(T)</div>
          </div>
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              const tctrl = transformControlsRef.current
              if (tctrl) tctrl.setMode('rotate')
            }}
          >
            <div className="flex items-center gap-2"><Rotate3d size={14} /> 旋转(R)</div>
          </div>
          <div className="h-px bg-gray-200 my-1" />
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              setShowPropertiesPanel(true)
            }}
          >
            <div className="flex items-center gap-2"><LayoutDashboard size={14} /> 属性(P)</div>
          </div>
          <div 
            className="flex items-center justify-between px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => {
              setContextMenu(null)
              if (selectedIndex != null) toggleLock(selectedIndex)
            }}
          >
            <div className="flex items-center gap-2"><Settings size={14} /> 固定位置</div>
          </div>
        </div>
      )}
      {contextMenu && <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />}
    </div>
  )
}

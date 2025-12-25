import { create } from 'zustand'

export type SquareTubeParams = {
  width: number
  height: number
  thickness: number
  length: number
  material: string
  standard: string
}

export type FiberBoardParams = {
  width: number
  height: number
  thickness: number
  fiberType: string
  resinType: string
}

type ModelingState = {
  squareTube: SquareTubeParams
  fiberBoard: FiberBoardParams
  tubeArray: {
    countX: number
    countY: number
    spacingX: number
    spacingY: number
  }
  positionOverrides: Record<number, { x: number; y: number; z: number }>
  rotations: Record<number, { ry: number }>
  locks: Record<number, boolean>
  holes: Record<number, boolean>
  undoStack: Array<{ index: number; prev: { x: number; y: number; z: number }; next: { x: number; y: number; z: number } }>
  redoStack: Array<{ index: number; prev: { x: number; y: number; z: number }; next: { x: number; y: number; z: number } }>
  insertMode: boolean
  basePoint: { x: number; y: number; z: number }
  snapSize: number
  snapToPoint: boolean
  inserted: Array<{ x: number; y: number; z: number; ry: number }>
  setSquareTube: (p: Partial<SquareTubeParams>) => void
  setFiberBoard: (p: Partial<FiberBoardParams>) => void
  setTubeArray: (p: Partial<ModelingState['tubeArray']>) => void
  setPosition: (index: number, pos: { x: number; y: number; z: number }, pushHistory?: boolean) => void
  setRotationY: (index: number, ry: number) => void
  toggleLock: (index: number) => void
  toggleHoles: (index: number) => void
  setInsertMode: (v: boolean) => void
  setBasePoint: (p: Partial<{ x: number; y: number; z: number }>) => void
  setSnapSize: (n: number) => void
  setSnapToPoint: (v: boolean) => void
  addInserted: (item: { x: number; y: number; z: number; ry: number }) => void
  clearInserted: () => void
  undo: () => void
  redo: () => void
}

export const useModelingStore = create<ModelingState>((set) => ({
  squareTube: {
    width: 20,
    height: 20,
    thickness: 2,
    length: 200,
    material: 'Q235',
    standard: 'GB/T 6728-2017',
  },
  fiberBoard: {
    width: 1000,
    height: 1000,
    thickness: 5,
    fiberType: 'E-glass',
    resinType: 'epoxy',
  },
  tubeArray: {
    countX: 1,
    countY: 1,
    spacingX: 50,
    spacingY: 50,
  },
  positionOverrides: {},
  rotations: {},
  locks: {},
  holes: {},
  undoStack: [],
  redoStack: [],
  insertMode: false,
  basePoint: { x: 0, y: 0, z: 0 },
  snapSize: 10,
  snapToPoint: false,
  inserted: [],
  setSquareTube: (p) =>
    set((s) => ({ squareTube: { ...s.squareTube, ...p } })),
  setFiberBoard: (p) =>
    set((s) => ({ fiberBoard: { ...s.fiberBoard, ...p } })),
  setTubeArray: (p) =>
    set((s) => ({ tubeArray: { ...s.tubeArray, ...p } })),
  setPosition: (index, pos, pushHistory = true) =>
    set((s) => {
      if (s.locks[index]) return s
      const prev = s.positionOverrides[index] ?? { x: 0, y: 0, z: 0 }
      const next = { x: pos.x, y: pos.y, z: pos.z }
      const positionOverrides = { ...s.positionOverrides, [index]: next }
      const undoStack = pushHistory ? [...s.undoStack, { index, prev, next }] : s.undoStack
      return { positionOverrides, undoStack, redoStack: pushHistory ? [] : s.redoStack }
    }),
  setRotationY: (index, ry) =>
    set((s) => {
      if (s.locks[index]) return s
      const rotations = { ...s.rotations, [index]: { ry } }
      return { rotations }
    }),
  toggleLock: (index) =>
    set((s) => {
      const locks = { ...s.locks, [index]: !s.locks[index] }
      return { locks }
    }),
  toggleHoles: (index) =>
    set((s) => {
      const holes = { ...s.holes, [index]: !s.holes[index] }
      return { holes }
    }),
  setInsertMode: (v) => set(() => ({ insertMode: v })),
  setBasePoint: (p) =>
    set((s) => ({ basePoint: { ...s.basePoint, ...p } })),
  setSnapSize: (n) => set(() => ({ snapSize: n })),
  setSnapToPoint: (v) => set(() => ({ snapToPoint: v })),
  addInserted: (item) =>
    set((s) => ({ inserted: [...s.inserted, item] })),
  clearInserted: () => set(() => ({ inserted: [] })),
  undo: () =>
    set((s) => {
      const last = s.undoStack[s.undoStack.length - 1]
      if (!last) return s
      const positionOverrides = { ...s.positionOverrides, [last.index]: last.prev }
      const undoStack = s.undoStack.slice(0, -1)
      const redoStack = [...s.redoStack, last]
      return { positionOverrides, undoStack, redoStack }
    }),
  redo: () =>
    set((s) => {
      const last = s.redoStack[s.redoStack.length - 1]
      if (!last) return s
      const positionOverrides = { ...s.positionOverrides, [last.index]: last.next }
      const redoStack = s.redoStack.slice(0, -1)
      const undoStack = [...s.undoStack, last]
      return { positionOverrides, undoStack, redoStack }
    }),
}))


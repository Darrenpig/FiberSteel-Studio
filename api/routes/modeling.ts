import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'

const router = Router()

router.post('/square-tube', (req: Request, res: Response): void => {
  const {
    width = 20,
    height = 20,
    thickness = 2,
    length = 200,
    material = 'Q235',
    standard = 'GB/T 6728-2017',
  } = req.body ?? {}
  const iw = Math.max(0, width - 2 * thickness)
  const ih = Math.max(0, height - 2 * thickness)
  const crossArea = width * height - iw * ih
  const volume = crossArea * length
  const steelDensityKgPerMm3 = 7.85e-6
  const weight = volume * steelDensityKgPerMm3
  const lateralOuter = 2 * length * (width + height)
  const lateralInner = 2 * length * (iw + ih)
  const endRing = 2 * (width * height - iw * ih)
  const surfaceArea = lateralOuter + lateralInner + endRing
  res.json({
    modelId: crypto.randomUUID(),
    previewUrl: null,
    downloadUrl: null,
    properties: {
      volume,
      weight,
      surfaceArea,
    },
    parameters: {
      width,
      height,
      thickness,
      length,
      material,
      standard,
    },
  })
})

router.post('/fiber-board', (req: Request, res: Response): void => {
  const {
    width = 1000,
    height = 1000,
    thickness = 5,
    fiberType = 'E-glass',
    resinType = 'epoxy',
  } = req.body ?? {}
  const volume = width * height * thickness
  const resinDensityKgPerMm3 = 1.2e-6
  const weight = volume * resinDensityKgPerMm3
  const surfaceArea = 2 * (width * height + width * thickness + height * thickness)
  res.json({
    modelId: crypto.randomUUID(),
    previewUrl: null,
    downloadUrl: null,
    properties: {
      volume,
      weight,
      surfaceArea,
    },
    parameters: {
      width,
      height,
      thickness,
      fiberType,
      resinType,
    },
  })
})

export default router


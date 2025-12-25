export function calcSquareTubeProps(params: {
  width: number
  height: number
  thickness: number
  length: number
}) {
  const { width: w, height: h, thickness: t, length: L } = params
  const iw = Math.max(0, w - 2 * t)
  const ih = Math.max(0, h - 2 * t)
  const crossArea = w * h - iw * ih // mm^2
  const volume = crossArea * L // mm^3
  const steelDensityKgPerMm3 = 7.85e-6
  const weightKg = volume * steelDensityKgPerMm3
  const lateralOuter = 2 * L * (w + h)
  const lateralInner = 2 * L * (iw + ih)
  const endRing = 2 * (w * h - iw * ih)
  const surfaceArea = lateralOuter + lateralInner + endRing // mm^2
  return {
    volume, // mm^3
    weightKg,
    surfaceArea, // mm^2
  }
}

export function calcPriceCny(material: string, weightKg: number) {
  const rates: Record<string, number> = {
    Q235: 5.2,
    Q345: 6.0,
  }
  const rate = rates[material] ?? 5.0
  return weightKg * rate
}


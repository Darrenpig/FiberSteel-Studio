import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../data')
const exportsDir = path.resolve(__dirname, '../tmp/exports')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(dataDir)
ensureDir(exportsDir)

export function readJSON<T>(name: string, fallback: T): T {
  const file = path.join(dataDir, name)
  try {
    const s = fs.readFileSync(file, 'utf-8')
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function writeJSON(name: string, data: any) {
  const file = path.join(dataDir, name)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

export function writeExportFile(filename: string, content: string) {
  const file = path.join(exportsDir, filename)
  fs.writeFileSync(file, content, 'utf-8')
  return file
}

export function getExportPublicPath(filename: string) {
  return `/api/exports/${encodeURIComponent(filename)}`
}

export function listExports(): string[] {
  try {
    return fs.readdirSync(exportsDir)
  } catch {
    return []
  }
}

export function readExportFile(filename: string) {
  const file = path.join(exportsDir, filename)
  return fs.readFileSync(file)
}


import { isValidCandle } from '../../calculations/candleStats.ts'
import type { Candle } from '../../types/market.ts'

export interface ParseResult {
  candles: Candle[]
  errors: string[]
}

function parseTime(raw: string): number | null {
  const value = raw.trim()
  if (!value) return null
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    if (numeric > 1e12) return Math.floor(numeric / 1000)
    if (numeric > 1e9) return Math.floor(numeric)
  }
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) return Math.floor(parsed / 1000)
  const local = Date.parse(value.replace(' ', 'T'))
  if (Number.isFinite(local)) return Math.floor(local / 1000)
  return null
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function fromRows(rows: Record<string, string>[], errors: string[]): Candle[] {
  const candles: Candle[] = []
  rows.forEach((row, index) => {
    const time = parseTime(row.time ?? row.timestamp ?? row.date ?? '')
    const open = Number(row.open)
    const high = Number(row.high)
    const low = Number(row.low)
    const close = Number(row.close)
    const volumeRaw = row.volume ?? row.vol
    const candle: Candle = { time: time ?? Number.NaN, open, high, low, close }
    if (volumeRaw != null && volumeRaw !== '') candle.volume = Number(volumeRaw)
    if (!isValidCandle(candle)) {
      errors.push(`Row ${index + 1} is not a valid OHLC candle.`)
      return
    }
    candles.push(candle)
  })
  return dedupe(candles)
}

function dedupe(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>()
  for (const candle of candles) byTime.set(candle.time, candle)
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}

function parseCsv(text: string): ParseResult {
  const errors: string[] = []
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return { candles: [], errors: ['The CSV needs a header and at least one candle.'] }
  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase())
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    header.forEach((key, index) => {
      row[key] = cells[index] ?? ''
    })
    return row
  })
  const candles = fromRows(rows, errors)
  if (candles.length === 0 && errors.length === 0) errors.push('No candles found in the CSV.')
  return { candles, errors }
}

function parseJson(text: string): ParseResult {
  const errors: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { candles: [], errors: ['The JSON file could not be parsed.'] }
  }
  const records = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { candles?: unknown }).candles)
      ? (parsed as { candles: unknown[] }).candles
      : null
  if (!records) return { candles: [], errors: ['JSON must be an array of candles or an object with a candles array.'] }
  const rows = records.map((item) => {
    const row = item as Record<string, unknown>
    const asText = (value: unknown) => (value == null ? '' : String(value))
    return {
      time: asText(row.time ?? row.timestamp ?? row.date),
      open: asText(row.open),
      high: asText(row.high),
      low: asText(row.low),
      close: asText(row.close),
      volume: asText(row.volume ?? row.vol),
    }
  })
  return { candles: fromRows(rows, errors), errors }
}

export function parseCandleFile(text: string, fileName: string): ParseResult {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.json')) return parseJson(text)
  if (lower.endsWith('.csv')) return parseCsv(text)
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return parseJson(text)
  return parseCsv(text)
}

export function candlesToCsv(candles: Candle[]): string {
  const lines = ['time,open,high,low,close,volume']
  for (const candle of candles) {
    lines.push(
      [candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume ?? ''].join(','),
    )
  }
  return lines.join('\n')
}

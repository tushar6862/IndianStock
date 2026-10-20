import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tokenPath = join(root, 'server', 'data', 'token.json')
const port = 8787
const tokenCookie = 'fyers_token'
const stateCookie = 'fyers_state'

loadEnv(join(root, '.env'))

const appId = process.env.FYERS_APP_ID?.trim() ?? ''
const secret = process.env.FYERS_SECRET?.trim() ?? ''

const symbols = {
  NIFTY50: ['NSE:NIFTY50-INDEX'],
  SENSEX: ['BSE:SENSEX-INDEX', 'BSE:SENSEX'],
}

let pendingState = ''

function loadEnv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const splitAt = trimmed.indexOf('=')
    if (splitAt < 1) continue
    const key = trimmed.slice(0, splitAt).trim()
    const value = trimmed.slice(splitAt + 1).trim()
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value
  }
}

function appIdHash() {
  return createHash('sha256').update(`${appId}:${secret}`).digest('hex')
}

function readTokenFile() {
  if (process.env.VERCEL || !existsSync(tokenPath)) return ''
  try {
    const parsed = JSON.parse(readFileSync(tokenPath, 'utf8'))
    return parsed?.accessToken || ''
  } catch {
    return ''
  }
}

function writeTokenFile(accessToken) {
  if (process.env.VERCEL) return
  mkdirSync(dirname(tokenPath), { recursive: true })
  writeFileSync(tokenPath, JSON.stringify({ accessToken, savedAt: Date.now() }), { encoding: 'utf8' })
}

function readCookies(request) {
  const header = request.headers?.cookie || ''
  const cookies = {}
  for (const part of String(header).split(';')) {
    const splitAt = part.indexOf('=')
    if (splitAt < 1) continue
    const key = part.slice(0, splitAt).trim()
    const value = part.slice(splitAt + 1).trim()
    try {
      cookies[key] = decodeURIComponent(value)
    } catch {
      cookies[key] = value
    }
  }
  return cookies
}

function secureCookie(request) {
  return publicOrigin(request).startsWith('https://')
}

function serializeCookie(name, value, { maxAge, secure }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`)
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

function accessTokenFrom(request) {
  return readCookies(request)[tokenCookie] || readTokenFile()
}

function istParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date)
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? ''
  let hour = Number(pick('hour'))
  if (hour === 24) hour = 0
  const month = pick('month').padStart(2, '0')
  const day = pick('day').padStart(2, '0')
  return {
    date: `${pick('year')}-${month}-${day}`,
    hour,
    minute: Number(pick('minute')),
    weekday: pick('weekday'),
  }
}

function marketOpen(date = new Date()) {
  const clock = istParts(date)
  if (clock.weekday === 'Sat' || clock.weekday === 'Sun') return false
  const minutes = clock.hour * 60 + clock.minute
  return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30
}

function publicOrigin(request) {
  const configured = process.env.FYERS_REDIRECT_URI?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // Fall through to the request host when the env value is not a URL.
    }
  }
  if (typeof request.url === 'string' && request.url.startsWith('http')) {
    return new URL(request.url).origin
  }
  const forwardedHost = request.headers?.['x-forwarded-host'] || request.headers?.host || '127.0.0.1:5173'
  const host = String(forwardedHost).split(',')[0].trim()
  const forwardedProto = request.headers?.['x-forwarded-proto']
  const proto = forwardedProto
    ? String(forwardedProto).split(',')[0].trim()
    : host.startsWith('127.0.0.1') || host.startsWith('localhost')
      ? 'http'
      : 'https'
  return `${proto}://${host}`
}

function redirectUriFor(request) {
  const configured = process.env.FYERS_REDIRECT_URI?.trim()
  if (configured) return configured
  return `${publicOrigin(request)}/api/fyers/callback`
}

function send(response, status, body, type = 'application/json', cookies = []) {
  if (cookies.length) response.setHeader('Set-Cookie', cookies)
  response.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
  })
  response.end(typeof body === 'string' ? body : JSON.stringify(body))
}

function loginUrl(request) {
  pendingState = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUriFor(request),
    response_type: 'code',
    state: pendingState,
  })
  return { url: `https://api-t1.fyers.in/api/v3/generate-authcode?${params.toString()}`, state: pendingState }
}

function extractCode(input) {
  const value = String(input ?? '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value)
    return url.searchParams.get('auth_code') || url.searchParams.get('code') || ''
  }
  return value
}

async function exchangeCode(code) {
  if (!appId || !secret) {
    throw new Error('FYERS app id or secret is missing. Add both in the server environment.')
  }
  const response = await fetch('https://api-t1.fyers.in/api/v3/validate-authcode', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      appIdHash: appIdHash(),
      code,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.s === 'error' || !payload.access_token) {
    throw new Error(payload.message || 'FYERS did not return an access token. Log in again.')
  }
  writeTokenFile(payload.access_token)
  return payload.access_token
}

async function fyersGet(path, accessToken) {
  if (!accessToken) {
    const error = new Error('FYERS login required.')
    error.status = 401
    throw error
  }
  const response = await fetch(`https://api-t1.fyers.in${path}`, {
    headers: { Authorization: `${appId}:${accessToken}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (response.status === 401 || payload.code === -15 || payload.code === -16 || payload.code === -8) {
    const error = new Error('FYERS token expired. Log in again.')
    error.status = 401
    throw error
  }
  if (!response.ok || payload.s === 'error') {
    throw new Error(payload.message || 'FYERS request failed.')
  }
  return payload
}

function candlesFromHistory(payload) {
  const rows = Array.isArray(payload.candles) ? payload.candles : []
  return rows
    .map((row) => {
      const [time, open, high, low, close, volume] = row
      const candle = { time: Number(time), open: Number(open), high: Number(high), low: Number(low), close: Number(close) }
      if (Number(volume) > 0) candle.volume = Number(volume)
      return candle
    })
    .filter((candle) => [candle.time, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time)
}

function quoteFrom(entry) {
  const values = entry?.v
  if (!values || !Number.isFinite(Number(values.lp))) return null
  const time = Number(values.tt)
  return {
    price: Number(values.lp),
    change: Number(values.ch),
    changePercent: Number(values.chp),
    time: Number.isFinite(time) ? (time > 1e12 ? Math.floor(time / 1000) : time) : Math.floor(Date.now() / 1000),
  }
}

async function historyFor(symbol, accessToken) {
  const to = istParts().date
  const from = istParts(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)).date
  const params = (start) =>
    new URLSearchParams({
      symbol,
      resolution: '1',
      date_format: '1',
      range_from: start,
      range_to: to,
      cont_flag: '1',
    })
  try {
    return await fyersGet(`/data/history?${params(from).toString()}`, accessToken)
  } catch (error) {
    if (error.status === 401 || from === to) throw error
    return fyersGet(`/data/history?${params(to).toString()}`, accessToken)
  }
}

async function loadSymbol(symbol, accessToken) {
  const [history, quotes] = await Promise.all([
    historyFor(symbol, accessToken),
    fyersGet(`/data/quotes?${new URLSearchParams({ symbols: symbol }).toString()}`, accessToken),
  ])
  const quoteRow = Array.isArray(quotes.d) ? quotes.d.find((item) => item.n === symbol) ?? quotes.d[0] : null
  if (quoteRow?.s === 'error') {
    throw new Error(quoteRow.message || `${symbol} quote failed.`)
  }
  const quote = quoteFrom(quoteRow)
  const fresh = marketOpen() && quote != null && Math.abs(Date.now() / 1000 - quote.time) < 180
  return {
    candles: candlesFromHistory(history),
    quote,
    freshness: fresh ? 'live' : 'delayed',
    sourceLabel: `FYERS · ${symbol}`,
    symbol,
  }
}

async function loadInstrument(instrument, accessToken) {
  const candidates = symbols[instrument]
  if (!candidates) throw new Error('Unknown instrument.')
  let lastError = new Error('FYERS symbol request failed.')
  for (const symbol of candidates) {
    try {
      return await loadSymbol(symbol, accessToken)
    } catch (error) {
      lastError = error
      if (error.status === 401) throw error
      const message = String(error.message || '').toLowerCase()
      if (!message.includes('symbol') && !message.includes('invalid')) throw error
    }
  }
  throw lastError
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function callbackPage(ok, message, home) {
  const title = ok ? 'FYERS connected' : 'FYERS login failed'
  const safeHome = escapeHtml(home)
  const detail = ok ? 'FYERS login save ho gaya. Dashboard par wapas ja rahe hain.' : escapeHtml(message)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Segoe UI,sans-serif;background:#070b12;color:#e7eef8;padding:40px"><h1>${title}</h1><p>${detail}</p><p><a style="color:#5b9dff" href="${safeHome}">Open dashboard</a></p>${ok ? `<script>setTimeout(()=>location.href=${JSON.stringify(home)},800)</script>` : ''}</body></html>`
}

async function readBody(request) {
  if (typeof request.body === 'string') return request.body ? JSON.parse(request.body) : {}
  if (Buffer.isBuffer(request.body)) return request.body.length ? JSON.parse(request.body.toString('utf8')) : {}
  if (request.body && typeof request.body === 'object') return request.body
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 8000) throw new Error('Request is too large.')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function requestUrl(request) {
  const raw = request.url || '/'
  const url = new URL(raw, 'http://127.0.0.1')
  if (!url.pathname.startsWith('/api') && Array.isArray(request.query?.path)) {
    url.pathname = `/api/${request.query.path.map((part) => encodeURIComponent(part)).join('/')}`
  }
  return url
}

export async function handle(request, response) {
  try {
    const url = requestUrl(request)
    const secure = secureCookie(request)
    const home = `${publicOrigin(request)}/`
    if (request.method === 'GET' && url.pathname === '/api/fyers/status') {
      const connected = Boolean(accessTokenFrom(request))
      send(response, 200, {
        connected,
        configured: Boolean(appId && secret),
        redirectUri: redirectUriFor(request),
        message: connected
          ? 'FYERS login is saved for this browser.'
          : 'Log in with FYERS. The app secret stays on the server.',
      })
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/fyers/login') {
      if (!appId || !secret) {
        send(response, 500, { message: 'FYERS app id or secret is missing in the server environment.' })
        return
      }
      const login = loginUrl(request)
      send(response, 200, { url: login.url, redirectUri: redirectUriFor(request) }, 'application/json', [
        serializeCookie(stateCookie, login.state, { maxAge: 600, secure }),
      ])
      return
    }
    if (request.method === 'POST' && url.pathname === '/api/fyers/exchange') {
      const body = await readBody(request)
      const code = extractCode(body.code)
      if (!code) {
        send(response, 400, { message: 'Paste the FYERS auth code or the full redirect URL.' })
        return
      }
      const accessToken = await exchangeCode(code)
      send(response, 200, { connected: true }, 'application/json', [
        serializeCookie(tokenCookie, accessToken, { maxAge: 60 * 60 * 18, secure }),
      ])
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/fyers/callback') {
      const code = url.searchParams.get('auth_code') || url.searchParams.get('code') || ''
      const state = url.searchParams.get('state') || ''
      const expected = readCookies(request)[stateCookie] || (!process.env.VERCEL ? pendingState : '')
      if (!code || !expected || state !== expected) {
        send(response, 400, callbackPage(false, 'Login did not return a usable auth code. Check the FYERS redirect URL.', home), 'text/html')
        return
      }
      const accessToken = await exchangeCode(code)
      pendingState = ''
      send(response, 200, callbackPage(true, '', home), 'text/html', [
        serializeCookie(tokenCookie, accessToken, { maxAge: 60 * 60 * 18, secure }),
        serializeCookie(stateCookie, '', { maxAge: 0, secure }),
      ])
      return
    }
    if (request.method === 'GET' && url.pathname === '/api/market/candles') {
      const instrument = url.searchParams.get('instrument')
      const payload = await loadInstrument(instrument, accessTokenFrom(request))
      send(response, 200, payload)
      return
    }
    send(response, 404, { message: 'Not found.' })
  } catch (error) {
    const status = error.status || 500
    send(response, status, { message: error.message || 'FYERS server error.' })
  }
}

export async function handleWeb(webRequest) {
  const nodeRequest = {
    method: webRequest.method,
    url: webRequest.url,
    headers: Object.fromEntries(webRequest.headers.entries()),
    body: webRequest.method === 'GET' || webRequest.method === 'HEAD' ? undefined : await webRequest.text(),
  }
  let status = 200
  const headers = {}
  const chunks = []
  const nodeResponse = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = value
    },
    writeHead(code, extra = {}) {
      status = code
      for (const [name, value] of Object.entries(extra)) headers[name.toLowerCase()] = value
    },
    end(body) {
      if (body != null) chunks.push(body)
    },
  }
  await handle(nodeRequest, nodeResponse)
  const responseHeaders = new Headers()
  for (const [name, value] of Object.entries(headers)) {
    if (name === 'set-cookie' && Array.isArray(value)) {
      for (const cookie of value) responseHeaders.append('set-cookie', cookie)
    } else if (value != null) {
      responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : String(value))
    }
  }
  return new Response(chunks.join(''), { status, headers: responseHeaders })
}

export function startServer() {
  const server = createServer((request, response) => {
    void handle(request, response)
  })
  server.listen(port, '127.0.0.1', () => {
    console.log(`FYERS local API on http://127.0.0.1:${port}`)
    console.log(`Redirect URL to register in FYERS: ${process.env.FYERS_REDIRECT_URI?.trim() || 'http://127.0.0.1:5173/api/fyers/callback'}`)
  })
  return server
}

const startedDirectly = !process.env.VERCEL && process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (startedDirectly) startServer()

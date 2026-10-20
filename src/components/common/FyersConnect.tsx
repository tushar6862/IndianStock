import { useEffect, useState } from 'react'
import { exchangeFyersCode, fetchFyersLoginUrl, fetchFyersStatus } from '../../services/marketData/fyersClient.ts'
import { useMarketStore } from '../../store/useMarketStore.ts'

export function FyersConnect() {
  const loadFyers = useMarketStore((state) => state.loadFyers)
  const loading = useMarketStore((state) => state.loading)
  const [redirectUri, setRedirectUri] = useState('http://127.0.0.1:5173/api/fyers/callback')
  const [connected, setConnected] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchFyersStatus()
      .then((status) => {
        setConnected(status.connected)
        if (status.redirectUri) setRedirectUri(status.redirectUri)
      })
      .catch(() => setError('Local FYERS server is not running. Start the app with npm run dev.'))
  }, [])

  const login = async () => {
    setError('')
    try {
      const next = await fetchFyersLoginUrl()
      if (next.redirectUri) setRedirectUri(next.redirectUri)
      if (!next.url?.startsWith('https://')) {
        throw new Error(next.url ? 'FYERS login URL was not valid.' : 'FYERS login did not return a URL. Check the server environment variables.')
      }
      window.open(next.url, '_blank', 'noopener,noreferrer')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'FYERS login could not start.')
    }
  }

  const submit = async () => {
    setError('')
    try {
      await exchangeFyersCode(code)
      setConnected(true)
      setCode('')
      await loadFyers()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Auth code was rejected.')
    }
  }

  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-sm font-semibold">{connected ? 'FYERS token saved on this PC' : 'FYERS live data'}</p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Login opens the FYERS page. The app secret stays on the local server. In the FYERS app, set the redirect URL to {redirectUri}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void login()} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white">
          Login with FYERS
        </button>
        {connected ? (
          <button type="button" onClick={() => void loadFyers()} disabled={loading} className="rounded-md border border-line px-3 py-2 text-sm">
            Reload FYERS data
          </button>
        ) : null}
      </div>
      <label className="mt-3 block text-xs text-muted">
        Auth code, if FYERS shows it on the redirect page
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-text"
          placeholder="Paste auth code or the full redirect URL"
        />
      </label>
      <button type="button" onClick={() => void submit()} className="mt-2 rounded-md border border-line px-3 py-2 text-sm">
        Use auth code
      </button>
      {error ? <p className="mt-2 text-sm text-bear">{error}</p> : null}
    </div>
  )
}

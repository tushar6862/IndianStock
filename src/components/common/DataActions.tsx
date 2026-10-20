import { useRef } from 'react'
import { INSTRUMENTS } from '../../types/market.ts'
import { useMarketStore } from '../../store/useMarketStore.ts'

export function DataActions({ showDisconnect = true }: { showDisconnect?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const instrument = useMarketStore((state) => state.instrument)
  const origins = useMarketStore((state) => state.origins)
  const loadSample = useMarketStore((state) => state.loadSample)
  const disconnect = useMarketStore((state) => state.disconnect)
  const importFile = useMarketStore((state) => state.importFile)
  const hasData = origins.NIFTY50 !== 'disconnected' || origins.SENSEX !== 'disconnected'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={loadSample}
        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Load sample data
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm font-medium hover:border-accent"
      >
        Import CSV or JSON
      </button>
      {showDisconnect && hasData ? (
        <button
          type="button"
          onClick={disconnect}
          className="rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:text-text"
        >
          Disconnect
        </button>
      ) : null}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".csv,.json,text/csv,application/json"
        aria-label={`Import candles for ${INSTRUMENTS[instrument].name}`}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void file.text().then((text) => importFile(text, file.name))
        }}
      />
    </div>
  )
}

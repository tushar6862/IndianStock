import { Card } from '../components/common/Card.tsx'
import { DataActions } from '../components/common/DataActions.tsx'
import { IndicatorSettingsForm, IndicatorToggles } from '../components/indicators/IndicatorControls.tsx'
import { FyersConnect } from '../components/common/FyersConnect.tsx'
import { candlesToCsv } from '../services/marketData/parseCandles.ts'
import { generateSampleCandles } from '../services/marketData/sampleData.ts'
import { useMarketStore } from '../store/useMarketStore.ts'

export function SettingsPage() {
  const theme = useMarketStore((state) => state.theme)
  const setTheme = useMarketStore((state) => state.setTheme)
  const instrument = useMarketStore((state) => state.instrument)

  const downloadSample = () => {
    const csv = candlesToCsv(generateSampleCandles(instrument))
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = instrument === 'NIFTY50' ? 'nifty-sample-not-live.csv' : 'sensex-sample-not-live.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Card title="Appearance">
        <div className="flex gap-2" role="group" aria-label="Theme">
          {(['dark', 'light'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={theme === item}
              onClick={() => setTheme(item)}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${theme === item ? 'bg-accent text-white' : 'border border-line'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">The theme choice is saved in this browser. No account data is stored.</p>
      </Card>
      <Card title="Indicator settings">
        <IndicatorSettingsForm />
        <div className="mt-4">
          <IndicatorToggles />
        </div>
      </Card>
      <Card title="Data source">
        <p className="text-sm leading-6 text-muted">
          Import applies to the index selected on the dashboard. Columns: time, open, high, low, close, and optional volume. Time can be a UNIX timestamp in seconds or an ISO date.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <DataActions />
          <button type="button" onClick={downloadSample} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-accent">
            Download sample CSV
          </button>
        </div>
      </Card>
      <Card title="FYERS">
        <FyersConnect />
      </Card>
    </div>
  )
}

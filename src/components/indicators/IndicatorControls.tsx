import type { IndicatorSettings, IndicatorVisibility } from '../../types/market.ts'
import { useMarketStore } from '../../store/useMarketStore.ts'

const visibilityFields: Array<{ key: keyof IndicatorVisibility; label: string }> = [
  { key: 'vwap', label: 'VWAP' },
  { key: 'emaFast', label: 'EMA 9' },
  { key: 'emaSlow', label: 'EMA 21' },
  { key: 'supertrend', label: 'Supertrend' },
  { key: 'volume', label: 'Volume' },
]

export function IndicatorToggles() {
  const visibility = useMarketStore((state) => state.visibility)
  const setVisibility = useMarketStore((state) => state.setVisibility)
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Chart overlays">
      {visibilityFields.map((field) => (
        <label key={field.key} className="inline-flex items-center gap-2 rounded-md border border-line px-2 py-1 text-xs">
          <input
            type="checkbox"
            checked={visibility[field.key]}
            onChange={(event) => setVisibility({ [field.key]: event.target.checked })}
          />
          {field.label}
        </label>
      ))}
    </div>
  )
}

export function IndicatorSettingsForm() {
  const settings = useMarketStore((state) => state.settings)
  const setSettings = useMarketStore((state) => state.setSettings)
  const update = (key: keyof IndicatorSettings, raw: string) => {
    const value = Number(raw)
    setSettings({ ...settings, [key]: value })
  }
  const fields: Array<{ key: keyof IndicatorSettings; label: string; step: string; min: number; max: number }> = [
    { key: 'emaFast', label: 'EMA fast', step: '1', min: 2, max: 200 },
    { key: 'emaSlow', label: 'EMA slow', step: '1', min: 2, max: 200 },
    { key: 'rsiPeriod', label: 'RSI period', step: '1', min: 2, max: 100 },
    { key: 'supertrendPeriod', label: 'Supertrend ATR', step: '1', min: 2, max: 100 },
    { key: 'supertrendMultiplier', label: 'Supertrend multiplier', step: '0.1', min: 0.5, max: 10 },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <label key={field.key} className="block text-xs text-muted">
          {field.label}
          <input
            className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-text"
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={settings[field.key]}
            onChange={(event) => update(field.key, event.target.value)}
          />
        </label>
      ))}
    </div>
  )
}

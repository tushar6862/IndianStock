import { useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { IndicatorVisibility } from '../../types/market.ts'
import type { MarketView } from '../../utils/buildMarketView.ts'
import { formatIst, formatNumber } from '../../utils/format.ts'

function formatAxisTime(time: unknown): string {
  if (typeof time !== 'number') return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(time * 1000))
}

interface HoverBar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

interface SeriesBag {
  candle: ISeriesApi<'Candlestick'>
  vwap: ISeriesApi<'Line'>
  emaFast: ISeriesApi<'Line'>
  emaSlow: ISeriesApi<'Line'>
  supertrendBull: ISeriesApi<'Line'>
  supertrendBear: ISeriesApi<'Line'>
  volume: ISeriesApi<'Histogram'>
}

function lineData(
  view: MarketView,
  values: Array<number | null>,
  allow?: (index: number) => boolean,
) {
  return view.candles.map((candle, index) => {
    const time = candle.time as UTCTimestamp
    const value = values[index]
    if (value == null || (allow && !allow(index))) return { time }
    return { time, value }
  })
}

export function CandleChart({
  view,
  visibility,
  theme,
}: {
  view: MarketView
  visibility: IndicatorVisibility
  theme: 'dark' | 'light'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<SeriesBag | null>(null)
  const candlesRef = useRef(view.candles)
  const [hover, setHover] = useState<HoverBar | null>(null)
  const fitKey = useRef('')

  useEffect(() => {
    candlesRef.current = view.candles
  }, [view.candles])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const dark = theme === 'dark'
    const chart = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: dark ? '#0e1624' : '#ffffff' },
        textColor: dark ? '#93a4bd' : '#52647c',
        fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif',
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: dark ? '#1b2940' : '#e6edf5' },
        horzLines: { color: dark ? '#1b2940' : '#e6edf5' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: dark ? '#24344c' : '#d5dfec' },
      timeScale: {
        borderColor: dark ? '#24344c' : '#d5dfec',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
        tickMarkFormatter: (time: unknown) => formatAxisTime(time),
      },
      localization: {
        timeFormatter: (time: unknown) => (typeof time === 'number' ? formatIst(time) : ''),
      },
    })
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#1fbf75',
      downColor: '#f05252',
      borderVisible: false,
      wickUpColor: '#1fbf75',
      wickDownColor: '#f05252',
      priceLineVisible: true,
      lastValueVisible: true,
    })
    const vwap = chart.addSeries(LineSeries, { color: '#f5a524', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: 'VWAP' })
    const emaFast = chart.addSeries(LineSeries, { color: '#5b9dff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: 'EMA 9' })
    const emaSlow = chart.addSeries(LineSeries, { color: '#c084fc', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: 'EMA 21' })
    const supertrendBull = chart.addSeries(LineSeries, { color: '#1fbf75', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: 'ST' })
    const supertrendBear = chart.addSeries(LineSeries, { color: '#f05252', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } })
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.08, bottom: 0.28 } })

    const onMove = (param: MouseEventParams) => {
      if (typeof param.time !== 'number') {
        setHover(null)
        return
      }
      const bar = param.seriesData.get(candle)
      if (!bar || !('open' in bar)) {
        setHover(null)
        return
      }
      const match = candlesRef.current.find((item) => item.time === param.time)
      setHover({
        time: param.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: match?.volume ?? null,
      })
    }
    chart.subscribeCrosshairMove(onMove)
    chartRef.current = chart
    seriesRef.current = { candle, vwap, emaFast, emaSlow, supertrendBull, supertrendBear, volume }
    fitKey.current = ''
    return () => {
      chart.unsubscribeCrosshairMove(onMove)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [theme])

  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series || view.candles.length === 0) return
    const last = view.candles[view.candles.length - 1]
    series.candle.setData(
      view.candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    )
    series.candle.applyOptions({ priceLineColor: last.close >= last.open ? '#1fbf75' : '#f05252' })
    series.vwap.setData(lineData(view, view.vwapSeries))
    series.emaFast.setData(lineData(view, view.emaFastSeries))
    series.emaSlow.setData(lineData(view, view.emaSlowSeries))
    series.supertrendBull.setData(
      lineData(
        view,
        view.supertrendSeries.map((item) => item.value),
        (index) => view.supertrendSeries[index]?.direction === 'bullish',
      ),
    )
    series.supertrendBear.setData(
      lineData(
        view,
        view.supertrendSeries.map((item) => item.value),
        (index) => view.supertrendSeries[index]?.direction === 'bearish',
      ),
    )
    const hasVolume = view.candles.some((candle) => candle.volume != null && candle.volume > 0)
    series.volume.setData(
      hasVolume
        ? view.candles.map((candle) => ({
            time: candle.time as UTCTimestamp,
            value: candle.volume ?? 0,
            color: candle.close >= candle.open ? 'rgba(31,191,117,0.45)' : 'rgba(240,82,82,0.45)',
          }))
        : [],
    )
    series.vwap.applyOptions({ visible: visibility.vwap })
    series.emaFast.applyOptions({ visible: visibility.emaFast })
    series.emaSlow.applyOptions({ visible: visibility.emaSlow })
    series.supertrendBull.applyOptions({ visible: visibility.supertrend })
    series.supertrendBear.applyOptions({ visible: visibility.supertrend })
    series.volume.applyOptions({ visible: visibility.volume && hasVolume })
    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.08, bottom: visibility.volume && hasVolume ? 0.28 : 0.08 },
    })
    const key = `${view.instrument}-${view.timeframe}-${view.candles[0]?.time}-${view.candles.length}`
    if (fitKey.current !== key) {
      chart.timeScale().fitContent()
      fitKey.current = key
    }
  }, [view, visibility])

  const shown = hover ?? (view.candles.length > 0
    ? {
        time: view.candles[view.candles.length - 1].time,
        open: view.candles[view.candles.length - 1].open,
        high: view.candles[view.candles.length - 1].high,
        low: view.candles[view.candles.length - 1].low,
        close: view.candles[view.candles.length - 1].close,
        volume: view.candles[view.candles.length - 1].volume ?? null,
      }
    : null)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs">
          <Legend swatch="#f5a524" label="VWAP" />
          <Legend swatch="#5b9dff" label="EMA 9" />
          <Legend swatch="#c084fc" label="EMA 21" />
          <Legend swatch="#1fbf75" label="Supertrend up" />
          <Legend swatch="#f05252" label="Supertrend down" />
        </div>
        {shown ? (
          <p className="tabular text-xs text-muted">
            {formatIst(shown.time)} O {formatNumber(shown.open)} H {formatNumber(shown.high)} L {formatNumber(shown.low)} C{' '}
            {formatNumber(shown.close)}
            {shown.volume != null ? ` V ${formatNumber(shown.volume, 0)}` : ''}
          </p>
        ) : null}
      </div>
      <div ref={containerRef} className="h-[420px] w-full" />
      <p className="mt-2 text-xs text-muted">
        Charts by <a className="text-accent underline" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a>
        {' · '}
        {view.volumeNote}
      </p>
      {view.resolutionNote ? <p className="mt-1 text-xs text-warn">{view.resolutionNote}</p> : null}
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: swatch }} />
      {label}
    </span>
  )
}

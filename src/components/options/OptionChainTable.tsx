import { useMemo, useState } from 'react'
import { Badge } from '../common/Badge.tsx'
import type { Moneyness, OptionChain, OptionContract } from '../../types/options.ts'
import { formatNumber, formatPercent, formatSigned } from '../../utils/format.ts'

type SortKey = 'strike' | 'callLtp' | 'putLtp' | 'callOi' | 'putOi' | 'callVolume' | 'putVolume' | 'callOiChange' | 'putOiChange'
type SideFilter = 'BOTH' | 'CALL' | 'PUT'
type MoneyFilter = 'ALL' | Moneyness

interface Row {
  strike: number
  call: OptionContract | null
  put: OptionContract | null
}

function numberOf(contract: OptionContract | null, key: 'ltp' | 'oi' | 'volume' | 'oiChange'): number {
  return contract?.[key] ?? Number.NEGATIVE_INFINITY
}

export function OptionChainTable({ chain }: { chain: OptionChain }) {
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<SideFilter>('BOTH')
  const [money, setMoney] = useState<MoneyFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('strike')
  const [ascending, setAscending] = useState(true)

  const rows = useMemo(() => {
    const grouped = new Map<number, Row>()
    for (const contract of chain.contracts) {
      const row = grouped.get(contract.strike) ?? { strike: contract.strike, call: null, put: null }
      if (contract.side === 'CALL') row.call = contract
      else row.put = contract
      grouped.set(contract.strike, row)
    }
    const filtered = [...grouped.values()].filter((row) => {
      if (query && !String(row.strike).includes(query.trim())) return false
      const contract = side === 'PUT' ? row.put : side === 'CALL' ? row.call : row.call ?? row.put
      if (money === 'ALL') return true
      if (money === 'ATM') return row.strike === chain.atmStrike
      return contract?.moneyness === money
    })
    filtered.sort((a, b) => {
      const value = (row: Row) => {
        if (sortKey === 'strike') return row.strike
        if (sortKey === 'callLtp') return numberOf(row.call, 'ltp')
        if (sortKey === 'putLtp') return numberOf(row.put, 'ltp')
        if (sortKey === 'callOi') return numberOf(row.call, 'oi')
        if (sortKey === 'putOi') return numberOf(row.put, 'oi')
        if (sortKey === 'callVolume') return numberOf(row.call, 'volume')
        if (sortKey === 'putVolume') return numberOf(row.put, 'volume')
        if (sortKey === 'callOiChange') return numberOf(row.call, 'oiChange')
        return numberOf(row.put, 'oiChange')
      }
      const delta = value(a) - value(b)
      return ascending ? delta : -delta
    })
    return filtered
  }, [ascending, chain, money, query, side, sortKey])

  const callOi = chain.contracts.filter((item) => item.side === 'CALL').reduce((sum, item) => sum + item.oi, 0)
  const putOi = chain.contracts.filter((item) => item.side === 'PUT').reduce((sum, item) => sum + item.oi, 0)
  const ratio = callOi > 0 ? putOi / callOi : null

  const sortBy = (key: SortKey) => {
    if (sortKey === key) setAscending((value) => !value)
    else {
      setSortKey(key)
      setAscending(key === 'strike')
    }
  }

  if (chain.origin === 'unavailable') {
    return <p className="text-sm text-muted">{chain.note}</p>
  }

  return (
    <div>
      <p className="text-sm text-warn">{chain.note}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Summary label="Sample call OI" value={formatNumber(callOi, 0)} />
        <Summary label="Sample put OI" value={formatNumber(putOi, 0)} />
        <Summary label="Sample put/call OI" value={ratio == null ? '—' : formatNumber(ratio, 2)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search strike"
          aria-label="Search strike"
          className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm"
        />
        <select className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm" value={side} aria-label="Side filter" onChange={(event) => setSide(event.target.value as SideFilter)}>
          <option value="BOTH">Calls and puts</option>
          <option value="CALL">Calls</option>
          <option value="PUT">Puts</option>
        </select>
        <select className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm" value={money} aria-label="Moneyness filter" onChange={(event) => setMoney(event.target.value as MoneyFilter)}>
          <option value="ALL">All moneyness</option>
          <option value="ITM">ITM</option>
          <option value="ATM">ATM</option>
          <option value="OTM">OTM</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <caption className="sr-only">Sample option chain</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <Header label="Call LTP" onClick={() => sortBy('callLtp')} />
              <Header label="Call chg" />
              <Header label="Call vol" onClick={() => sortBy('callVolume')} />
              <Header label="Call OI" onClick={() => sortBy('callOi')} />
              <Header label="Call OI chg" onClick={() => sortBy('callOiChange')} />
              <Header label="Strike" onClick={() => sortBy('strike')} />
              <Header label="Put LTP" onClick={() => sortBy('putLtp')} />
              <Header label="Put chg" />
              <Header label="Put vol" onClick={() => sortBy('putVolume')} />
              <Header label="Put OI" onClick={() => sortBy('putOi')} />
              <Header label="Put OI chg" onClick={() => sortBy('putOiChange')} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-6 text-center text-muted">
                  No contracts match this filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const atm = row.strike === chain.atmStrike
                return (
                  <tr key={row.strike} className={`border-b border-line ${atm ? 'bg-warn/10' : ''}`}>
                    <Cell contract={row.call} field="ltp" />
                    <ChangeCell contract={row.call} />
                    <Cell contract={row.call} field="volume" digits={0} />
                    <Cell contract={row.call} field="oi" digits={0} />
                    <OiCell contract={row.call} />
                    <td className="px-2 py-2 font-semibold">
                      <span className="tabular">{formatNumber(row.strike, 0)}</span>
                      {atm ? <span className="ml-1"><Badge tone="warn">ATM</Badge></span> : null}
                      <span className="mt-0.5 block text-[10px] text-muted">
                        Call {row.call?.moneyness ?? '—'} · Put {row.put?.moneyness ?? '—'}
                      </span>
                    </td>
                    <Cell contract={row.put} field="ltp" />
                    <ChangeCell contract={row.put} />
                    <Cell contract={row.put} field="volume" digits={0} />
                    <Cell contract={row.put} field="oi" digits={0} />
                    <OiCell contract={row.put} />
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Header({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) {
    return <th className="px-2 py-2 font-medium" scope="col">{label}</th>
  }
  return (
    <th className="px-2 py-2 font-medium" scope="col">
      <button type="button" onClick={onClick} className="hover:text-text">
        {label}
      </button>
    </th>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="tabular text-lg font-semibold">{value}</p>
    </div>
  )
}

function Cell({ contract, field, digits = 2 }: { contract: OptionContract | null; field: 'ltp' | 'volume' | 'oi'; digits?: number }) {
  return <td className="tabular px-2 py-2">{formatNumber(contract?.[field], digits)}</td>
}

function ChangeCell({ contract }: { contract: OptionContract | null }) {
  if (!contract) return <td className="px-2 py-2">—</td>
  const tone = contract.change > 0 ? 'text-bull' : contract.change < 0 ? 'text-bear' : 'text-warn'
  return (
    <td className={`tabular px-2 py-2 ${tone}`}>
      {formatSigned(contract.change)} ({formatPercent(contract.changePercent)})
    </td>
  )
}

function OiCell({ contract }: { contract: OptionContract | null }) {
  if (!contract) return <td className="px-2 py-2">—</td>
  const tone = contract.oiChange > 0 ? 'text-bull' : contract.oiChange < 0 ? 'text-bear' : 'text-warn'
  return <td className={`tabular px-2 py-2 ${tone}`}>{formatSigned(contract.oiChange, 0)}</td>
}

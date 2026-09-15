import { useEffect, useState } from 'react'
import RefreshButton from '../../components/RefreshButton'
import { api } from '../../services/api'
import { getReportSummary } from '../../services/reports'
import { debtService } from '../../services/debts'
import { formatCurrency } from '../../utils/format'

function toIso(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ReportsPage() {
  const today = new Date()
  const [from, setFrom] = useState(toIso(new Date(today.getTime() - 29 * 86400000)))
  const [to, setTo] = useState(toIso(today))
  const [report, setReport] = useState(null)
  const [debtStats, setDebtStats] = useState({
    creditGiven: 0,
    posCreditSales: 0,
    manualDebt: 0,
    paymentReceived: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getReportSummary(from, to)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    try {
      const dStats = debtService.getDebtStatsForRange(from, to)
      if (!cancelled) setDebtStats(dStats)
    } catch {}

    return () => {
      cancelled = true
    }
  }, [from, to, reload])

  function handleRefresh() {
    api.clearCache()
    setReload((n) => n + 1)
  }

  const totalRev = Number(report?.totalAmount) || 0
  const creditGiven = debtStats.creditGiven || 0
  const posCredit = debtStats.posCreditSales || 0
  const directPaid = Math.max(0, totalRev - posCredit)
  const paymentRec = debtStats.paymentReceived || 0
  const totalReceived = directPaid + paymentRec

  const tiles = report
    ? [
        { label: 'Total Orders', value: String(report.salesCount) },
        { label: 'Total Revenue', value: formatCurrency(report.totalAmount) },
        { label: 'Payment Received', value: formatCurrency(totalReceived), highlight: 'text-primary' },
        { label: 'Credit Given', value: formatCurrency(creditGiven), highlight: 'text-[#b45309]' },
        { label: 'Net Profit', value: formatCurrency(report.totalProfit) },
        { label: 'Avg Order Value', value: formatCurrency(report.averageOrderValue) },
      ]
    : []

  const [preset, setPreset] = useState('30d')

  function handlePreset(p) {
    setPreset(p)
    const now = new Date()
    const toStr = toIso(now)
    if (p === 'today') {
      setFrom(toStr)
      setTo(toStr)
    } else if (p === '7d') {
      const past = new Date(now.getTime() - 6 * 86400000)
      setFrom(toIso(past))
      setTo(toStr)
    } else if (p === '30d') {
      const past = new Date(now.getTime() - 29 * 86400000)
      setFrom(toIso(past))
      setTo(toStr)
    } else if (p === 'all') {
      setFrom('2020-01-01')
      setTo(toStr)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold min-[481px]:text-xl md:text-2xl">Sales &amp; Reports</h1>
          <p className="text-xs text-secondary">Revenue, profit, and payment method analysis</p>
        </div>
        <RefreshButton onClick={handleRefresh} disabled={loading} />
      </div>

      {/* Date Presets + Custom Date Range */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePreset(item.id)}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                preset === item.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-secondary hover:bg-bg hover:text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex max-w-none flex-col gap-3 border-t border-border pt-3 md:max-w-[480px] md:flex-row md:gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-semibold text-secondary" htmlFor="from">
              Custom From
            </label>
            <input
              id="from"
              type="date"
              className="min-h-9 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              value={from}
              max={to}
              onChange={(e) => {
                setPreset('custom')
                setFrom(e.target.value)
              }}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-semibold text-secondary" htmlFor="to">
              Custom To
            </label>
            <input
              id="to"
              type="date"
              className="min-h-9 rounded-sm border border-border bg-surface px-3 py-1.5 text-xs text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              value={to}
              min={from}
              max={toIso(new Date())}
              onChange={(e) => {
                setPreset('custom')
                setTo(e.target.value)
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-sm border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </div>
      )}

      {loading && <p className="text-secondary">Loading…</p>}

      {report && (
        <div className="grid grid-cols-2 gap-3 min-[481px]:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] min-[481px]:gap-4">
          {tiles.map((tile) => (
            <div
              className="rounded-lg border border-border bg-surface p-3 shadow-sm min-[481px]:p-4"
              key={tile.label}
            >
              <div className={`text-[19px] leading-tight font-bold min-[481px]:text-[22px] md:text-[26px] ${tile.highlight || 'text-text'}`}>
                {tile.value}
              </div>
              <div className="mt-2 text-[13px] text-secondary font-medium">{tile.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
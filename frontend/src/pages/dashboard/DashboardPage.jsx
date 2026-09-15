import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RevenueChart from '../../components/RevenueChart'
import {
  IconAlert,
  IconBanknote,
  IconBookUser,
  IconBox,
  IconCart,
  IconChart,
  IconCheck,
  IconRefresh,
  IconTrendDown,
  IconTrendUp,
} from '../../components/icons'
import { getDashboardSummary } from '../../services/dashboard'
import { debtService } from '../../services/debts'
import { shopProfileService } from '../../services/shopProfile'
import { formatCurrency, formatDateTime, formatRelativeTime } from '../../utils/format'
import { api, auth } from '../../services/api'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function TrendPill({ today, yesterday, format }) {
  const numToday = Number(today) || 0
  const numYesterday = Number(yesterday) || 0
  const same = yesterday === null || yesterday === undefined
  const diff = same ? 0 : numToday - numYesterday
  const pct = same || numYesterday === 0 ? null : Math.abs((diff / numYesterday) * 100)

  if (same || diff === 0) {
    return <span className="text-xs text-muted">Same as yesterday</span>
  }

  const up = diff > 0
  const diffFormatted = format ? format(Math.abs(diff)) : Math.abs(diff)
  const pctFormatted = pct !== null && !Number.isNaN(pct) ? ` (${pct.toFixed(0)}%)` : ''
  const text = `${diffFormatted}${pctFormatted}`

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? 'bg-primary-light text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
      }`}
    >
      {up ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}
      {text} vs yesterday
    </span>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [user, setUser] = useState(null)
  const [shopProfile, setShopProfile] = useState(() => shopProfileService.getProfile())
  const [debtStats, setDebtStats] = useState({
    todayCreditGiven: 0,
    todayPosCreditSales: 0,
    todayManualDebt: 0,
    todayPaymentReceived: 0,
    totalOutstanding: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reload, setReload] = useState(0)
  const [alertDismissed, setAlertDismissed] = useState(
    () => localStorage.getItem(`stock_alert_dismissed_${new Date().toDateString()}`) === '1',
  )

  useEffect(() => {
    let cancelled = false
    auth
      .me()
      .then((data) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        // session errors surface through the summary request below
      })
    getDashboardSummary()
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    try {
      const stats = debtService.getTodayDebtStats()
      if (!cancelled) setDebtStats(stats)
    } catch {}

    const handleProfileUpdate = (e) => {
      if (e.detail) setShopProfile(e.detail)
    }
    window.addEventListener('shopmanager_profile_updated', handleProfileUpdate)

    return () => {
      cancelled = true
      window.removeEventListener('shopmanager_profile_updated', handleProfileUpdate)
    }
  }, [reload])

  function handleRefresh() {
    api.clearCache()
    setReload((n) => n + 1)
  }

  function dismissStockAlert() {
    localStorage.setItem(`stock_alert_dismissed_${new Date().toDateString()}`, '1')
    setAlertDismissed(true)
  }

  const effectiveDisplayName =
    shopProfile?.shopName && shopProfile.shopName !== 'ShopManager Store'
      ? shopProfile.shopName
      : user?.name || user?.username || 'My Store'

  const todayRev = Number(summary?.revenueToday) || 0
  const todayProfit = Number(summary?.profitToday) || 0
  const todaySales = summary?.salesToday || 0
  const todayCreditGiven = debtStats.todayCreditGiven || 0
  const todayPosCredit = debtStats.todayPosCreditSales || 0
  const todaySalesPaid = Math.max(0, todayRev - todayPosCredit)
  const todayPaymentReceived = debtStats.todayPaymentReceived || 0
  const todayTotalReceived = todaySalesPaid + todayPaymentReceived

  const cards = summary
    ? [
        {
          label: "Today's Sales",
          value: formatCurrency(summary.revenueToday),
          accent: 'bg-primary-light text-primary',
          Icon: IconCart,
          to: '/sales',
          trend: (
            <TrendPill
              today={summary.revenueToday}
              yesterday={summary.revenueYesterday}
              format={formatCurrency}
            />
          ),
        },
        {
          label: 'Estimated Profit',
          value: formatCurrency(summary.profitToday),
          accent: 'bg-[#dcfce7] text-[#166534]',
          Icon: IconChart,
          to: '/reports',
          trend: <span className="text-xs text-muted">Estimated margin</span>,
        },
        {
          label: 'Bills Today',
          value: String(summary.salesToday ?? 0),
          accent: 'bg-[#e0e7ff] text-[#3730a3]',
          Icon: IconCheck,
          to: '/sales',
          trend: (
            <TrendPill
              today={summary.salesToday}
              yesterday={summary.salesYesterday}
            />
          ),
        },
        {
          label: 'Stock Alerts',
          value: String(summary.lowStockCount + summary.outOfStockCount),
          accent:
            summary.lowStockCount > 0 || summary.outOfStockCount > 0
              ? 'bg-[#fef3c7] text-[#92400e]'
              : 'bg-bg text-secondary',
          Icon: IconAlert,
          to: '/products',
          trend: (
            <span className={`text-xs ${summary.lowStockCount > 0 || summary.outOfStockCount > 0 ? 'text-warning' : 'text-muted'}`}>
              {summary.lowStockCount} low · {summary.outOfStockCount} out of stock
            </span>
          ),
        },
      ]
    : []

  const revenueSeries = summary?.dailyRevenue ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold min-[481px]:text-xl md:text-2xl">
            {greeting()}, {effectiveDisplayName} 👋
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Here&apos;s what&apos;s happening in your shop today.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh dashboard"
          aria-label="Refresh dashboard"
          className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-surface text-secondary transition-colors hover:enabled:border-primary hover:enabled:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-sm border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </div>
      )}

      {loading && <p className="text-secondary">Loading…</p>}

      {summary && (
        <>
          {(summary.lowStockCount > 0 || summary.outOfStockCount > 0) && !alertDismissed && (
            <div className="relative rounded-sm border border-[#fde68a] bg-[#fef9c3] text-sm text-[#713f12]">
              <Link
                to={
                  summary.outOfStockCount > 0
                    ? '/products?stock=OUT_OF_STOCK'
                    : '/products?stock=LOW_STOCK'
                }
                className="flex flex-col items-start gap-1.5 px-4 py-3 pr-12 transition-colors hover:bg-[#fef3c7] sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <IconAlert size={18} className="shrink-0 text-warning" />
                  <span className="min-w-0">
                    <strong>
                      {summary.outOfStockCount > 0
                        ? `${summary.outOfStockCount} product${summary.outOfStockCount > 1 ? 's are' : ' is'} out of stock`
                        : ''}
                      {summary.outOfStockCount > 0 && summary.lowStockCount > 0 ? ' and ' : ''}
                      {summary.lowStockCount > 0
                        ? `${summary.lowStockCount} product${summary.lowStockCount > 1 ? 's are' : ' is'} running low`
                        : ''}
                    </strong>{' '}
                    — restock them now to avoid missed sales.
                    {(summary.outOfStockProducts?.length > 0 ||
                      summary.lowStockProducts?.length > 0) && (
                      <span className="mt-0.5 block text-[13px] [overflow-wrap:anywhere]">
                        {[
                          ...(summary.outOfStockProducts ?? []).map((name) => `${name} (out of stock)`),
                          ...(summary.lowStockProducts ?? []).map((name) => `${name} (low)`),
                        ].join(', ')}
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-semibold sm:ml-auto sm:shrink-0">View products →</span>
              </Link>
              <button
                type="button"
                onClick={dismissStockAlert}
                title="Dismiss alert"
                aria-label="Dismiss stock alert"
                className="absolute top-2 right-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent text-[#92400e] transition-colors hover:bg-[#fde68a]"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 min-[481px]:gap-4 lg:grid-cols-4">
            {cards.map((card) => {
              const content = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 text-[12px] font-medium text-secondary min-[481px]:text-[13px]">
                      {card.label}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full min-[481px]:h-9 min-[481px]:w-9 ${card.accent}`}
                    >
                      <card.Icon size={18} />
                    </span>
                  </div>
                  <div className="min-w-0 text-[19px] leading-tight font-bold text-text [overflow-wrap:anywhere] min-[481px]:text-[22px] md:text-[26px]">
                    {card.value}
                  </div>
                  <div className="max-w-full text-xs text-secondary">{card.trend}</div>
                </>
              )
              const className =
                'flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-surface p-3 shadow-sm transition-[transform,box-shadow,border-color] duration-200 md:gap-3 md:p-4'
              return card.to ? (
                <Link
                  to={card.to}
                  key={card.label}
                  className={`${className} cursor-pointer hover:-translate-y-0.5 hover:border-primary hover:shadow-md`}
                >
                  {content}
                </Link>
              ) : (
                <div className={className} key={card.label}>
                  {content}
                </div>
              )
            })}
          </div>

          {/* Today's Sales Breakdown: Received (Cash/Online) vs Credit Sales */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Card 1: Received / Cash In */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d1fae5] text-[#059669]">
                    <IconBanknote size={15} />
                  </span>
                  <span className="text-xs font-bold text-[#065f46]">Payment Received</span>
                </div>
                <span className="rounded-md bg-[#d1fae5] px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                  Cash & Online
                </span>
              </div>

              <div className="text-2xl font-black text-[#047857]">
                {formatCurrency(todayTotalReceived)}
              </div>

              <div className="flex items-center gap-1.5 border-t border-[#bbf7d0]/60 pt-2 text-xs text-[#047857]">
                <IconCheck size={13} className="text-[#059669]" />
                <span>
                  {todayPaymentReceived > 0
                    ? `${formatCurrency(todaySalesPaid)} direct sales + ${formatCurrency(todayPaymentReceived)} debt recovered`
                    : 'Direct cash & online collections today'}
                </span>
              </div>
            </div>

            {/* Card 2: Credit Sales Given */}
            <Link
              to="/debts"
              className="flex flex-col gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4 shadow-xs transition-colors hover:bg-[#fef3c7] cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fef3c7] text-[#d97706]">
                    <IconBookUser size={15} />
                  </span>
                  <span className="text-xs font-bold text-[#92400e]">Credit Sales Given</span>
                </div>
                <span className="rounded-md bg-[#fef3c7] px-2 py-0.5 text-[11px] font-bold text-[#b45309]">
                  Credit
                </span>
              </div>

              <div className="text-2xl font-black text-[#b45309]">
                {formatCurrency(todayCreditGiven)}
              </div>

              <div className="flex items-center justify-between border-t border-[#fde68a]/60 pt-2 text-xs text-[#b45309]">
                <span>
                  {todayCreditGiven > 0 ? 'Pending collection from customers' : 'No credit sales given today'}
                </span>
                <span className="font-bold">Open Credit Book →</span>
              </div>
            </Link>
          </div>

          {/* Outstanding Debt Alert Banner (if unpaid debts exist) */}
          {debtStats.totalOutstanding > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[#d97706]">
                  <IconBookUser size={16} />
                </span>
                <div>
                  <span className="text-xs font-bold text-[#92400e]">
                    Customer Credit Outstanding
                  </span>
                  <div className="text-xs font-semibold text-[#b45309]">
                    {formatCurrency(debtStats.totalOutstanding)} total pending collection
                  </div>
                </div>
              </div>
              <Link
                to="/debts"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-white border border-[#fde68a] px-3 py-1.5 text-xs font-bold text-[#92400e] hover:bg-[#fef3c7] shadow-xs cursor-pointer sm:shrink-0"
              >
                View Credit Book →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm lg:col-span-2 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <IconChart size={18} className="text-primary" />
                  Last 7 days
                </h2>
                <span className="text-xs text-secondary">Revenue</span>
              </div>
              <RevenueChart data={revenueSeries} />
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <span className="text-secondary">Total this week</span>
                <span className="font-semibold">
                  {formatCurrency(revenueSeries.reduce((sum, p) => sum + Number(p.total), 0))}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
              <h2 className="text-base font-semibold">Quick actions</h2>
              <div className="flex flex-1 flex-col gap-2">
                <Link
                  to="/sales/new"
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:enabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                >
                  New Sale
                </Link>
                <Link
                  to="/debts"
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                >
                  Credit Book
                </Link>
                <Link
                  to="/products/new"
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                >
                  Add Product
                </Link>
                <Link
                  to="/inventory"
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                >
                  Stock In
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Recent Sales</h2>
              <Link
                to="/sales"
                className="text-sm font-semibold text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            {summary.recentSales.length === 0 ? (
              <p className="text-secondary">No sales recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse [&_thead_tr]:bg-bg [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-bg md:min-w-0">
                  <thead>
                    <tr>
                      <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                        Sale
                      </th>
                      <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                        Items
                      </th>
                      <th className="border-b border-border p-3 text-right align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                        Total
                      </th>
                      <th className="border-b border-border p-3 text-right align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="border-b border-border p-3 text-left align-middle">
                          <Link
                            to={`/sales/${sale.id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            Sale #{sale.id}
                          </Link>
                        </td>
                        <td className="border-b border-border p-3 text-left align-middle text-secondary">
                          {sale.items.length === 0 ? (
                            `${sale.itemCount} item${sale.itemCount > 1 ? 's' : ''}`
                          ) : (
                            <span title={sale.items.join(', ')}>
                              {sale.items.slice(0, 2).join(', ')}
                              {sale.items.length > 2 && (
                                <span className="text-muted"> +{sale.items.length - 2} more</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="border-b border-border p-3 text-right align-middle font-semibold whitespace-nowrap">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="border-b border-border p-3 text-right align-middle text-secondary whitespace-nowrap">
                          <span title={formatDateTime(sale.createdAt)}>
                            {formatRelativeTime(sale.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
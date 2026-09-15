import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { IconArrowLeft } from '../../components/icons'
import { getSale } from '../../services/sales'
import { debtService } from '../../services/debts'
import { shopProfileService } from '../../services/shopProfile'
import { printReceipt } from '../../utils/printReceipt'
import { formatCurrency, formatDateTime, toNumber } from '../../utils/format'
import { UNIT_LABELS } from '../../utils/units'

export default function SaleDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const justCompleted = Boolean(location.state?.justCompleted)

  const [sale, setSale] = useState(null)
  const [creditInfo, setCreditInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const shopProfile = shopProfileService.getProfile()

  useEffect(() => {
    let cancelled = false
    getSale(id)
      .then((data) => {
        if (!cancelled) {
          setSale(data)
          const matched = debtService.findCustomerForSale(data.id)
          setCreditInfo(matched)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
        <p className="text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !sale) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
        <div className="rounded-sm border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
          {error || 'Sale not found'}
        </div>
      </div>
    )
  }

  const profit = (sale.items || []).reduce(
    (sum, item) =>
      sum + (Number(item.unitPrice) - Number(item.purchasePrice)) * toNumber(item.quantity),
    0,
  )

  let totalMrp = 0
  let totalSavings = 0
  for (const item of sale.items || []) {
    const qty = toNumber(item.quantity)
    const rate = Number(item.unitPrice) || 0
    const mrp = item.mrp != null ? Number(item.mrp) : null
    if (mrp != null && mrp > rate) {
      totalMrp += mrp * qty
      totalSavings += (mrp - rate) * qty
    } else {
      totalMrp += rate * qty
    }
  }

  const isCreditSale = Boolean(creditInfo)
  const customer = creditInfo?.customer

  function handleShareWhatsApp() {
    const itemsList = sale.items
      .map((item, idx) => {
        const qty = item.quantity
        const rate = Number(item.unitPrice) || 0
        const total = Number(item.lineTotal) || 0
        const mrp = item.mrp != null ? Number(item.mrp) : null
        const mrpText = mrp != null && mrp > rate ? ` (MRP ~₹${mrp.toFixed(2)}~)` : ''
        return `${idx + 1}. *${item.productName}*\n   ${qty} x ₹${rate.toFixed(2)}${mrpText} = ₹${total.toFixed(2)}`
      })
      .join('\n')

    const shopNameHeader = shopProfile.shopName ? `🏬 *${shopProfile.shopName}*\n` : ''
    const shopPhoneLine = shopProfile.phone ? `📞 Contact: ${shopProfile.phone}\n` : ''
    const shopAddressLine = shopProfile.address ? `📍 ${shopProfile.address}\n` : ''
    const taglineLine = shopProfile.tagline ? `_${shopProfile.tagline}_\n` : ''
    const savingsBlock = totalSavings > 0 ? `\n🎉 *TOTAL SAVINGS: ₹${totalSavings.toFixed(2)}*` : ''
    const modeText = isCreditSale ? 'Customer Credit (Pending Due)' : 'Cash / Paid'
    const message = `🧾 *INVOICE #${sale.id}*\n${shopNameHeader}${shopPhoneLine}${shopAddressLine}${taglineLine}📅 ${formatDateTime(sale.createdAt)}\n${customer ? `👤 Customer: *${customer.name}*\n` : ''}\n*Items Purchased:*\n${itemsList}\n\n-------------------------\n💰 *TOTAL AMOUNT: ₹${Number(sale.totalAmount).toFixed(2)}*${savingsBlock}\n💳 Payment Mode: ${modeText}\n-------------------------\nThank you for shopping with us! 🙏\n_⚡ Powered by ShopManager_`

    const encoded = encodeURIComponent(message)
    const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : ''
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`

    window.open(url, '_blank')
  }

  function handlePrint() {
    printReceipt({ sale, shopProfile, creditInfo })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <Link
            to="/sales"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <IconArrowLeft size={16} />
            Back to Sales
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold min-[481px]:text-xl md:text-2xl">Sale #{sale.id}</h1>
            {isCreditSale ? (
              <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-bold text-[#b45309]">
                Customer Credit
              </span>
            ) : (
              <span className="rounded-full bg-[#d1fae5] px-2.5 py-0.5 text-xs font-bold text-[#047857]">
                Paid
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-emerald-300 bg-[#ecfdf5] px-3.5 py-2 text-xs font-bold text-[#047857] shadow-xs transition-colors hover:bg-[#d1fae5] md:min-h-0"
          >
            💬 Share WhatsApp Receipt
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-primary bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover md:min-h-0"
          >
            🖨️ Print Invoice
          </button>
        </div>
      </div>

      {justCompleted && (
        <div className="rounded-sm border border-[#bbf7d0] bg-primary-light px-4 py-3 text-sm text-[#166534] print:hidden">
          Sale #{sale.id} completed — stock was reduced automatically.
        </div>
      )}

      {/* Customer / Credit Sale Banner */}
      {isCreditSale && customer && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
          <div className="flex items-center justify-between">
            <span className="font-bold">Customer Credit Ledger Entry</span>
            <Link to="/debts" className="font-bold text-[#b45309] hover:underline">
              View Credit Book →
            </Link>
          </div>
          <div>
            Recorded for <span className="font-bold text-[#78350f]">{customer.name}</span>
            {customer.phone && ` (${customer.phone})`} • Customer current balance:{' '}
            <span className="font-bold text-[#b45309]">₹{customer.totalDebt.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Shop Info Header */}
      <div className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="text-base font-bold text-text">{shopProfile?.shopName || 'ShopManager Store'}</div>
          <div className="text-xs text-secondary">
            {shopProfile?.address ? `📍 ${shopProfile.address}` : ''}
            {shopProfile?.phone ? ` • 📞 ${shopProfile.phone}` : ''}
          </div>
        </div>
        <div className="text-sm font-semibold text-secondary">
          {formatDateTime(sale.createdAt)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[600px] border-collapse [&_thead_tr]:bg-bg [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-bg md:min-w-0">
          <thead>
            <tr>
              <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                Product
              </th>
              <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                Qty
              </th>
              <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                MRP
              </th>
              <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                Selling Price
              </th>
              <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => {
              const rate = Number(item.unitPrice) || 0
              const mrp = item.mrp != null ? Number(item.mrp) : null
              const hasDiscount = mrp != null && mrp > rate
              const discountPct = hasDiscount ? Math.round(((mrp - rate) / mrp) * 100) : 0

              return (
                <tr key={`${item.productId}-${index}`}>
                  <td className="border-b border-border p-3 text-left align-middle">
                    <div className="font-semibold text-text">{item.productName}</div>
                    {item.productSku && <div className="text-xs text-secondary">{item.productSku}</div>}
                    {hasDiscount && (
                      <span className="mt-1 inline-block rounded bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                        {discountPct}% OFF (Save ₹{((mrp - rate) * toNumber(item.quantity)).toFixed(2)})
                      </span>
                    )}
                  </td>
                  <td className="border-b border-border p-3 text-left align-middle font-medium">
                    {item.quantity} {UNIT_LABELS[item.unit] ?? item.unit}
                  </td>
                  <td className="border-b border-border p-3 text-left align-middle">
                    {mrp != null ? (
                      <span className={hasDiscount ? 'text-secondary line-through text-xs' : 'font-medium'}>
                        {formatCurrency(mrp)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="border-b border-border p-3 text-left align-middle font-bold text-text">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="border-b border-border p-3 text-left align-middle font-bold text-[#047857]">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalSavings > 0 && (
        <div className="rounded-lg border border-[#86efac] bg-[#f0fdf4] p-3 text-center text-sm font-bold text-[#166534]">
          🎉 Customer saved a total of {formatCurrency(totalSavings)} on this purchase!
        </div>
      )}

      <div className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-4 pt-4 shadow-sm md:flex-row md:items-center md:justify-between md:gap-4 md:p-6">
        <div>
          <div className="text-sm text-secondary">Estimated gross profit</div>
          <span className="text-[22px] font-bold text-primary">{formatCurrency(profit)}</span>
        </div>
        <div className="text-right">
          <div className="text-sm text-secondary">Sale total</div>
          <span className="text-[22px] font-bold text-text">{formatCurrency(sale.totalAmount)}</span>
        </div>
      </div>
    </div>
  )
}
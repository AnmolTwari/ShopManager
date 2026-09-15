import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '../../components/icons'
import StockStatusBadge from '../../components/StockStatusBadge'
import { createSale } from '../../services/sales'
import { listPopularProducts, listProducts } from '../../services/products'
import { debtService } from '../../services/debts'
import { formatCurrency, toNumber } from '../../utils/format'
import { UNIT_LABELS } from '../../utils/units'

const COUNT_UNITS = new Set(['PIECE', 'PACKET', 'BOX', 'BOTTLE'])

export default function NewSalePage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [popular, setPopular] = useState(null)

  const [lines, setLines] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [creditNote, setCreditNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      const term = search.trim()
      if (!term) {
        setResults([])
        return
      }
      setSearching(true)
      listProducts({ search: term, page: 0, size: 8 })
        .then((data) => {
          if (!cancelled) setResults(data.content)
        })
        .catch((err) => {
          if (!cancelled) setError(err.message)
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search])

  useEffect(() => {
    let cancelled = false
    listPopularProducts()
      .then((data) => {
        if (!cancelled) setPopular(data)
      })
      .catch(() => {
        if (!cancelled) setPopular([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function addProducts(products) {
    setError(null)
    setSuccess(null)
    setLines((current) => {
      const next = [...current]
      for (const product of products) {
        const index = next.findIndex((line) => line.productId === product.id)
        if (index !== -1) {
          next[index] = {
            ...next[index],
            quantity: String(toNumber(next[index].quantity) + 1),
          }
        } else {
          next.push({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            unitPrice: product.sellingPrice,
            mrp: product.mrp != null ? Number(product.mrp) : null,
            currentQuantity: product.currentQuantity,
            quantity: '1',
          })
        }
      }
      return next
    })
  }

  function addProduct(product) {
    addProducts([product])
  }

  const visibleProducts = search.trim() ? results : (popular ?? [])

  function toggleSelect(productId) {
    setSelected((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  function toggleSelectAll() {
    const selectable = visibleProducts
      .filter((product) => Number(product.currentQuantity) > 0)
      .map((product) => product.id)
    setSelected((current) => {
      const allSelected = selectable.length > 0 && selectable.every((id) => current.includes(id))
      return allSelected
        ? current.filter((id) => !selectable.includes(id))
        : [...new Set([...current, ...selectable])]
    })
  }

  function addSelected() {
    const products = visibleProducts.filter((product) => selected.includes(product.id))
    addProducts(products)
    setSelected([])
    setSearch('')
  }

  function setQuantity(index, value) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, quantity: value } : line)),
    )
  }

  function removeLine(index) {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  function lineTotal(line) {
    return toNumber(line.quantity) * Number(line.unitPrice)
  }

  const bagTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0)
  let totalMrp = 0
  let totalSavings = 0
  for (const line of lines) {
    const qty = toNumber(line.quantity)
    const rate = Number(line.unitPrice) || 0
    const mrp = line.mrp != null ? Number(line.mrp) : null
    if (mrp != null && mrp > rate) {
      totalMrp += mrp * qty
      totalSavings += (mrp - rate) * qty
    } else {
      totalMrp += rate * qty
    }
  }
  const selectableResults = visibleProducts.filter((product) => Number(product.currentQuantity) > 0)

  async function completeSale() {
    setError(null)
    setSuccess(null)
    if (lines.length === 0) {
      setError('Add at least one product to the sale.')
      return
    }
    for (const line of lines) {
      if (toNumber(line.quantity) <= 0) {
        setError(`Quantity for "${line.name}" must be greater than zero.`)
        return
      }
    }

    if (paymentMethod === 'CREDIT' && !customerName.trim()) {
      setError('Please enter customer name to record this credit sale.')
      return
    }

    const payload = {
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: toNumber(line.quantity),
      })),
    }

    setSubmitting(true)
    try {
      const sale = await createSale(payload)

      // If credit sale, save to debtService
      if (paymentMethod === 'CREDIT') {
        debtService.recordCreditSale(
          {
            name: customerName.trim(),
            phone: customerPhone.trim() || undefined,
          },
          sale,
          creditNote.trim() || 'POS Credit Sale'
        )
      }

      setSuccess(`Sale #${sale.id} completed.`)
      navigate(`/sales/${sale.id}`, { state: { justCompleted: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 p-3 px-4 pb-10 md:p-6">
      <div className="flex flex-col gap-1">
        <Link
          to="/sales"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <IconArrowLeft size={16} />
          Back to Sales
        </Link>
        <h1 className="text-center text-lg font-semibold min-[481px]:text-xl md:text-2xl">New Sale</h1>
      </div>

      {error && (
        <div className="rounded-sm border border-[#fecaca] bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="rounded-sm border border-[#bbf7d0] bg-primary-light px-4 py-3 text-sm text-[#166534]">
          {success}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-base font-semibold">Add items</h2>
        <div className="flex flex-col gap-2 min-[481px]:flex-row min-[481px]:flex-wrap">
          <div className="relative w-full min-[481px]:flex-1">
            <input
              type="search"
              className="min-h-10 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              placeholder="Search products by name or SKU…"
              value={search}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setDropdownOpen(false)
              }}
              onChange={(event) => {
                setSearch(event.target.value)
                setSelected([])
                setDropdownOpen(Boolean(event.target.value.trim()))
              }}
            />

            {dropdownOpen && (
              <>
                <div className="fixed inset-0" aria-hidden="true" onClick={() => setDropdownOpen(false)} />
                <div className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                  {search.trim() ? (
                    searching ? (
                      <p className="m-0 p-4 text-sm text-secondary">Searching…</p>
                    ) : results.length === 0 ? (
                      <p className="m-0 p-4 text-sm text-secondary">No products match “{search.trim()}”.</p>
                    ) : (
                      <ProductSuggestions
                        products={results}
                        selected={selected}
                        lines={lines}
                        selectableResults={selectableResults}
                        onToggle={toggleSelect}
                        onToggleAll={toggleSelectAll}
                        onAddSelected={addSelected}
                        onAdd={addProduct}
                      />
                    )
                  ) : (
                    <>
                      <div className="border-b border-border bg-bg px-3 py-2">
                        <div className="text-sm font-semibold">Popular products</div>
                        <div className="text-xs text-secondary">Top sellers — click to add</div>
                      </div>
                      {popular === null ? (
                        <p className="m-0 p-4 text-sm text-secondary">Loading…</p>
                      ) : popular.length === 0 ? (
                        <p className="m-0 p-4 text-sm text-secondary">
                          No popular products yet. Search to add items.
                        </p>
                      ) : (
                        <ProductSuggestions
                          products={popular}
                          selected={selected}
                          lines={lines}
                          selectableResults={selectableResults}
                          onToggle={toggleSelect}
                          onToggleAll={toggleSelectAll}
                          onAddSelected={addSelected}
                          onAdd={addProduct}
                        />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-base font-semibold">Sale items</h2>

        {lines.length === 0 ? (
          <p className="p-6 text-center text-secondary">
            No items yet. Search and add products above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse [&_thead_tr]:bg-bg [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-bg md:min-w-0">
              <thead>
                <tr>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    Product
                  </th>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    MRP
                  </th>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    Selling Price
                  </th>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    Qty
                  </th>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    Line Total
                  </th>
                  <th className="border-b border-border p-3 text-left align-middle text-xs font-semibold tracking-wider text-muted uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const rate = Number(line.unitPrice) || 0
                  const mrp = line.mrp != null ? Number(line.mrp) : null
                  const hasDiscount = mrp != null && mrp > rate
                  const discountPct = hasDiscount ? Math.round(((mrp - rate) / mrp) * 100) : 0

                  return (
                    <tr key={line.productId}>
                      <td className="border-b border-border p-3 text-left align-middle">
                        <div className="font-semibold">{line.name}</div>
                        {line.sku && <div className="text-xs text-secondary">{line.sku}</div>}
                        {hasDiscount && (
                          <span className="mt-0.5 inline-block rounded bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                            {discountPct}% OFF (Save ₹{((mrp - rate) * toNumber(line.quantity)).toFixed(2)})
                          </span>
                        )}
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
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="border-b border-border p-3 text-left align-middle">
                        <input
                          className="min-h-10 w-[90px] rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                          type="number"
                          min={COUNT_UNITS.has(line.unit) ? '1' : '0.001'}
                          step={COUNT_UNITS.has(line.unit) ? '1' : 'any'}
                          value={line.quantity}
                          onChange={(event) => setQuantity(index, event.target.value)}
                        />
                      </td>
                      <td className="border-b border-border p-3 text-left align-middle font-bold text-[#047857]">
                        {formatCurrency(lineTotal(line))}
                      </td>
                      <td className="flex items-center gap-2 border-b border-border p-3 text-left align-middle whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-3 py-1 text-[13px] font-semibold text-danger transition-colors hover:enabled:border-danger hover:enabled:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                          onClick={() => removeLine(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Method Selector */}
        <div className="mt-6 rounded-xl border border-border bg-bg/40 p-4">
          <label className="text-xs font-bold uppercase tracking-wider text-secondary">
            Payment Mode
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: '💵 Cash' },
              { id: 'UPI', label: '📱 UPI / Online' },
              { id: 'CREDIT', label: '📒 Customer Credit' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPaymentMethod(mode.id)}
                className={`flex items-center justify-center rounded-xl border p-2.5 text-xs font-bold transition-colors cursor-pointer ${
                  paymentMethod === mode.id
                    ? mode.id === 'CREDIT'
                      ? 'border-[#f59e0b] bg-[#fef3c7] text-[#92400e]'
                      : 'border-primary bg-primary-light text-primary'
                    : 'border-border bg-surface text-secondary hover:bg-surface/80'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* If Credit is selected, show customer inputs */}
          {paymentMethod === 'CREDIT' && (
            <div className="mt-3.5 grid grid-cols-1 gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5 sm:grid-cols-3">
              <div className="relative">
                <label className="text-[11px] font-bold text-[#92400e]">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#fde68a] bg-white px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {customerName.trim().length > 0 && (
                  (() => {
                    const matches = debtService
                      .getCustomerDebts()
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(customerName.toLowerCase().trim()) &&
                          c.name.toLowerCase() !== customerName.toLowerCase().trim()
                      )
                      .slice(0, 3)
                    if (matches.length === 0) return null
                    return (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-[#fde68a] bg-white p-1 shadow-lg">
                        {matches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setCustomerName(m.name)
                              if (m.phone) setCustomerPhone(m.phone)
                            }}
                            className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-[#fef3c7]"
                          >
                            <span className="font-semibold text-[#78350f]">{m.name}</span>
                            <span className="text-[10px] text-[#b45309]">₹{m.totalDebt.toFixed(0)} due</span>
                          </button>
                        ))}
                      </div>
                    )
                  })()
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#92400e]">
                  Customer Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#fde68a] bg-white px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#92400e]">
                  Credit Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Due next week"
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#fde68a] bg-white px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {totalSavings > 0 && (
          <div className="mt-3 rounded-lg border border-[#86efac] bg-[#f0fdf4] p-3 text-center text-xs font-bold text-[#166534]">
            🎉 Total Customer Savings: {formatCurrency(totalSavings)} (Subtotal: {formatCurrency(totalMrp)})
          </div>
        )}

        <div className="mt-4 flex flex-col items-start gap-2 border-t border-border pt-4 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <div className="text-sm font-semibold">Total Amount</div>
            {totalSavings > 0 && (
              <div className="text-xs text-secondary">
                Total MRP: <span className="line-through">{formatCurrency(totalMrp)}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-[22px] font-bold text-primary">{formatCurrency(bagTotal)}</span>
            {paymentMethod === 'CREDIT' && (
              <span className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-xs font-bold text-[#b45309]">
                Credit Sale
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:w-auto"
            disabled={lines.length === 0}
            onClick={() => setLines([])}
          >
            Clear
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:enabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:w-auto"
            disabled={submitting || lines.length === 0}
            onClick={completeSale}
          >
            {submitting ? 'Completing…' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductSuggestions({ products, selected, lines, selectableResults, onToggle, onToggleAll, onAddSelected, onAdd }) {
  return (
    <>
      <ul className="m-0 max-h-[45vh] list-none overflow-y-auto p-0 min-[481px]:max-h-72">
        {products.map((product) => {
          const outOfStock = Number(product.currentQuantity) <= 0
          const isSelected = selected.includes(product.id)
          const inSale = lines.some((line) => line.productId === product.id)
          return (
            <li
              className={`flex items-start justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0 md:items-center ${isSelected ? 'bg-primary-light/60' : 'bg-surface'}`}
              key={product.id}
            >
              <div className="flex flex-1 items-start gap-3 md:items-center">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed md:mt-0"
                  checked={isSelected}
                  disabled={outOfStock}
                  onChange={() => onToggle(product.id)}
                  aria-label={`Select ${product.name}`}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{product.name}</span>
                    {inSale && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[#166534]">
                        ✓ In sale
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-secondary">
                    {product.brand ? `${product.brand} · ` : ''}
                    {product.currentQuantity} {UNIT_LABELS[product.unit] ?? product.unit} ·{' '}
                    {product.mrp != null && product.mrp > 0 && (
                      <span className="text-muted line-through">{formatCurrency(product.mrp)} </span>
                    )}
                    {formatCurrency(product.sellingPrice)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <StockStatusBadge status={product.stockStatus} />
                <button
                  type="button"
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-3 py-1 text-[13px] font-semibold text-white transition-colors hover:enabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
                  disabled={outOfStock}
                  onClick={() => onAdd(product)}
                >
                  {outOfStock ? 'Out of stock' : inSale ? 'Add more' : 'Add'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-bg px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
            checked={
              selectableResults.length > 0 &&
              selectableResults.every((product) => selected.includes(product.id))
            }
            disabled={selectableResults.length === 0}
            onChange={onToggleAll}
          />
          Select all ({selectableResults.length})
        </label>
        <button
          type="button"
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent bg-primary px-3 py-1 text-[13px] font-semibold text-white transition-colors hover:enabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0"
          disabled={selected.length === 0}
          onClick={onAddSelected}
        >
          Add selected ({selected.length})
        </button>
      </div>
    </>
  )
}
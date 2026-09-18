import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft,
  IconCheck,
  IconClose,
  IconMinus,
  IconPlus,
  IconSearch,
} from '../../components/icons'
import StockStatusBadge from '../../components/StockStatusBadge'
import { createSale } from '../../services/sales'
import { listPopularProducts, listProducts } from '../../services/products'
import { debtService } from '../../services/debts'
import { formatCurrency, toNumber } from '../../utils/format'
import { UNIT_LABELS } from '../../utils/units'

const COUNT_UNITS = new Set(['PIECE', 'PACKET', 'BOX', 'BOTTLE'])

export default function NewSalePage() {
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const saleSectionRef = useRef(null)

  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [popular, setPopular] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

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
      listProducts({ search: term, page: 0, size: 10 })
        .then((data) => {
          if (!cancelled) setResults(data.content || [])
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
        if (!cancelled) setPopular(data || [])
      })
      .catch(() => {
        if (!cancelled) setPopular([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visibleProducts = search.trim() ? results : (popular ?? [])

  useEffect(() => {
    setHighlightedIndex(visibleProducts.length > 0 ? 0 : -1)
  }, [visibleProducts])

  function addProducts(products) {
    setError(null)
    setSuccess(null)
    setLines((current) => {
      const next = [...current]
      for (const product of products) {
        const index = next.findIndex((line) => line.productId === product.id)
        if (index !== -1) {
          const maxStock = Number(product.currentQuantity) || 9999
          const isLimited = Number(product.currentQuantity) > 0
          const currentQty = toNumber(next[index].quantity)
          const newQty = isLimited ? Math.min(currentQty + 1, maxStock) : currentQty + 1
          next[index] = {
            ...next[index],
            quantity: String(newQty),
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

  function setProductQuantity(productId, value) {
    setLines((current) => {
      if (value === '') {
        return current.map((line) =>
          line.productId === productId ? { ...line, quantity: '' } : line,
        )
      }
      const num = toNumber(value)
      if (num <= 0) {
        return current.filter((line) => line.productId !== productId)
      }
      return current.map((line) => {
        if (line.productId === productId) {
          const maxStock = Number(line.currentQuantity) || 9999
          const isLimited = Number(line.currentQuantity) > 0
          const clamped = isLimited ? Math.min(num, maxStock) : num
          return { ...line, quantity: String(clamped) }
        }
        return line
      })
    })
  }

  function incrementProduct(productId, step = 1) {
    setLines((current) =>
      current.map((line) => {
        if (line.productId === productId) {
          const curr = toNumber(line.quantity)
          const maxStock = Number(line.currentQuantity) || 9999
          const isLimited = Number(line.currentQuantity) > 0
          const nextVal = curr + step
          const clamped = isLimited ? Math.min(nextVal, maxStock) : nextVal
          return { ...line, quantity: String(clamped) }
        }
        return line
      }),
    )
  }

  function decrementProduct(productId, step = 1) {
    setLines((current) => {
      const line = current.find((l) => l.productId === productId)
      if (!line) return current
      const curr = toNumber(line.quantity)
      const nextVal = curr - step
      if (nextVal <= 0) {
        return current.filter((l) => l.productId !== productId)
      }
      return current.map((l) => (l.productId === productId ? { ...l, quantity: String(nextVal) } : l))
    })
  }

  function handleQuantityBlur(productId) {
    setLines((current) => {
      const line = current.find((l) => l.productId === productId)
      if (!line) return current
      if (line.quantity === '' || toNumber(line.quantity) <= 0) {
        return current.filter((l) => l.productId !== productId)
      }
      return current
    })
  }

  function removeLine(index) {
    setLines((current) => current.filter((_, i) => i !== index))
  }

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

  function handleGoToBill() {
    setDropdownOpen(false)
    if (saleSectionRef.current) {
      saleSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
      return
    }

    if (!dropdownOpen) {
      if (event.key === 'ArrowDown') {
        setDropdownOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev < visibleProducts.length - 1 ? prev + 1 : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : visibleProducts.length - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedIndex >= 0 && visibleProducts[highlightedIndex]) {
        const item = visibleProducts[highlightedIndex]
        if (Number(item.currentQuantity) > 0) {
          addProduct(item)
        }
      }
    }
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

      {/* Search & Add Items Card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Add items</h2>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={handleGoToBill}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#86efac] bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#047857] shadow-xs hover:bg-[#d1fae5] transition-colors"
            >
              <span>🛒 View Bill ({lines.length} items · {formatCurrency(bagTotal)})</span>
              <span>↓</span>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 min-[481px]:flex-row min-[481px]:flex-wrap">
          <div className="relative w-full min-[481px]:flex-1">
            {/* Search Input Container */}
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 flex items-center text-secondary">
                <IconSearch size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-20 text-sm text-text placeholder:text-muted transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Search products by name, SKU, or barcode…"
                value={search}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={handleSearchKeyDown}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setSelected([])
                  setDropdownOpen(true)
                }}
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {searching && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setSelected([])
                      searchInputRef.current?.focus()
                    }}
                    className="rounded-md p-1 text-secondary hover:bg-bg hover:text-text transition-colors"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <IconClose size={15} />
                  </button>
                )}
                {dropdownOpen && (
                  <kbd className="hidden rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-semibold text-muted md:inline-block">
                    ESC
                  </kbd>
                )}
              </div>
            </div>

            {/* Dropdown Container */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setDropdownOpen(false)} />
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl backdrop-blur-sm">
                  {search.trim() ? (
                    searching ? (
                      <div className="flex items-center justify-center gap-2 p-6 text-sm text-secondary">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Searching products…</span>
                      </div>
                    ) : results.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="rounded-full bg-bg p-3 text-muted">
                          <IconSearch size={24} />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-text">No products match “{search.trim()}”</p>
                        <p className="mt-1 text-xs text-secondary">Try searching with a different keyword or SKU</p>
                      </div>
                    ) : (
                      <ProductSuggestions
                        title="Search Results"
                        subtitle="Use ↑↓ arrows to navigate, Enter to add"
                        products={results}
                        selected={selected}
                        lines={lines}
                        bagTotal={bagTotal}
                        selectableResults={selectableResults}
                        onToggle={toggleSelect}
                        onToggleAll={toggleSelectAll}
                        onAddSelected={addSelected}
                        onAdd={addProduct}
                        onIncrement={incrementProduct}
                        onDecrement={decrementProduct}
                        onSetQuantity={setProductQuantity}
                        onQuantityBlur={handleQuantityBlur}
                        onGoToBill={handleGoToBill}
                        onClose={() => setDropdownOpen(false)}
                        highlightedIndex={highlightedIndex}
                      />
                    )
                  ) : (
                    <>
                      {popular === null ? (
                        <div className="flex items-center justify-center gap-2 p-6 text-sm text-secondary">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span>Loading popular products…</span>
                        </div>
                      ) : popular.length === 0 ? (
                        <div className="p-6 text-center text-sm text-secondary">
                          No popular products yet. Type above to search items.
                        </div>
                      ) : (
                        <ProductSuggestions
                          title="🔥 Popular Products"
                          subtitle="Top selling items — tap to add or adjust quantity"
                          products={popular}
                          selected={selected}
                          lines={lines}
                          bagTotal={bagTotal}
                          selectableResults={selectableResults}
                          onToggle={toggleSelect}
                          onToggleAll={toggleSelectAll}
                          onAddSelected={addSelected}
                          onAdd={addProduct}
                          onIncrement={incrementProduct}
                          onDecrement={decrementProduct}
                          onSetQuantity={setProductQuantity}
                          onQuantityBlur={handleQuantityBlur}
                          onGoToBill={handleGoToBill}
                          onClose={() => setDropdownOpen(false)}
                          highlightedIndex={highlightedIndex}
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

      {/* Sale Items Table Card */}
      <div ref={saleSectionRef} className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-6 scroll-mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Sale items</h2>
          {lines.length > 0 && (
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary">
              {lines.length} {lines.length === 1 ? 'item' : 'items'} in bill
            </span>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg/40 p-8 text-center text-secondary">
            <p className="text-sm font-medium">No items in sale yet.</p>
            <p className="mt-1 text-xs text-muted">Use the search bar above to quickly add products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse [&_thead_tr]:bg-bg/60 [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-bg/40 md:min-w-0">
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
                  <th className="border-b border-border p-3 text-right align-middle text-xs font-semibold tracking-wider text-muted uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const rate = Number(line.unitPrice) || 0
                  const mrp = line.mrp != null ? Number(line.mrp) : null
                  const hasDiscount = mrp != null && mrp > rate
                  const discountPct = hasDiscount ? Math.round(((mrp - rate) / mrp) * 100) : 0
                  const isCountUnit = COUNT_UNITS.has(line.unit)
                  const currentQty = toNumber(line.quantity)
                  const maxStock = Number(line.currentQuantity) || 9999
                  const isAtMaxStock = Number(line.currentQuantity) > 0 && currentQty >= maxStock

                  return (
                    <tr key={line.productId} className="transition-colors">
                      <td className="border-b border-border p-3 text-left align-middle">
                        <div className="font-semibold text-text">{line.name}</div>
                        <div className="text-xs text-secondary">
                          {line.sku ? `SKU: ${line.sku} · ` : ''}
                          Unit: {UNIT_LABELS[line.unit] ?? line.unit}
                        </div>
                        {hasDiscount && (
                          <span className="mt-1 inline-block rounded bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                            {discountPct}% OFF (Save {formatCurrency((mrp - rate) * currentQty)})
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
                        {/* Table Quantity Stepper */}
                        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-sm w-fit">
                          <button
                            type="button"
                            onClick={() => decrementProduct(line.productId, isCountUnit ? 1 : 1)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-secondary hover:bg-bg hover:text-text transition-colors"
                            title={currentQty <= 1 ? 'Remove from sale' : 'Decrease quantity'}
                            aria-label={`Decrease quantity of ${line.name}`}
                          >
                            <IconMinus size={13} />
                          </button>
                          <input
                            className="h-7 w-14 border-0 bg-transparent px-1 text-center text-xs font-bold text-text focus:outline-none focus:ring-1 focus:ring-primary"
                            type="number"
                            min={isCountUnit ? '1' : '0.001'}
                            step={isCountUnit ? '1' : 'any'}
                            value={line.quantity}
                            onChange={(event) => setProductQuantity(line.productId, event.target.value)}
                            onBlur={() => handleQuantityBlur(line.productId)}
                            aria-label={`Quantity of ${line.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => incrementProduct(line.productId, isCountUnit ? 1 : 1)}
                            disabled={isAtMaxStock}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-secondary hover:bg-bg hover:text-text disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                            title={isAtMaxStock ? 'Maximum available stock reached' : 'Increase quantity'}
                            aria-label={`Increase quantity of ${line.name}`}
                          >
                            <IconPlus size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="border-b border-border p-3 text-left align-middle font-bold text-[#047857]">
                        {formatCurrency(lineTotal(line))}
                      </td>
                      <td className="border-b border-border p-3 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:border-danger hover:bg-[#fef2f2]"
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
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:enabled:bg-bg disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:w-auto"
            disabled={lines.length === 0}
            onClick={() => setLines([])}
          >
            Clear
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:enabled:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 md:w-auto"
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

function ProductSuggestions({
  title,
  subtitle,
  products,
  selected,
  lines,
  bagTotal,
  selectableResults,
  onToggle,
  onToggleAll,
  onAddSelected,
  onAdd,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onQuantityBlur,
  onGoToBill,
  onClose,
  highlightedIndex,
}) {
  return (
    <div className="flex flex-col">
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-bg/90 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">{title}</span>
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <button
                type="button"
                onClick={onGoToBill}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#86efac] bg-[#ecfdf5] px-2.5 py-1 text-xs font-bold text-[#047857] hover:bg-[#d1fae5] transition-colors"
              >
                <span>View Bill ({lines.length})</span>
                <span>↓</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-secondary hover:bg-surface hover:text-text transition-colors"
              title="Close search list"
              aria-label="Close search list"
            >
              <IconClose size={15} />
            </button>
          </div>
        </div>
      )}

      <ul className="m-0 max-h-[46vh] list-none divide-y divide-border/60 overflow-y-auto p-0 min-[481px]:max-h-76">
        {products.map((product, idx) => {
          const outOfStock = Number(product.currentQuantity) <= 0
          const isSelected = selected.includes(product.id)
          const lineItem = lines.find((line) => line.productId === product.id)
          const inSale = Boolean(lineItem)
          const isCountUnit = COUNT_UNITS.has(product.unit)
          const isHighlighted = highlightedIndex === idx

          const rate = Number(product.sellingPrice) || 0
          const mrp = product.mrp != null ? Number(product.mrp) : null
          const hasDiscount = mrp != null && mrp > rate
          const discountPct = hasDiscount ? Math.round(((mrp - rate) / mrp) * 100) : 0
          const savingsPerUnit = hasDiscount ? mrp - rate : 0

          const qtyNum = inSale ? toNumber(lineItem.quantity) : 0
          const lineTotalAmount = inSale ? qtyNum * rate : 0
          const maxAvailable = Number(product.currentQuantity) || 9999
          const isAtMaxStock = Number(product.currentQuantity) > 0 && qtyNum >= maxAvailable

          return (
            <li
              key={product.id}
              className={`flex flex-col gap-3 p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isHighlighted
                  ? 'bg-primary-light/40'
                  : isSelected
                  ? 'bg-primary-light/25'
                  : inSale
                  ? 'bg-[#f0fdf4]/50'
                  : 'bg-surface hover:bg-bg/60'
              }`}
            >
              {/* Left Details */}
              <div className="flex flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                  checked={isSelected}
                  disabled={outOfStock}
                  onChange={() => onToggle(product.id)}
                  aria-label={`Select ${product.name}`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text text-sm">{product.name}</span>
                    {inSale && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#86efac] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                        <IconCheck size={12} />
                        In sale: {lineItem.quantity} {UNIT_LABELS[product.unit] ?? product.unit}
                      </span>
                    )}
                    <StockStatusBadge status={product.stockStatus} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-secondary">
                    {product.brand && <span>{product.brand}</span>}
                    {product.sku && <span className="text-muted">SKU: {product.sku}</span>}
                    <span>
                      Stock: <strong className="font-medium text-text">{product.currentQuantity}</strong>{' '}
                      {UNIT_LABELS[product.unit] ?? product.unit}
                    </span>
                  </div>

                  {/* Price & Savings */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#047857]">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-xs text-muted line-through">{formatCurrency(product.mrp)}</span>
                        <span className="rounded bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 text-[10px] font-bold text-[#047857]">
                          {discountPct}% OFF (Save {formatCurrency(savingsPerUnit)}/unit)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Quantity Stepper or Add Button */}
              <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0">
                {inSale && (
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-medium text-secondary uppercase tracking-wider">Subtotal</div>
                    <div className="text-xs font-bold text-[#047857]">
                      {formatCurrency(lineTotalAmount)}
                    </div>
                  </div>
                )}

                {outOfStock ? (
                  <span className="inline-flex min-h-8 items-center rounded-lg bg-bg px-3 py-1 text-xs font-semibold text-muted">
                    Out of stock
                  </span>
                ) : inSale ? (
                  /* Professional Quantity Stepper */
                  <div className="flex items-center rounded-lg border border-[#059669] bg-[#ecfdf5] p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => onDecrement(product.id, isCountUnit ? 1 : 1)}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#059669] hover:bg-[#059669] hover:text-white transition-colors"
                      title={qtyNum <= 1 ? 'Remove from sale' : 'Decrease quantity'}
                      aria-label={`Decrease quantity of ${product.name}`}
                    >
                      <IconMinus size={13} />
                    </button>

                    <input
                      type="number"
                      min={isCountUnit ? '1' : '0.001'}
                      step={isCountUnit ? '1' : 'any'}
                      value={lineItem.quantity}
                      onChange={(e) => onSetQuantity(product.id, e.target.value)}
                      onBlur={() => onQuantityBlur(product.id)}
                      className="h-7 w-12 border-0 bg-white px-1 text-center text-xs font-bold text-[#059669] shadow-inner focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      aria-label={`Quantity of ${product.name}`}
                    />

                    <button
                      type="button"
                      onClick={() => onIncrement(product.id, isCountUnit ? 1 : 1)}
                      disabled={isAtMaxStock}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#059669] hover:bg-[#059669] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#059669] transition-colors"
                      title={isAtMaxStock ? 'Maximum available stock reached' : 'Increase quantity'}
                      aria-label={`Increase quantity of ${product.name}`}
                    >
                      <IconPlus size={13} />
                    </button>
                  </div>
                ) : (
                  /* 1-Click + Add Button */
                  <button
                    type="button"
                    onClick={() => onAdd(product)}
                    className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-primary-hover active:scale-95"
                    aria-label={`Add ${product.name} to sale`}
                  >
                    <IconPlus size={14} />
                    Add
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Multi-Select & Go to Bill Footer Bar */}
      <div className="border-t border-border bg-bg/95">
        {lines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#a7f3d0] bg-[#ecfdf5] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#059669] px-2 py-0.5 text-xs font-black text-white">
                {lines.length} {lines.length === 1 ? 'item' : 'items'}
              </span>
              <span className="text-xs font-bold text-[#065f46]">
                Bill Total: <strong className="text-sm font-black">{formatCurrency(bagTotal)}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onGoToBill}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[#047857] active:scale-95"
            >
              <span>View Bill &amp; Complete Sale</span>
              <span className="text-sm font-bold">↓</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-secondary hover:text-text">
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
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
                onClick={onAddSelected}
              >
                <IconPlus size={13} />
                Add selected ({selected.length})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-bg hover:text-text transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
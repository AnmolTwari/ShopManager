import { useEffect, useMemo, useState } from 'react'
import {
  IconAlert,
  IconBanknote,
  IconBookUser,
  IconCheck,
  IconClock,
  IconClose,
  IconMessageSquare,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '../../components/icons'
import { debtService } from '../../services/debts'
import { shopProfileService } from '../../services/shopProfile'
import { formatCurrency, formatDateTime } from '../../utils/format'

export default function DebtsPage() {
  const [debts, setDebts] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Settle Payment Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleMethod, setSettleMethod] = useState('CASH')
  const [settleNote, setSettleNote] = useState('')
  const [settling, setSettling] = useState(false)

  // Add Debt Modal State
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  const [expandedId, setExpandedId] = useState(null)

  function loadData() {
    const list = debtService.getCustomerDebts()
    setDebts([...list])
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredDebts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return debts
    return debts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    )
  }, [debts, search])

  const totalOutstanding = useMemo(() => {
    return debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0)
  }, [debts])

  const activeDebtorsCount = useMemo(() => {
    return debts.filter((c) => (c.totalDebt || 0) > 0).length
  }, [debts])

  function openSettle(customer) {
    setSelectedCustomer(customer)
    setSettleAmount(String(customer.totalDebt))
    setSettleMethod('CASH')
    setSettleNote('')
    setSettleModalOpen(true)
  }

  function handleSettleSubmit(e) {
    e.preventDefault()
    if (!selectedCustomer) return
    const amt = parseFloat(settleAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      alert('Please enter a valid amount')
      return
    }
    setSettling(true)
    try {
      debtService.recordDebtPayment(
        selectedCustomer.id,
        amt,
        settleMethod,
        settleNote.trim() || 'Payment received'
      )
      setSettleModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to record payment')
    } finally {
      setSettling(false)
    }
  }

  function openAddDebt(customer) {
    if (customer) {
      setSelectedCustomer(customer)
      setNewName(customer.name)
      setNewPhone(customer.phone || '')
    } else {
      setSelectedCustomer(null)
      setNewName('')
      setNewPhone('')
    }
    setNewAmount('')
    setNewNote('')
    setAddModalOpen(true)
  }

  function handleAddSubmit(e) {
    e.preventDefault()
    const cleanName = newName.trim()
    if (!cleanName) {
      alert('Please enter customer name')
      return
    }
    const amt = parseFloat(newAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      alert('Please enter a valid amount')
      return
    }
    setAdding(true)
    try {
      debtService.addManualDebt(
        {
          id: selectedCustomer?.id,
          name: cleanName,
          phone: newPhone.trim() || undefined,
        },
        amt,
        newNote.trim() || 'Customer credit added'
      )
      setAddModalOpen(false)
      loadData()
    } catch (err) {
      alert(err.message || 'Failed to add debt')
    } finally {
      setAdding(false)
    }
  }

  function handleDelete(customer) {
    if (confirm(`Are you sure you want to remove ${customer.name}'s debt record?`)) {
      debtService.deleteCustomerDebt(customer.id)
      loadData()
    }
  }

  function sendWhatsAppReminder(customer) {
    if (!customer.phone) {
      alert('No phone number registered for this customer.')
      return
    }
    const shopProfile = shopProfileService.getProfile()
    const shopName = shopProfile?.shopName || 'our store'
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '')
    const msg = `Hello ${customer.name},\nThis is a gentle reminder from *${shopName}* that your outstanding account balance is *₹${Number(customer.totalDebt).toFixed(2)}*.\nPlease clear your dues at your earliest convenience. Thank you!`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 p-4 md:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text">Customer Credit Book</h1>
          <p className="text-sm text-secondary">
            Track credit sales, payments received, and customer credit ledger
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddDebt()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover cursor-pointer"
        >
          <IconPlus size={16} />
          Add Customer Credit
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Total Outstanding Credit
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fee2e2] text-danger">
              <IconBookUser size={16} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-danger">
            {formatCurrency(totalOutstanding)}
          </div>
          <p className="mt-1 text-xs text-secondary">Total money pending collection</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Active Debtors
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light text-primary">
              <IconClock size={16} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-text">{activeDebtorsCount}</div>
          <p className="mt-1 text-xs text-secondary">Customers with pending balance</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Total Customers
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-light text-info">
              <IconCheck size={16} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-text">{debts.length}</div>
          <p className="mt-1 text-xs text-secondary">Registered in debt book</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-secondary">
          <IconSearch size={16} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer by name or phone..."
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 text-sm text-text placeholder-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
      </div>

      {/* Customer Debt List */}
      {filteredDebts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-secondary">
            <IconBookUser size={24} />
          </div>
          <h3 className="mt-4 text-base font-bold text-text">No Customer Debts Found</h3>
          <p className="mt-1 max-w-sm text-xs text-secondary">
            {search
              ? 'No customers match your search criteria.'
              : 'Credit sales created during POS billing or manual entries will appear here.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => openAddDebt()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-hover cursor-pointer"
            >
              <IconPlus size={14} /> Add First Customer Debt
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDebts.map((customer) => {
            const isExpanded = expandedId === customer.id
            const hasDebt = (customer.totalDebt || 0) > 0
            const entries = customer.entries || []

            return (
              <div
                key={customer.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                        hasDebt ? 'bg-[#fee2e2] text-danger' : 'bg-primary-light text-primary'
                      }`}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-text">{customer.name}</h3>
                        {hasDebt ? (
                          <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[11px] font-bold text-danger">
                            Due
                          </span>
                        ) : (
                          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-[#166534]">
                            Cleared
                          </span>
                        )}
                      </div>
                      {customer.phone && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-secondary">
                          <IconPhone size={12} /> {customer.phone}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted">
                        Last updated: {formatDateTime(customer.lastUpdated)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                    <div className="text-lg font-black text-text">
                      <span className="text-xs font-semibold text-secondary mr-1">Pending:</span>
                      <span className={hasDebt ? 'text-danger' : 'text-primary'}>
                        {formatCurrency(customer.totalDebt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {customer.phone && hasDebt && (
                        <button
                          type="button"
                          onClick={() => sendWhatsAppReminder(customer)}
                          title="Send WhatsApp Reminder"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          <IconMessageSquare size={13} /> WhatsApp
                        </button>
                      )}

                      {hasDebt && (
                        <button
                          type="button"
                          onClick={() => openSettle(customer)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary-hover cursor-pointer"
                        >
                          <IconBanknote size={13} /> Settle
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openAddDebt(customer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-bg cursor-pointer"
                      >
                        <IconPlus size={13} /> Add Credit
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-secondary hover:bg-bg cursor-pointer"
                      >
                        {isExpanded ? 'Hide History' : `History (${entries.length})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(customer)}
                        title="Delete customer record"
                        className="inline-flex items-center justify-center rounded-lg border border-transparent p-1 text-muted hover:bg-[#fee2e2] hover:text-danger cursor-pointer"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ledger History Drawer */}
                {isExpanded && (
                  <div className="border-t border-border bg-bg/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                      Transaction Ledger History
                    </h4>
                    {entries.length === 0 ? (
                      <p className="text-xs text-muted">No transactions recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
                        {entries.map((entry) => {
                          const isCredit =
                            entry.type === 'CREDIT_SALE' || entry.type === 'MANUAL_DEBT'
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 text-xs"
                            >
                              <div className="flex items-start gap-2.5">
                                <span
                                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold ${
                                    isCredit
                                      ? 'bg-[#fee2e2] text-danger'
                                      : 'bg-primary-light text-primary'
                                  }`}
                                >
                                  {isCredit ? '–' : '+'}
                                </span>
                                <div>
                                  <div className="font-bold text-text">
                                    {entry.type === 'CREDIT_SALE' && 'POS Credit Sale'}
                                    {entry.type === 'MANUAL_DEBT' && 'Manual Credit Added'}
                                    {entry.type === 'PAYMENT_RECEIVED' &&
                                      `Payment Received (${entry.paymentMethod || 'CASH'})`}
                                  </div>
                                  {entry.note && <div className="text-secondary">{entry.note}</div>}
                                  {entry.itemsSummary && entry.itemsSummary.length > 0 && (
                                    <div className="text-muted text-[11px]">
                                      {entry.itemsSummary.join(', ')}
                                    </div>
                                  )}
                                  <div className="text-[10px] text-muted">
                                    {formatDateTime(entry.date)}
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`font-black text-sm ${
                                  isCredit ? 'text-danger' : 'text-primary'
                                }`}
                              >
                                {isCredit ? '+' : '-'}
                                {formatCurrency(entry.amount)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Settle Payment Modal */}
      {settleModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">
                Settle Payment - {selectedCustomer.name}
              </h3>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="text-secondary hover:text-text cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="rounded-xl bg-bg p-3">
                <span className="text-xs text-secondary">Current Outstanding:</span>
                <div className="text-lg font-black text-danger">
                  {formatCurrency(selectedCustomer.totalDebt)}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Payment Method</label>
                <div className="mt-1 flex gap-2">
                  {['CASH', 'UPI'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettleMethod(m)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                        settleMethod === m
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-surface text-secondary hover:bg-bg'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Note / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Settle partial balance"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-secondary hover:bg-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                >
                  {settling ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Increase Debt Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">
                {selectedCustomer ? `Add Debt for ${selectedCustomer.name}` : 'New Customer Credit'}
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-secondary hover:text-text cursor-pointer"
              >
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-secondary">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={!!selectedCustomer}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  disabled={!!selectedCustomer}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Credit Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary">Reason / Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Purchased groceries on credit"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-secondary hover:bg-bg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
                >
                  {adding ? 'Saving...' : 'Add Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const DEBT_STORAGE_KEY = 'shopmanager_customer_debts_v1'

let memoryCustomerDebts = null

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function sanitizeName(name) {
  return (name || '').trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, '')
}

function sanitizePhone(phone) {
  if (!phone) return undefined
  const cleaned = phone.replace(/[^0-9+ -]/g, '').slice(0, 20).trim()
  return cleaned || undefined
}

export const debtService = {
  getCachedCustomerDebts() {
    return memoryCustomerDebts
  },

  getCustomerDebts() {
    if (memoryCustomerDebts !== null) {
      return memoryCustomerDebts
    }
    try {
      const raw = localStorage.getItem(DEBT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          memoryCustomerDebts = parsed
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to read customer debts from storage:', e)
    }
    memoryCustomerDebts = []
    return []
  },

  saveCustomerDebts(debts) {
    memoryCustomerDebts = debts
    try {
      localStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(debts))
    } catch (e) {
      console.warn('Failed to persist customer debts:', e)
    }
  },

  recordCreditSale(customer, sale, note) {
    const cleanName = sanitizeName(customer.name)
    if (!cleanName) {
      throw new Error('Customer name is required for credit sale')
    }
    const cleanPhone = sanitizePhone(customer.phone)
    const amount = Number(sale.totalAmount) || 0
    const now = new Date().toISOString()

    const debts = [...this.getCustomerDebts()]
    const itemsSummary = (sale.items || []).map(
      (it) => `${it.productName || it.name || 'Item'} (x${it.quantity || 1})`
    )

    const newEntry = {
      id: generateId(),
      type: 'CREDIT_SALE',
      amount,
      date: now,
      saleId: sale.id,
      itemsSummary,
      note: note ? note.trim() : undefined,
    }

    const existingIndex = debts.findIndex(
      (c) =>
        c.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''))
    )

    let updatedAccount
    if (existingIndex >= 0) {
      const existing = debts[existingIndex]
      updatedAccount = {
        ...existing,
        name: cleanName,
        phone: cleanPhone || existing.phone,
        totalDebt: Math.max(0, Number((existing.totalDebt + amount).toFixed(2))),
        lastUpdated: now,
        entries: [newEntry, ...(existing.entries || [])],
      }
      debts[existingIndex] = updatedAccount
    } else {
      updatedAccount = {
        id: generateId(),
        name: cleanName,
        phone: cleanPhone,
        totalDebt: amount,
        lastUpdated: now,
        entries: [newEntry],
      }
      debts.unshift(updatedAccount)
    }

    this.saveCustomerDebts(debts)
    return updatedAccount
  },

  recordDebtPayment(customerId, amountPaid, paymentMethod = 'CASH', note) {
    const debts = [...this.getCustomerDebts()]
    const index = debts.findIndex((c) => c.id === customerId)
    if (index < 0) {
      throw new Error('Customer debt account not found')
    }

    const existing = debts[index]
    const cleanAmount = Math.max(0, Number(amountPaid) || 0)
    const now = new Date().toISOString()

    const paymentEntry = {
      id: generateId(),
      type: 'PAYMENT_RECEIVED',
      amount: cleanAmount,
      date: now,
      paymentMethod,
      note: note ? note.trim() : undefined,
    }

    const newTotalDebt = Math.max(0, Number((existing.totalDebt - cleanAmount).toFixed(2)))
    const updatedAccount = {
      ...existing,
      totalDebt: newTotalDebt,
      lastUpdated: now,
      entries: [paymentEntry, ...(existing.entries || [])],
    }

    debts[index] = updatedAccount
    this.saveCustomerDebts(debts)
    return updatedAccount
  },

  addManualDebt(customer, amount, note) {
    const cleanName = sanitizeName(customer.name)
    if (!cleanName) {
      throw new Error('Customer name is required')
    }
    const cleanPhone = sanitizePhone(customer.phone)
    const cleanAmount = Math.max(0, Number(amount) || 0)
    const now = new Date().toISOString()

    const debts = [...this.getCustomerDebts()]
    const newEntry = {
      id: generateId(),
      type: 'MANUAL_DEBT',
      amount: cleanAmount,
      date: now,
      note: note ? note.trim() : undefined,
    }

    let index = -1
    if (customer.id) {
      index = debts.findIndex((c) => c.id === customer.id)
    }
    if (index < 0) {
      index = debts.findIndex(
        (c) =>
          c.name.toLowerCase() === cleanName.toLowerCase() ||
          (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''))
      )
    }

    let updatedAccount
    if (index >= 0) {
      const existing = debts[index]
      updatedAccount = {
        ...existing,
        name: cleanName,
        phone: cleanPhone || existing.phone,
        totalDebt: Math.max(0, Number((existing.totalDebt + cleanAmount).toFixed(2))),
        lastUpdated: now,
        entries: [newEntry, ...(existing.entries || [])],
      }
      debts[index] = updatedAccount
    } else {
      updatedAccount = {
        id: generateId(),
        name: cleanName,
        phone: cleanPhone,
        totalDebt: cleanAmount,
        lastUpdated: now,
        entries: [newEntry],
      }
      debts.unshift(updatedAccount)
    }

    this.saveCustomerDebts(debts)
    return updatedAccount
  },

  deleteCustomerDebt(customerId) {
    const debts = this.getCustomerDebts().filter((c) => c.id !== customerId)
    this.saveCustomerDebts(debts)
  },

  getTotalOutstandingDebt() {
    const debts = this.getCustomerDebts()
    return debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0)
  },

  getTodayDebtStats() {
    const debts = this.getCustomerDebts()
    let todayPosCreditSales = 0
    let todayManualDebt = 0
    let todayPaymentReceived = 0

    const now = new Date()
    const todayYear = now.getFullYear()
    const todayMonth = now.getMonth()
    const todayDate = now.getDate()

    for (const customer of debts) {
      if (Array.isArray(customer.entries)) {
        for (const entry of customer.entries) {
          if (!entry.date) continue
          const entryDate = new Date(entry.date)
          const isToday =
            entryDate.getFullYear() === todayYear &&
            entryDate.getMonth() === todayMonth &&
            entryDate.getDate() === todayDate

          if (isToday) {
            const amt = Number(entry.amount) || 0
            if (entry.type === 'CREDIT_SALE') {
              todayPosCreditSales += amt
            } else if (entry.type === 'MANUAL_DEBT') {
              todayManualDebt += amt
            } else if (entry.type === 'PAYMENT_RECEIVED') {
              todayPaymentReceived += amt
            }
          }
        }
      }
    }

    const todayCreditGiven = todayPosCreditSales + todayManualDebt
    const totalOutstanding = debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0)

    return {
      todayCreditGiven,
      todayPosCreditSales,
      todayManualDebt,
      todayPaymentReceived,
      totalOutstanding,
    }
  },

  getDebtStatsForRange(from, to) {
    const debts = this.getCustomerDebts()
    let posCreditSales = 0
    let manualDebt = 0
    let paymentReceived = 0

    let fromTime = null
    let toTime = null

    if (from) {
      const f = new Date(from)
      f.setHours(0, 0, 0, 0)
      fromTime = f.getTime()
    }
    if (to) {
      const t = new Date(to)
      t.setHours(23, 59, 59, 999)
      toTime = t.getTime()
    }

    for (const customer of debts) {
      if (Array.isArray(customer.entries)) {
        for (const entry of customer.entries) {
          if (!entry.date) continue
          const entryTime = new Date(entry.date).getTime()
          if (fromTime !== null && entryTime < fromTime) continue
          if (toTime !== null && entryTime > toTime) continue

          const amt = Number(entry.amount) || 0
          if (entry.type === 'CREDIT_SALE') {
            posCreditSales += amt
          } else if (entry.type === 'MANUAL_DEBT') {
            manualDebt += amt
          } else if (entry.type === 'PAYMENT_RECEIVED') {
            paymentReceived += amt
          }
        }
      }
    }

    return {
      creditGiven: posCreditSales + manualDebt,
      posCreditSales,
      manualDebt,
      paymentReceived,
    }
  },

  findCustomerForSale(saleId) {
    if (!saleId) return null
    const debts = this.getCustomerDebts()
    for (const customer of debts) {
      if (Array.isArray(customer.entries)) {
        const entry = customer.entries.find((e) => String(e.saleId) === String(saleId))
        if (entry) {
          return { customer, entry }
        }
      }
    }
    return null
  },
}

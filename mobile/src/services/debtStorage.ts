import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { CustomerDebtAccount, DebtLedgerEntry, DebtStats, DateRangeDebtStats } from '../types';

const DEBT_STORAGE_KEY = 'shopmanager_customer_debts_v1';

let memoryCustomerDebts: CustomerDebtAccount[] | null = null;

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 100).replace(/[\x00-\x1F\x7F]/g, '');
}

function sanitizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^0-9+ -]/g, '').slice(0, 20).trim();
  return cleaned || undefined;
}

export const debtStorage = {
  getCachedCustomerDebts(): CustomerDebtAccount[] | null {
    return memoryCustomerDebts;
  },

  async getCustomerDebts(): Promise<CustomerDebtAccount[]> {
    if (memoryCustomerDebts !== null) {
      return memoryCustomerDebts;
    }

    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(DEBT_STORAGE_KEY);
      } else {
        raw = await SecureStore.getItemAsync(DEBT_STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCustomerDebts = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read customer debts from storage:', e);
    }

    memoryCustomerDebts = [];
    return [];
  },

  async saveCustomerDebts(debts: CustomerDebtAccount[]): Promise<void> {
    memoryCustomerDebts = debts;
    try {
      const serialized = JSON.stringify(debts);
      if (Platform.OS === 'web') {
        localStorage.setItem(DEBT_STORAGE_KEY, serialized);
      } else {
        await SecureStore.setItemAsync(DEBT_STORAGE_KEY, serialized);
      }
    } catch (e) {
      console.warn('Failed to persist customer debts:', e);
    }
  },

  async recordCreditSale(
    customer: { name: string; phone?: string },
    sale: { id?: number; totalAmount: number; items?: { productName: string; quantity: number }[] },
    note?: string
  ): Promise<CustomerDebtAccount> {
    const cleanName = sanitizeName(customer.name);
    if (!cleanName) {
      throw new Error('Customer name is required for credit sale');
    }
    const cleanPhone = sanitizePhone(customer.phone);
    const amount = Number(sale.totalAmount) || 0;
    const now = new Date().toISOString();

    const debts = await this.getCustomerDebts();
    const itemsSummary = (sale.items || []).map((it) => `${it.productName} (x${it.quantity})`);

    const newEntry: DebtLedgerEntry = {
      id: generateId(),
      type: 'CREDIT_SALE',
      amount,
      date: now,
      saleId: sale.id,
      itemsSummary,
      note: note ? note.trim() : undefined,
    };

    // Find existing customer by name (case-insensitive) or phone
    const existingIndex = debts.findIndex(
      (c) =>
        c.name.toLowerCase() === cleanName.toLowerCase() ||
        (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''))
    );

    let updatedAccount: CustomerDebtAccount;

    if (existingIndex >= 0) {
      const existing = debts[existingIndex];
      updatedAccount = {
        ...existing,
        name: cleanName, // update name formatting if provided
        phone: cleanPhone || existing.phone,
        totalDebt: Math.max(0, Number((existing.totalDebt + amount).toFixed(2))),
        lastUpdated: now,
        entries: [newEntry, ...(existing.entries || [])],
      };
      debts[existingIndex] = updatedAccount;
    } else {
      updatedAccount = {
        id: generateId(),
        name: cleanName,
        phone: cleanPhone,
        totalDebt: amount,
        lastUpdated: now,
        entries: [newEntry],
      };
      debts.unshift(updatedAccount);
    }

    await this.saveCustomerDebts(debts);
    return updatedAccount;
  },

  async recordDebtPayment(
    customerId: string,
    amountPaid: number,
    paymentMethod: 'CASH' | 'UPI' = 'CASH',
    note?: string
  ): Promise<CustomerDebtAccount> {
    const debts = await this.getCustomerDebts();
    const index = debts.findIndex((c) => c.id === customerId);
    if (index < 0) {
      throw new Error('Customer debt account not found');
    }

    const existing = debts[index];
    const cleanAmount = Math.max(0, Number(amountPaid) || 0);
    const now = new Date().toISOString();

    const paymentEntry: DebtLedgerEntry = {
      id: generateId(),
      type: 'PAYMENT_RECEIVED',
      amount: cleanAmount,
      date: now,
      paymentMethod,
      note: note ? note.trim() : undefined,
    };

    const newTotalDebt = Math.max(0, Number((existing.totalDebt - cleanAmount).toFixed(2)));

    const updatedAccount: CustomerDebtAccount = {
      ...existing,
      totalDebt: newTotalDebt,
      lastUpdated: now,
      entries: [paymentEntry, ...(existing.entries || [])],
    };

    debts[index] = updatedAccount;
    await this.saveCustomerDebts(debts);
    return updatedAccount;
  },

  async addManualDebt(
    customer: { name: string; phone?: string; id?: string },
    amount: number,
    note?: string
  ): Promise<CustomerDebtAccount> {
    const cleanName = sanitizeName(customer.name);
    if (!cleanName) {
      throw new Error('Customer name is required');
    }
    const cleanPhone = sanitizePhone(customer.phone);
    const cleanAmount = Math.max(0, Number(amount) || 0);
    const now = new Date().toISOString();

    const debts = await this.getCustomerDebts();

    const newEntry: DebtLedgerEntry = {
      id: generateId(),
      type: 'MANUAL_DEBT',
      amount: cleanAmount,
      date: now,
      note: note ? note.trim() : undefined,
    };

    let index = -1;
    if (customer.id) {
      index = debts.findIndex((c) => c.id === customer.id);
    }
    if (index < 0) {
      index = debts.findIndex(
        (c) =>
          c.name.toLowerCase() === cleanName.toLowerCase() ||
          (cleanPhone && c.phone && c.phone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''))
      );
    }

    let updatedAccount: CustomerDebtAccount;

    if (index >= 0) {
      const existing = debts[index];
      updatedAccount = {
        ...existing,
        name: cleanName,
        phone: cleanPhone || existing.phone,
        totalDebt: Math.max(0, Number((existing.totalDebt + cleanAmount).toFixed(2))),
        lastUpdated: now,
        entries: [newEntry, ...(existing.entries || [])],
      };
      debts[index] = updatedAccount;
    } else {
      updatedAccount = {
        id: generateId(),
        name: cleanName,
        phone: cleanPhone,
        totalDebt: cleanAmount,
        lastUpdated: now,
        entries: [newEntry],
      };
      debts.unshift(updatedAccount);
    }

    await this.saveCustomerDebts(debts);
    return updatedAccount;
  },

  async deleteCustomerDebt(customerId: string): Promise<void> {
    const debts = await this.getCustomerDebts();
    const filtered = debts.filter((c) => c.id !== customerId);
    await this.saveCustomerDebts(filtered);
  },

  async getTotalOutstandingDebt(): Promise<number> {
    const debts = await this.getCustomerDebts();
    return debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  },

  async getTodayDebtStats(): Promise<DebtStats> {
    const debts = await this.getCustomerDebts();
    let todayPosCreditSales = 0;
    let todayManualDebt = 0;
    let todayPaymentReceived = 0;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    for (const customer of debts) {
      if (Array.isArray(customer.entries)) {
        for (const entry of customer.entries) {
          if (!entry.date) continue;
          const entryDate = new Date(entry.date);
          const isToday =
            entryDate.getFullYear() === todayYear &&
            entryDate.getMonth() === todayMonth &&
            entryDate.getDate() === todayDate;

          if (isToday) {
            const amt = Number(entry.amount) || 0;
            if (entry.type === 'CREDIT_SALE') {
              todayPosCreditSales += amt;
            } else if (entry.type === 'MANUAL_DEBT') {
              todayManualDebt += amt;
            } else if (entry.type === 'PAYMENT_RECEIVED') {
              todayPaymentReceived += amt;
            }
          }
        }
      }
    }

    const todayCreditGiven = todayPosCreditSales + todayManualDebt;
    const totalOutstanding = debts.reduce((sum, c) => sum + (c.totalDebt || 0), 0);

    return {
      todayCreditGiven,
      todayPosCreditSales,
      todayManualDebt,
      todayPaymentReceived,
      totalOutstanding,
    };
  },

  async getDebtStatsForRange(from?: string, to?: string): Promise<DateRangeDebtStats> {
    const debts = await this.getCustomerDebts();
    let posCreditSales = 0;
    let manualDebt = 0;
    let paymentReceived = 0;

    let fromTime: number | null = null;
    let toTime: number | null = null;

    if (from) {
      const f = new Date(from);
      f.setHours(0, 0, 0, 0);
      fromTime = f.getTime();
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      toTime = t.getTime();
    }

    for (const customer of debts) {
      if (Array.isArray(customer.entries)) {
        for (const entry of customer.entries) {
          if (!entry.date) continue;
          const entryTime = new Date(entry.date).getTime();
          if (fromTime !== null && entryTime < fromTime) continue;
          if (toTime !== null && entryTime > toTime) continue;

          const amt = Number(entry.amount) || 0;
          if (entry.type === 'CREDIT_SALE') {
            posCreditSales += amt;
          } else if (entry.type === 'MANUAL_DEBT') {
            manualDebt += amt;
          } else if (entry.type === 'PAYMENT_RECEIVED') {
            paymentReceived += amt;
          }
        }
      }
    }

    return {
      creditGiven: posCreditSales + manualDebt,
      posCreditSales,
      manualDebt,
      paymentReceived,
    };
  },
};

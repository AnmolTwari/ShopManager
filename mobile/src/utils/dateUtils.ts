/**
 * Date and Time utilities for ShopManager Mobile.
 * Handles UTC parsing for timestamps coming from Spring Boot/Render server
 * and formats them accurately in local 12-hour format with AM/PM.
 */

export function parseServerDate(dateInput?: string | number | Date | null): Date {
  if (!dateInput) {
    return new Date();
  }

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return new Date();

    // If backend sent ISO string without timezone like "2026-09-10T09:49:15"
    // and without 'Z' or offset (+05:30 / -04:00)
    if (
      trimmed.includes('T') &&
      !trimmed.endsWith('Z') &&
      !trimmed.includes('+') &&
      !trimmed.match(/-\d{2}:\d{2}$/)
    ) {
      // Treat server timestamp as UTC
      const d = new Date(trimmed + 'Z');
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Format date & time for invoices, receipts, and PDF (e.g. "10 Sep 2026, 03:25 PM")
 */
export function formatReceiptDateTime(dateInput?: string | number | Date | null): string {
  const d = parseServerDate(dateInput);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date & time for transaction logs and UI cards (e.g. "10 Sep 2026, 03:25 PM")
 */
export function formatDateTime(dateInput?: string | number | Date | null): string {
  const d = parseServerDate(dateInput);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time only (e.g. "03:25 PM")
 */
export function formatTimeOnly(dateInput?: string | number | Date | null): string {
  const d = parseServerDate(dateInput);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date only (e.g. "10 Sep 2026")
 */
export function formatDateOnly(dateInput?: string | number | Date | null): string {
  const d = parseServerDate(dateInput);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

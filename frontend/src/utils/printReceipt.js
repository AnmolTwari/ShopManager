import { formatCurrency, formatDateTime } from './format'
import { UNIT_LABELS } from './units'

export function printReceipt({ sale, shopProfile, creditInfo }) {
  const effectiveShopName = shopProfile?.shopName || 'ShopManager Store'
  const effectivePhone = shopProfile?.phone || ''
  const effectiveAddress = shopProfile?.address || ''
  const effectiveGst = shopProfile?.gstNumber || ''
  const tagline = shopProfile?.tagline || ''
  const formattedDate = formatDateTime(sale.createdAt)

  const isCredit = Boolean(creditInfo)
  const customer = creditInfo?.customer
  const paymentMethod = isCredit ? 'Customer Credit' : 'Cash / Online'

  // Calculate items, totals, savings
  let totalMrp = 0
  let totalSavings = 0

  const itemsHtml = (sale.items || [])
    .map((item, idx) => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0
      const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0
      const lineTot = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal)) || rate * qty
      const mrp = item.mrp != null ? (typeof item.mrp === 'number' ? item.mrp : parseFloat(String(item.mrp)) || 0) : null
      const hasDiscount = mrp != null && mrp > rate
      const itemMrpTotal = mrp != null ? mrp * qty : lineTot
      totalMrp += itemMrpTotal
      if (hasDiscount) {
        totalSavings += (mrp - rate) * qty
      }

      const unitLabel = UNIT_LABELS[item.unit] ?? item.unit ?? ''
      const discountPct = mrp != null && mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0

      return `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; vertical-align: top; width: 18px; color: #64748b; font-size: 11px;">
            ${idx + 1}.
          </td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; vertical-align: top;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${item.productName || 'Item'}</div>
            ${item.productSku ? `<div style="font-size: 10px; color: #64748b;">SKU: ${item.productSku}</div>` : ''}
            ${hasDiscount ? `<span style="display: inline-block; font-size: 9px; font-weight: 700; color: #047857; background: #ecfdf5; border: 0.5px solid #a7f3d0; padding: 1px 4px; border-radius: 3px; margin-top: 2px;">${discountPct}% OFF</span>` : ''}
          </td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; vertical-align: top; text-align: center; font-size: 12px; white-space: nowrap;">
            ${qty} ${unitLabel}
          </td>
          <td style="padding: 6px 4px; border-bottom: 1px dashed #e2e8f0; vertical-align: top; text-align: right; font-size: 12px; white-space: nowrap;">
            ${hasDiscount ? `<div style="color: #94a3b8; font-size: 10px; text-decoration: line-through;">₹${mrp.toFixed(2)}</div>` : ''}
            <div style="font-weight: 600; color: #0f172a;">₹${rate.toFixed(2)}</div>
          </td>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; vertical-align: top; text-align: right; font-weight: 700; color: #047857; font-size: 12px; white-space: nowrap;">
            ₹${lineTot.toFixed(2)}
          </td>
        </tr>
      `
    })
    .join('')

  const totalAmount = Number(sale.totalAmount) || 0

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt #${sale.id} - ${effectiveShopName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page {
          margin: 6mm;
          size: auto;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 16px 12px;
          color: #0f172a;
          font-size: 12px;
          line-height: 1.4;
          max-width: 380px;
          margin: 0 auto;
          background: #fff;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .header {
          text-align: center;
          padding-bottom: 12px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 10px;
        }
        .shop-title {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #047857;
          margin-bottom: 3px;
        }
        .shop-meta {
          font-size: 11px;
          color: #475569;
          margin-bottom: 2px;
        }
        .invoice-badge {
          display: inline-block;
          background: #f1f5f9;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          margin-top: 6px;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .meta-table {
          width: 100%;
          margin: 8px 0;
          font-size: 11px;
          color: #334155;
        }
        .meta-table td { padding: 2px 0; }
        .divider {
          border-top: 1px dashed #cbd5e1;
          margin: 8px 0;
        }
        table.items {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        table.items th {
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          border-bottom: 1.5px solid #0f172a;
          padding: 5px 2px;
        }
        .totals-table {
          width: 100%;
          margin-top: 8px;
          font-size: 12px;
        }
        .totals-table td { padding: 3px 0; }
        .savings-row {
          color: #047857;
          font-weight: 700;
        }
        .grand-total {
          font-size: 15px;
          font-weight: 900;
          color: #047857;
          border-top: 1.5px solid #0f172a;
          border-bottom: 1.5px solid #0f172a;
          padding: 6px 0;
        }
        .savings-banner {
          margin-top: 10px;
          background: #f0fdf4;
          border: 1px dashed #22c55e;
          color: #15803d;
          padding: 6px 10px;
          border-radius: 6px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
        }
        .footer {
          margin-top: 18px;
          text-align: center;
          padding-top: 10px;
          border-top: 1px dashed #cbd5e1;
        }
        .footer-msg {
          font-size: 11px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
        }
        .powered-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 700;
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: 0.3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-title">${effectiveShopName}</div>
        ${effectiveAddress ? `<div class="shop-meta">📍 ${effectiveAddress}</div>` : ''}
        ${effectivePhone ? `<div class="shop-meta">📞 Phone: ${effectivePhone}</div>` : ''}
        ${effectiveGst ? `<div class="shop-meta">GSTIN / TAX ID: ${effectiveGst}</div>` : ''}
        <div class="invoice-badge">TAX INVOICE / RETAIL BILL</div>
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>Invoice #:</strong> ${sale.id}</td>
          <td class="right"><strong>Mode:</strong> ${paymentMethod}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>Date &amp; Time:</strong> ${formattedDate}</td>
        </tr>
        ${
          customer
            ? `
          <tr>
            <td colspan="2" style="padding-top: 4px; color: #b45309;">
              <strong>Customer:</strong> ${customer.name}${customer.phone ? ` (${customer.phone})` : ''}
            </td>
          </tr>
        `
            : ''
        }
      </table>

      <table class="items">
        <thead>
          <tr>
            <th style="width: 18px;">#</th>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <table class="totals-table">
        ${
          totalSavings > 0
            ? `
          <tr>
            <td style="color: #64748b;">Subtotal (Total MRP)</td>
            <td class="right" style="color: #64748b;">₹${totalMrp.toFixed(2)}</td>
          </tr>
          <tr class="savings-row">
            <td>Total Savings</td>
            <td class="right">-₹${totalSavings.toFixed(2)}</td>
          </tr>
        `
            : ''
        }
        <tr class="grand-total">
          <td>TOTAL AMOUNT</td>
          <td class="right">₹${totalAmount.toFixed(2)}</td>
        </tr>
        ${
          isCredit && customer
            ? `
          <tr>
            <td style="padding-top: 6px; font-size: 11px; color: #b45309; font-weight: 700;">Account Balance Due</td>
            <td class="right" style="padding-top: 6px; font-size: 11px; color: #b45309; font-weight: 700;">₹${Number(customer.totalDebt).toFixed(2)}</td>
          </tr>
        `
            : ''
        }
      </table>

      ${
        totalSavings > 0
          ? `
        <div class="savings-banner">
          🎉 YOU SAVED ₹${totalSavings.toFixed(2)} ON THIS BILL! 🎉
        </div>
      `
          : ''
      }

      <div class="footer">
        <div class="footer-msg">${tagline || 'Thank you for shopping with us! Please visit again. 🙏'}</div>
        <div class="powered-badge">⚡ Powered by ShopManager</div>
      </div>
    </body>
    </html>
  `

  // Create isolated invisible iframe for printing to prevent sidebar / app chrome bleed
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)
    }, 250)
  }
}

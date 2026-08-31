import React from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { SaleResponse } from '../types';
import { colors } from '../theme/colors';
import { CheckCircle, Printer, MessageSquare } from 'lucide-react-native';

interface ReceiptModalProps {
  visible: boolean;
  sale: SaleResponse | null;
  shopName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  sale,
  shopName = 'ShopManager Store',
  customerPhone,
  paymentMethod = 'CASH',
  onClose,
}) => {
  if (!sale) return null;

  const formattedDate = new Date(sale.createdAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAmount = typeof sale.totalAmount === 'number' ? sale.totalAmount : parseFloat(sale.totalAmount) || 0;

  const items = sale.items || [];
  const calculatedProfit = items.reduce((acc, item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const sell = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
    const buy = typeof item.purchasePrice === 'number' ? item.purchasePrice : parseFloat(String(item.purchasePrice)) || 0;
    return acc + qty * (sell - buy);
  }, 0);

  const handleWhatsAppShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const itemsList = items
        .map((i, idx) => {
          const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
          const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
          return `${idx + 1}. *${i.productName}* x${qty} = ₹${total.toFixed(2)}`;
        })
        .join('\n');

      const message = `🧾 *INVOICE #${sale.id}*\n🏬 *${shopName}*\n📅 ${formattedDate}\n\n*Items:*\n${itemsList}\n\n-------------------------\n💰 *TOTAL AMOUNT: ₹${totalAmount.toFixed(2)}*\n💳 Payment Mode: ${paymentMethod}\n-------------------------\nThank you for shopping with us! 🙏`;

      const encoded = encodeURI(message);
      let url = `whatsapp://send?text=${encoded}`;
      if (customerPhone && customerPhone.trim()) {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        url = `whatsapp://send?phone=${cleanPhone}&text=${encoded}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encoded}`);
      }
    } catch (e) {
      console.warn('Error sharing on WhatsApp:', e);
    }
  };

  const handlePrintPdf = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; color: #111; }
            .center { text-align: center; }
            .header { margin-bottom: 15px; }
            .title { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { text-align: left; border-bottom: 1px dashed #444; padding: 4px 0; }
            td { padding: 4px 0; }
            .right { text-align: right; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="center header">
            <div class="title">${shopName}</div>
            <div>Invoice #${sale.id}</div>
            <div>${formattedDate}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Rate</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((i) => {
                  const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity)) || 0;
                  const rate = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(String(i.unitPrice)) || 0;
                  const total = typeof i.lineTotal === 'number' ? i.lineTotal : parseFloat(String(i.lineTotal)) || 0;
                  return `
                    <tr>
                      <td>${i.productName}</td>
                      <td class="right">${qty}</td>
                      <td class="right">₹${rate.toFixed(2)}</td>
                      <td class="right">₹${total.toFixed(2)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr class="total-row">
              <td>Grand Total:</td>
              <td class="right">₹${totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Payment:</td>
              <td class="right">${paymentMethod}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <div class="footer">
            Thank you for your visit!<br/>Powered by ShopManager
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      console.warn('Print error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Success Banner */}
          <View style={styles.successHeader}>
            <CheckCircle size={32} color={colors.success} />
            <Text style={styles.successTitle}>Sale Recorded Successfully!</Text>
            <Text style={styles.invoiceNumber}>Invoice #{sale.id}</Text>
          </View>

          {/* Receipt Card */}
          <ScrollView style={styles.receiptScroll} contentContainerStyle={styles.receiptBody}>
            <View style={styles.receiptCard}>
              <Text style={styles.storeName}>{shopName}</Text>
              <Text style={styles.dateTime}>{formattedDate}</Text>
              <View style={styles.dashLine} />

              {/* Items Table */}
              <View style={styles.itemsTable}>
                {items.map((item, index) => {
                  const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
                  const rate = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
                  const total = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal)) || 0;

                  return (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.productName}
                        </Text>
                        <Text style={styles.itemQtyRate}>
                          {qty} x ₹{rate.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>₹{total.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.dashLine} />

              {/* Total & Profit */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
              </View>

              {calculatedProfit > 0 && (
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Net Profit</Text>
                  <Text style={styles.profitValue}>+₹{calculatedProfit.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppShare}>
              <MessageSquare size={18} color="#fff" />
              <Text style={styles.whatsappText}>Share on WhatsApp</Text>
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.pdfBtn} onPress={handlePrintPdf}>
                <Printer size={16} color={colors.text} />
                <Text style={styles.pdfText}>Print / PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  successHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: colors.successLight,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
    marginTop: 6,
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  receiptScroll: {
    maxHeight: 320,
  },
  receiptBody: {
    padding: 16,
  },
  receiptCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
  },
  dateTime: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  dashLine: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  itemsTable: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  itemQtyRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  profitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  profitValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  actionButtons: {
    padding: 16,
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  whatsappText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  pdfText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

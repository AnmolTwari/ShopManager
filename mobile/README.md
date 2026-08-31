# ShopManager Mobile Companion App (React Native & Expo)

A high-performance companion mobile application for small retail shop owners to manage billing, point-of-sale (POS) barcode checkout, floor inventory, and real-time sales reporting.

---

## 📱 Features

- ⚡ **Instant Barcode POS & Billing**: Continuous camera scanning with sound & haptic feedback for ultra-fast customer checkout.
- 🧾 **Digital Receipts & WhatsApp Sharing**: Formats itemized bills with 1-tap WhatsApp sharing to customer phone numbers and printable PDF export.
- 📦 **Floor Inventory & Stock-In**: Walk the shop floor, scan items on shelves, perform incoming batch stock-ins, or record damaged/expired adjustments.
- 📊 **Real-Time Live Dashboard**: Today's revenue, net profit, total bills, stock alerts, and recent sales invoices.
- 📈 **Date-Range Sales Reports**: Today, 7-day, 30-day, and all-time revenue/profit summaries with category share progress bars.
- 🔐 **Unified Login & Real-Time Sync**: Log in with the exact same username/email and password as the web app — backed by your live PostgreSQL database.

---

## 🚀 Quick Start (100% Free)

### 1. Test Instantly on Your Phone (Android or iPhone)

1. Install **Expo Go** from Google Play Store or Apple App Store (Free).
2. Open terminal in the `mobile` folder:
   ```bash
   cd mobile
   npx expo start
   ```
3. Scan the terminal QR code with your phone camera (or the Expo Go app).
4. The ShopManager app opens live on your device with instant hot-reload!

---

### 2. Generate Standalone Android `.apk` File (Free)

To build a standalone `.apk` that anyone can install on Android phones without Google Play fees:

```bash
cd mobile
npx eas build -p android --profile preview
```

Once the build finishes:
1. Download the generated `ShopManager.apk`.
2. Place it in `frontend/public/ShopManager.apk`.
3. Anyone visiting your website can download the APK with one click.

---

## 🌐 Server Connection

The app is pre-configured to connect to your live production Render backend:
- **Default API**: `https://grocery-shop-backend-bfgk.onrender.com/api`

You can also change the backend URL inside the app at:
**Settings ➔ Server Connection ➔ Backend API URL** (e.g. `http://192.168.1.100:8081/api` for local testing).

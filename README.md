# 🏢 Commercial Building Billing, Payments & GST Manager (Android APK & PWA)

A complete mobile application for commercial building owners to manage tenant business organisations, track outgoing bills, record split payments (**Cash & Online**), attach bill photos/receipts, and track **GST collected vs GST paid**.

---

## 🌟 Key Features

### 1. 🏢 Business Organisations / Tenants Directory
- Store all business organisations staying in your building.
- Track unit/floor number, contact person, phone, email, and 15-digit **GSTIN**.
- Store agreed monthly rent, maintenance fees, and security deposit terms.
- Real-time balance ledger for each organisation.

### 2. 📄 Store Bills Sent to Organisations
- Create & store invoices with auto-generated bill numbers (e.g. `INV-2026-101`).
- Itemized breakdown: Base Rent, Maintenance charges, Electricity/Water, Amenities.
- GST calculation (0%, 5%, 12%, 18%, 28%) with support for CGST/SGST or Interstate IGST.
- **Photo / PDF attachment**: Take photo with camera or attach the sent physical bill document.
- One-click **PDF Tax Invoice** download.
- One-click **WhatsApp Share** to send payment reminders directly to tenants.

### 3. 💳 Record Payment Receipts (Cash & Online Split)
- **Cash Amount Paid**: Record exact cash collected by hand.
- **Online Amount Paid**: Record online transfers (UPI, GPay, PhonePe, NEFT, RTGS, IMPS, Cheque) with UTR / Transaction Reference ID.
- **Store Payment Receipt Proof**: Attach camera photo or screenshot of the payment receipt / bank slip / cash voucher.
- Automatically updates bill status (`unpaid`, `partial`, `paid`) and reconciles remaining balance.
- Instant **Payment Receipt PDF** generation.

### 4. 📊 GST Center & Input Tax Credit (ITC)
- **Output GST**: Auto-calculated from bills sent to tenant organisations.
- **GST Paid on Building (ITC)**: Store bills and tax paid to vendors for lift maintenance, electrician, plumbing repairs, security guards, cleaning staff, etc.
- **Net GST Liability**: Calculates net tax payable to the government or excess credit carried forward.
- Attach vendor GST bills as audit proof.
- Export complete GST ledger to CSV for your accountant.

### 5. 📱 100% Offline & Private
- Operates completely offline with zero internet dependency using IndexedDB (`Dexie.js`).
- Complete data export & restore in JSON format.

---

## 🚀 How to Run & Install on Android

### Option 1: Instant Android Install (PWA App - Recommended)
1. Run `npm run dev -- --host` on your computer.
2. Open the network URL on your Android phone's Google Chrome browser.
3. Tap the three dots (⋮) in Chrome and select **"Install app"** or **"Add to Home screen"**.
4. The app installs with its own icon on your Android home screen and opens full-screen without browser bars.

### Option 2: Automatic Standalone `.apk` Build via GitHub Actions
This project includes a ready-to-run GitHub Actions workflow (`.github/workflows/build-apk.yml`).
1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Building Bill & GST Manager"
   git push origin main
   ```
2. Go to the **Actions** tab in your GitHub repository.
3. The workflow builds the Android `.apk` and provides a downloadable **`app-debug.apk`** and **`app-release-unsigned.apk`** in the Artifacts section!
4. Download the `.apk` directly onto your Android phone and tap to install.

### Option 3: Local Android Studio Build
If you have Android Studio installed on your computer:
```bash
npm run build
npx cap sync android
npm run cap:open
```
In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the file.

---

## 🛠️ Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Mobile Engine**: Capacitor 8 (Android)
- **Database**: IndexedDB with Dexie.js (Offline Storage)
- **PDF Generation**: jsPDF
- **Icons**: Lucide React

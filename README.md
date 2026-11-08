# BuildingBill & GST Manager - Android APK

A dedicated commercial building billing, dual-mode payment tracking, and GST accounting mobile application designed for building owners and commercial landlords.

---

## 📱 APK File Location

The Android APK is compiled and ready for installation:

- **Primary APK:** [`BuildingBill_GST.apk`](file:///c:/Users/work/Documents/antigravity/agitated-rutherford/BuildingBill_GST.apk) *(Size: ~4.12 MB)*
- **Gradle Output Location:** [`android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/work/Documents/antigravity/agitated-rutherford/android/app/build/outputs/apk/debug/app-debug.apk)

### 📲 How to Install on Your Android Phone:
1. Copy `BuildingBill_GST.apk` to your phone via USB cable, WhatsApp, Google Drive, or Bluetooth.
2. Tap the `.apk` file on your phone.
3. If prompted, allow *"Install unknown apps"* for your file manager or browser.
4. Tap **Install** and open **BuildingBill GST**!

---

## 🏢 Core Features Built for You

### 1. 🏢 Business Organisation (Tenant) Directory
- Store all companies, offices, and shops staying in your commercial building.
- Track Company Name, Unit/Office/Floor number, Contact Person, Phone, Email.
- Record Tenant **GSTIN** and **PAN** numbers for official tax compliance.
- Set default Monthly Rent, Common Area Maintenance (CAM), and Security Deposit.

### 2. 📄 Store Bills Sent to Tenants (Invoices)
- Generate and store official GST Tax Invoices sent to business tenants.
- Particulars with SAC codes: Office Space Rent (SAC 997212), Common Area Maintenance (SAC 9987), Electricity meter reading & charges, Water, Parking.
- Automatic GST breakdown: **18% standard GST** with **9% CGST + 9% SGST** (or 18% IGST for inter-state).
- **📎 Bill Document & Photo Storage:** Attach copies of sent bills, physical invoices, or meter photos using phone camera or file upload.
- One-tap **Download Official PDF Tax Invoice** with your bank & UPI payment details printed.

### 3. 💳 Store Payment Bills & Receipts (Cash vs Online Split)
- Record payments made by tenants against specific bills or as advances.
- **Dual Payment Tracking:**
  - **Cash Paid:** Physical currency handed over at your building office.
  - **Online Paid:** Bank transfer via **UPI (GPay / PhonePe / Paytm)**, **NEFT / RTGS**, **IMPS**, **Net Banking**, or **Cheque**.
  - Store transaction reference number / UTR / Cheque number.
  - Automatically calculates total received (`Cash + Online = Total`).
- **📎 Payment Receipt Storage:** Capture or upload bank deposit slips, UPI transfer screenshots, or signed vouchers.
- Automatically updates invoice balances (Paid, Partially Paid, Overdue).
- One-tap **Download Official Payment Receipt PDF** showing Cash vs Online breakdown.

### 4. 🧾 Store GST Paid & Tax Ledger
- **Building Maintenance GST (Input Tax Credit - ITC):**
  - Store GST paid on commercial lift AMC, electrical rewiring, 24/7 security agency, sanitation, and property repairs.
  - Store vendor tax invoices and bills.
- **Direct Government GST Payments:**
  - Store GSTR-3B / PMT-06 challan tax payments made to the GST portal with Challan CIN # and payment receipt copies.
- **GST Summary Dashboard:**
  - Total GST collected on tenant rent (Output Liability).
  - Total GST paid on maintenance & expenses (Input Tax Credit).
  - Total GST paid to Government via challan.
  - Net GST balance & liability statement.
  - One-tap **Download GST Statement & Tax Ledger PDF**.

### 5. 🔒 Offline-First & Data Backup
- Works 100% offline without needing internet for daily billing.
- All stored bills, payment vouchers, and GST receipts are securely saved on your device.
- One-tap **Export Full Backup JSON** to save all records to your phone storage or Google Drive.
- One-tap **Import Backup** to restore data anytime.

---

## 🛠️ Project Architecture
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS (Dark/Light commercial dashboard UI)
- **Native Wrapper:** Capacitor Android SDK
- **PDF Engine:** jsPDF + AutoTable
- **Persistence:** Local Storage & Base64 document attachments

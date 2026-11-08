import { Tenant, Invoice, PaymentReceipt, GstExpenseRecord, BuildingProfile, BillAttachment } from '../types';

const STORAGE_KEYS = {
  TENANTS: 'building_bill_tenants_v1',
  INVOICES: 'building_bill_invoices_v1',
  PAYMENTS: 'building_bill_payments_v1',
  GST_EXPENSES: 'building_bill_gst_expenses_v1',
  PROFILE: 'building_bill_profile_v1',
};

export const DEFAULT_PROFILE: BuildingProfile = {
  buildingName: 'Sri Raghavendra Commercial Complex',
  address: 'Plot No. 42-45, Outer Ring Road, Bengaluru, Karnataka 560103',
  landlordName: 'R. K. Estates & Commercial Properties',
  landlordGstin: '29AAACR1234F1Z8',
  landlordPan: 'AAACR1234F',
  contactPhone: '+91 98450 12345',
  contactEmail: 'accounts@rkcommercial.in',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  upiId: 'rkestates@hdfcbank',
  currencySymbol: '₹',
  defaultGstRate: 18,
};

const SAMPLE_TENANTS: Tenant[] = [
  {
    id: 't-1',
    name: 'Zenith InfoTech Solutions Pvt Ltd',
    unitNumber: 'Suite 301, 3rd Floor',
    buildingName: 'Sri Raghavendra Commercial Complex',
    contactPerson: 'Mr. Arvind Sharma',
    phone: '+91 98765 43210',
    email: 'accounts@zenithinfotech.com',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    monthlyRent: 85000,
    monthlyMaintenance: 15000,
    securityDeposit: 600000,
    leaseStartDate: '2025-01-01',
    leaseEndDate: '2028-12-31',
    isActive: true,
    notes: 'Commercial software development office'
  },
  {
    id: 't-2',
    name: 'CloudScale Logistics & Supply LLP',
    unitNumber: 'Unit 102, 1st Floor',
    buildingName: 'Sri Raghavendra Commercial Complex',
    contactPerson: 'Ms. Priya Sundaram',
    phone: '+91 97422 11998',
    email: 'priya@cloudscalelogistics.in',
    gstin: '29XYZAB5678C1Z2',
    pan: 'XYZAB5678C',
    monthlyRent: 60000,
    monthlyMaintenance: 10000,
    securityDeposit: 420000,
    leaseStartDate: '2025-04-01',
    leaseEndDate: '2027-03-31',
    isActive: true,
    notes: 'Regional logistics backend office'
  },
  {
    id: 't-3',
    name: 'Nova Dental Care & Diagnostic Lab',
    unitNumber: 'Shop G-04, Ground Floor',
    buildingName: 'Sri Raghavendra Commercial Complex',
    contactPerson: 'Dr. Rohan Verma',
    phone: '+91 94488 22334',
    email: 'dr.rohan@novadental.com',
    gstin: '29LMNOP9012K1Z9',
    pan: 'LMNOP9012K',
    monthlyRent: 45000,
    monthlyMaintenance: 8000,
    securityDeposit: 300000,
    leaseStartDate: '2024-06-01',
    isActive: true,
    notes: 'Ground floor clinic & health diagnosis'
  }
];

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-11-001',
    tenantId: 't-1',
    tenantName: 'Zenith InfoTech Solutions Pvt Ltd',
    unitNumber: 'Suite 301, 3rd Floor',
    invoiceDate: '2026-11-01',
    dueDate: '2026-11-10',
    period: 'November 2026',
    items: [
      { id: 'i-1', description: 'Commercial Office Space Rent (SAC: 997212)', hsnSac: '997212', amount: 85000 },
      { id: 'i-2', description: 'Common Area Maintenance & DG Backup (SAC: 9987)', hsnSac: '9987', amount: 15000 },
      { id: 'i-3', description: 'Electricity Sub-meter Charges (650 units @ ₹12)', hsnSac: '9972', amount: 7800 },
    ],
    subtotal: 107800,
    gstRate: 18,
    isInterState: false,
    cgst: 9702,
    sgst: 9702,
    igst: 0,
    totalGst: 19404,
    totalAmount: 127204,
    paidAmount: 127204,
    balanceDue: 0,
    status: 'PAID',
    notes: 'November 2026 rent invoice with electricity consumption',
    attachments: []
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-11-002',
    tenantId: 't-2',
    tenantName: 'CloudScale Logistics & Supply LLP',
    unitNumber: 'Unit 102, 1st Floor',
    invoiceDate: '2026-11-01',
    dueDate: '2026-11-10',
    period: 'November 2026',
    items: [
      { id: 'i-4', description: 'Commercial Space Rent (SAC: 997212)', hsnSac: '997212', amount: 60000 },
      { id: 'i-5', description: 'Monthly Maintenance Service', hsnSac: '9987', amount: 10000 },
      { id: 'i-6', description: 'Reserved Basement Car Parking (2 slots)', hsnSac: '9972', amount: 4000 },
    ],
    subtotal: 74000,
    gstRate: 18,
    isInterState: false,
    cgst: 6660,
    sgst: 6660,
    igst: 0,
    totalGst: 13320,
    totalAmount: 87320,
    paidAmount: 50000,
    balanceDue: 37320,
    status: 'PARTIALLY_PAID',
    notes: 'Partial payment received, balance pending',
    attachments: []
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-11-003',
    tenantId: 't-3',
    tenantName: 'Nova Dental Care & Diagnostic Lab',
    unitNumber: 'Shop G-04, Ground Floor',
    invoiceDate: '2026-11-01',
    dueDate: '2026-11-10',
    period: 'November 2026',
    items: [
      { id: 'i-7', description: 'Commercial Clinic Space Rent', hsnSac: '997212', amount: 45000 },
      { id: 'i-8', description: 'Maintenance & Sanitation', hsnSac: '9987', amount: 8000 },
    ],
    subtotal: 53000,
    gstRate: 18,
    isInterState: false,
    cgst: 4770,
    sgst: 4770,
    igst: 0,
    totalGst: 9540,
    totalAmount: 62540,
    paidAmount: 0,
    balanceDue: 62540,
    status: 'UNPAID',
    notes: 'Bill sent on WhatsApp & Email',
    attachments: []
  }
];

const SAMPLE_PAYMENTS: PaymentReceipt[] = [
  {
    id: 'pay-1',
    receiptNumber: 'REC-2026-11-001',
    tenantId: 't-1',
    tenantName: 'Zenith InfoTech Solutions Pvt Ltd',
    unitNumber: 'Suite 301, 3rd Floor',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-11-001',
    paymentDate: '2026-11-04',
    cashAmount: 27204, // Paid partly in cash
    onlineAmount: 100000, // Paid online
    totalAmount: 127204,
    onlineMode: 'NEFT_RTGS',
    onlineReference: 'HDFCR5202611049921',
    paymentFor: 'Full Settlement for November 2026 Bill',
    notes: '₹1,00,000 received via HDFC NEFT, ₹27,204 handed in cash to landlord office',
    attachments: []
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-2026-11-002',
    tenantId: 't-2',
    tenantName: 'CloudScale Logistics & Supply LLP',
    unitNumber: 'Unit 102, 1st Floor',
    invoiceId: 'inv-2',
    invoiceNumber: 'INV-2026-11-002',
    paymentDate: '2026-11-05',
    cashAmount: 20000,
    onlineAmount: 30000,
    totalAmount: 50000,
    onlineMode: 'UPI',
    onlineReference: 'UPI-ICICI-6302919381',
    paymentFor: 'Part payment towards November 2026 Rent',
    notes: 'Cash ₹20,000 + UPI ₹30,000. Balance ₹37,320 due next week.',
    attachments: []
  }
];

const SAMPLE_GST_EXPENSES: GstExpenseRecord[] = [
  {
    id: 'gst-1',
    recordType: 'EXPENSE_GST',
    date: '2026-11-02',
    vendorOrAuthority: 'Otis Elevator India Pvt Ltd',
    billOrChallanNumber: 'OTIS/BLR/2026/884',
    description: 'Quarterly Commercial Lift Comprehensive AMC',
    category: 'MAINTENANCE',
    taxableAmount: 28000,
    cgst: 2520,
    sgst: 2520,
    igst: 0,
    totalGstPaid: 5040,
    totalAmount: 33040,
    paymentMode: 'ONLINE',
    referenceNumber: 'NEFT-AXIS-992104',
    notes: 'Eligible for GST Input Tax Credit (ITC) for commercial property',
    attachments: []
  },
  {
    id: 'gst-2',
    recordType: 'GOVT_CHALLAN_PAYMENT',
    date: '2026-10-20',
    vendorOrAuthority: 'GST Portal (CBIC GSTN Challan PMT-06)',
    billOrChallanNumber: 'CIN-26102900018491',
    description: 'Monthly GSTR-3B GST Net Tax Paid to Government for October 2026',
    category: 'CHALLAN_PAYMENT',
    taxableAmount: 0,
    cgst: 14500,
    sgst: 14500,
    igst: 0,
    totalGstPaid: 29000,
    totalAmount: 29000,
    paymentMode: 'NET_BANKING',
    referenceNumber: 'CHALLAN-CIN-26102900018491',
    notes: 'Paid through HDFC Corporate Net Banking on GST portal',
    attachments: []
  },
  {
    id: 'gst-3',
    recordType: 'EXPENSE_GST',
    date: '2026-11-03',
    vendorOrAuthority: 'Apex Security & Facility Services',
    billOrChallanNumber: 'APEX/SEC/NOV-012',
    description: '24/7 Security Guard & CCTV Monitoring Services',
    category: 'SECURITY',
    taxableAmount: 35000,
    cgst: 3150,
    sgst: 3150,
    igst: 0,
    totalGstPaid: 6300,
    totalAmount: 41300,
    paymentMode: 'ONLINE',
    referenceNumber: 'UPI-REF-88492019',
    notes: 'Security agency GST invoice for building',
    attachments: []
  }
];

export const StorageService = {
  getProfile(): BuildingProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveProfile(profile: BuildingProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getTenants(): Tenant[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TENANTS);
      if (!data) {
        this.saveTenants(SAMPLE_TENANTS);
        return SAMPLE_TENANTS;
      }
      return JSON.parse(data);
    } catch {
      return SAMPLE_TENANTS;
    }
  },

  saveTenants(tenants: Tenant[]): void {
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
  },

  saveTenant(tenant: Tenant): void {
    const list = this.getTenants();
    const idx = list.findIndex(t => t.id === tenant.id);
    if (idx >= 0) {
      list[idx] = tenant;
    } else {
      list.unshift(tenant);
    }
    this.saveTenants(list);
  },

  deleteTenant(id: string): void {
    const list = this.getTenants().filter(t => t.id !== id);
    this.saveTenants(list);
  },

  getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (!data) {
        this.saveInvoices(SAMPLE_INVOICES);
        return SAMPLE_INVOICES;
      }
      return JSON.parse(data);
    } catch {
      return SAMPLE_INVOICES;
    }
  },

  saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  },

  saveInvoice(invoice: Invoice): void {
    const list = this.getInvoices();
    const idx = list.findIndex(i => i.id === invoice.id);
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    this.saveInvoices(list);
  },

  deleteInvoice(id: string): void {
    const list = this.getInvoices().filter(i => i.id !== id);
    this.saveInvoices(list);
  },

  getPayments(): PaymentReceipt[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (!data) {
        this.savePayments(SAMPLE_PAYMENTS);
        return SAMPLE_PAYMENTS;
      }
      return JSON.parse(data);
    } catch {
      return SAMPLE_PAYMENTS;
    }
  },

  savePayments(payments: PaymentReceipt[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  },

  savePayment(payment: PaymentReceipt): void {
    const list = this.getPayments();
    const idx = list.findIndex(p => p.id === payment.id);
    if (idx >= 0) {
      list[idx] = payment;
    } else {
      list.unshift(payment);
    }
    this.savePayments(list);

    // Auto-update linked invoice balance if present
    if (payment.invoiceId) {
      this.recalculateInvoicePayment(payment.invoiceId);
    }
  },

  deletePayment(id: string): void {
    const payments = this.getPayments();
    const deleted = payments.find(p => p.id === id);
    const updated = payments.filter(p => p.id !== id);
    this.savePayments(updated);
    if (deleted?.invoiceId) {
      this.recalculateInvoicePayment(deleted.invoiceId);
    }
  },

  recalculateInvoicePayment(invoiceId: string): void {
    const invoices = this.getInvoices();
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const payments = this.getPayments().filter(p => p.invoiceId === invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + p.totalAmount, 0);

    inv.paidAmount = totalPaid;
    inv.balanceDue = Math.max(0, inv.totalAmount - totalPaid);
    if (inv.balanceDue === 0 && inv.paidAmount > 0) {
      inv.status = 'PAID';
    } else if (inv.paidAmount > 0) {
      inv.status = 'PARTIALLY_PAID';
    } else {
      inv.status = 'UNPAID';
    }
    this.saveInvoices(invoices);
  },

  getGstExpenses(): GstExpenseRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GST_EXPENSES);
      if (!data) {
        this.saveGstExpenses(SAMPLE_GST_EXPENSES);
        return SAMPLE_GST_EXPENSES;
      }
      return JSON.parse(data);
    } catch {
      return SAMPLE_GST_EXPENSES;
    }
  },

  saveGstExpenses(expenses: GstExpenseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.GST_EXPENSES, JSON.stringify(expenses));
  },

  saveGstExpense(expense: GstExpenseRecord): void {
    const list = this.getGstExpenses();
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      list[idx] = expense;
    } else {
      list.unshift(expense);
    }
    this.saveGstExpenses(list);
  },

  deleteGstExpense(id: string): void {
    const list = this.getGstExpenses().filter(e => e.id !== id);
    this.saveGstExpenses(list);
  },

  // File helper to convert user uploaded bills or photos to persistent Base64 Data URL
  fileToAttachment(file: File): Promise<BillAttachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString()
        });
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },

  exportBackupJson(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      tenants: this.getTenants(),
      invoices: this.getInvoices(),
      payments: this.getPayments(),
      gstExpenses: this.getGstExpenses()
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.profile) this.saveProfile(data.profile);
      if (Array.isArray(data.tenants)) this.saveTenants(data.tenants);
      if (Array.isArray(data.invoices)) this.saveInvoices(data.invoices);
      if (Array.isArray(data.payments)) this.savePayments(data.payments);
      if (Array.isArray(data.gstExpenses)) this.saveGstExpenses(data.gstExpenses);
      return true;
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
      return false;
    }
  }
};

import Dexie, { type Table } from 'dexie';

export interface Organization {
  id?: number;
  name: string;
  unitNo: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstin?: string;
  monthlyRent: number;
  monthlyMaintenance: number;
  securityDeposit?: number;
  leaseStartDate: string;
  status: 'active' | 'vacated';
  createdAt: string;
}

export interface BillItem {
  id: string;
  description: string;
  amount: number;
}

export interface Bill {
  id?: number;
  billNumber: string;
  orgId: number;
  orgName: string;
  billDate: string;
  dueDate: string;
  billingMonth: string;
  items: BillItem[];
  subtotal: number;
  gstRate: number; // e.g. 18
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  isInterstate: boolean;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  billAttachment?: string; // Base64 data URL
  billAttachmentName?: string;
  billAttachmentType?: string;
  createdAt: string;
}

export interface Payment {
  id?: number;
  paymentNumber: string;
  billId?: number;
  billNumber?: string;
  orgId: number;
  orgName: string;
  billingMonth?: string;
  paymentDate: string;
  cashAmount: number;
  onlineAmount: number;
  onlineRefNumber?: string;
  totalAmount: number;
  gstRate?: number;
  gstAmount?: number;
  paymentMode: 'cash' | 'online' | 'mixed';
  receiptAttachment?: string; // Base64
  receiptAttachmentName?: string;
  receiptAttachmentType?: string;
  notes?: string;
  createdAt: string;
}

export interface GstExpense {
  id?: number;
  date: string;
  vendorName: string;
  vendorGstin?: string;
  category: 'repairs' | 'maintenance' | 'electricity' | 'security' | 'cleaning' | 'lift' | 'legal' | 'other';
  description: string;
  invoiceNumber?: string;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'online';
  onlineRef?: string;
  billAttachment?: string; // Base64
  billAttachmentName?: string;
  createdAt: string;
}

export interface BuildingProfile {
  id?: number;
  buildingName: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerGstin?: string;
  address: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export class AppDatabase extends Dexie {
  organizations!: Table<Organization, number>;
  bills!: Table<Bill, number>;
  payments!: Table<Payment, number>;
  gstExpenses!: Table<GstExpense, number>;
  profile!: Table<BuildingProfile, number>;

  constructor() {
    super('BuildingBillDB');
    this.version(1).stores({
      organizations: '++id, name, unitNo, status, createdAt',
      bills: '++id, billNumber, orgId, billDate, dueDate, billingMonth, status, createdAt',
      payments: '++id, paymentNumber, billId, orgId, paymentDate, paymentMode, createdAt',
      gstExpenses: '++id, date, vendorName, category, createdAt',
      profile: '++id'
    });
  }
}

export const db = new AppDatabase();

// Seed initial profile & demo data if empty
// Reset & Wipe All Data to completely fresh
export async function clearAllData() {
  await db.organizations.clear();
  await db.bills.clear();
  await db.payments.clear();
  await db.gstExpenses.clear();
  await db.profile.clear();
  await db.profile.put({
    id: 1,
    buildingName: 'My Building',
    ownerName: '',
    ownerPhone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
  });
}

// Ensures all old demo data (Skyline, Apex, demo bills) is completely wiped clean
export async function ensureCleanFreshState() {
  const isPurged = localStorage.getItem('clean_fresh_purged_v2');
  if (!isPurged) {
    await clearAllData();
    localStorage.setItem('clean_fresh_purged_v2', 'true');
  } else {
    const profileCount = await db.profile.count();
    if (profileCount === 0) {
      await db.profile.put({
        id: 1,
        buildingName: 'My Building',
        ownerName: '',
        ownerPhone: '',
        address: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: ''
      });
    }
  }
}

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
  paymentDate: string;
  cashAmount: number;
  onlineAmount: number;
  onlineRefNumber?: string;
  totalAmount: number;
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
export async function initDemoDataIfEmpty() {
  const orgCount = await db.organizations.count();
  if (orgCount === 0) {
    // Default building profile
    await db.profile.put({
      id: 1,
      buildingName: 'Apex Commercial Complex',
      ownerName: 'Building Management',
      ownerPhone: '+91 98765 43210',
      ownerGstin: '27AAAAA0000A1Z5',
      address: 'Tower A, MG Road, Commercial District',
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      upiId: 'apexcomplex@upi'
    });

    const org1Id = await db.organizations.add({
      name: 'Skyline Tech Solutions Pvt Ltd',
      unitNo: 'Unit 301, 3rd Floor',
      contactPerson: 'Rahul Sharma',
      phone: '+91 98111 22233',
      email: 'accounts@skylinetech.com',
      gstin: '27AABCS1429B1ZB',
      monthlyRent: 85000,
      monthlyMaintenance: 12000,
      securityDeposit: 250000,
      leaseStartDate: '2025-01-01',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    const org2Id = await db.organizations.add({
      name: 'Nexus Digital Marketing Agency',
      unitNo: 'Unit 204, 2nd Floor',
      contactPerson: 'Priya Verma',
      phone: '+91 98222 33344',
      email: 'priya@nexusagency.in',
      gstin: '27AAECN9988D1Z2',
      monthlyRent: 45000,
      monthlyMaintenance: 6000,
      securityDeposit: 150000,
      leaseStartDate: '2025-06-15',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // Sample Bill for Skyline
    const bill1Total = 85000 + 12000;
    const bill1Gst = Math.round(bill1Total * 0.18);
    const bill1GrandTotal = bill1Total + bill1Gst;
    const bill1Id = await db.bills.add({
      billNumber: 'BILL-2026-101',
      orgId: org1Id,
      orgName: 'Skyline Tech Solutions Pvt Ltd',
      billDate: '2026-10-01',
      dueDate: '2026-10-10',
      billingMonth: 'October 2026',
      items: [
        { id: '1', description: 'Office Space Rent (Unit 301)', amount: 85000 },
        { id: '2', description: 'Building Maintenance & Security', amount: 12000 }
      ],
      subtotal: bill1Total,
      gstRate: 18,
      cgstAmount: bill1Gst / 2,
      sgstAmount: bill1Gst / 2,
      igstAmount: 0,
      isInterstate: false,
      totalAmount: bill1GrandTotal,
      paidAmount: bill1GrandTotal,
      balanceAmount: 0,
      status: 'paid',
      notes: 'Monthly invoice sent via email & hard copy',
      createdAt: new Date('2026-10-01T10:00:00Z').toISOString()
    });

    // Payment for Bill 1: Split between Cash and Online!
    await db.payments.add({
      paymentNumber: 'REC-2026-042',
      billId: bill1Id,
      billNumber: 'BILL-2026-101',
      orgId: org1Id,
      orgName: 'Skyline Tech Solutions Pvt Ltd',
      paymentDate: '2026-10-07',
      cashAmount: 30000,
      onlineAmount: 84460,
      onlineRefNumber: 'UPI/UTR-42819034211',
      totalAmount: 114460,
      paymentMode: 'mixed',
      notes: 'Received ₹30,000 in cash hand-delivered + ₹84,460 via Bank NEFT transfer',
      createdAt: new Date('2026-10-07T14:30:00Z').toISOString()
    });

    // Sample Bill for Nexus
    const bill2Total = 45000 + 6000;
    const bill2Gst = Math.round(bill2Total * 0.18);
    const bill2GrandTotal = bill2Total + bill2Gst;
    await db.bills.add({
      billNumber: 'BILL-2026-102',
      orgId: org2Id,
      orgName: 'Nexus Digital Marketing Agency',
      billDate: '2026-10-01',
      dueDate: '2026-10-10',
      billingMonth: 'October 2026',
      items: [
        { id: '1', description: 'Office Space Rent (Unit 204)', amount: 45000 },
        { id: '2', description: 'Monthly Maintenance', amount: 6000 }
      ],
      subtotal: bill2Total,
      gstRate: 18,
      cgstAmount: bill2Gst / 2,
      sgstAmount: bill2Gst / 2,
      igstAmount: 0,
      isInterstate: false,
      totalAmount: bill2GrandTotal,
      paidAmount: 25000,
      balanceAmount: bill2GrandTotal - 25000,
      status: 'partial',
      notes: 'Partial payment made in Cash',
      createdAt: new Date('2026-10-01T11:00:00Z').toISOString()
    });

    await db.payments.add({
      paymentNumber: 'REC-2026-043',
      billId: 2,
      billNumber: 'BILL-2026-102',
      orgId: org2Id,
      orgName: 'Nexus Digital Marketing Agency',
      paymentDate: '2026-10-08',
      cashAmount: 25000,
      onlineAmount: 0,
      onlineRefNumber: '',
      totalAmount: 25000,
      paymentMode: 'cash',
      notes: 'Partial rent advance paid in Cash receipt #881',
      createdAt: new Date('2026-10-08T16:00:00Z').toISOString()
    });

    // GST Paid on Building Maintenance / Repairs (Input Tax Credit)
    await db.gstExpenses.add({
      date: '2026-10-05',
      vendorName: 'Otis Elevator Servicing Co',
      vendorGstin: '27AAFCO1234F1Z8',
      category: 'lift',
      description: 'Quarterly lift maintenance AMC with 18% GST',
      invoiceNumber: 'OTIS-AMC-892',
      taxableAmount: 18000,
      gstRate: 18,
      gstAmount: 3240,
      totalAmount: 21240,
      paymentMethod: 'online',
      onlineRef: 'IMPS-99238411',
      createdAt: new Date('2026-10-05T12:00:00Z').toISOString()
    });

    await db.gstExpenses.add({
      date: '2026-10-12',
      vendorName: 'Apex Security & Housekeeping Services',
      vendorGstin: '27AABCS7766K1Z1',
      category: 'security',
      description: 'Building security guards and cleaning staff bill',
      invoiceNumber: 'SEC-OCT-26',
      taxableAmount: 28000,
      gstRate: 18,
      gstAmount: 5040,
      totalAmount: 33040,
      paymentMethod: 'online',
      onlineRef: 'NEFT-5512399',
      createdAt: new Date('2026-10-12T15:00:00Z').toISOString()
    });
  }
}

export interface BillAttachment {
  id: string;
  name: string;
  type: string; // image/jpeg, image/png, application/pdf
  dataUrl: string; // Base64 data url for offline storage and viewing
  size: number;
  uploadedAt: string;
}

export interface Tenant {
  id: string;
  name: string; // Business organisation name
  unitNumber: string; // Office / Shop / Floor number
  buildingName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string; // Tenant's GSTIN
  pan: string;
  monthlyRent: number;
  monthlyMaintenance: number;
  securityDeposit: number;
  leaseStartDate: string;
  leaseEndDate?: string;
  isActive: boolean;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string; // e.g. "Office Rent", "Maintenance", "Electricity Meter Charges"
  hsnSac: string; // SAC 997212 etc.
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  invoiceDate: string;
  dueDate: string;
  period: string; // e.g. "November 2026"
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number; // 18%
  isInterState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  notes?: string;
  attachments: BillAttachment[]; // Stored bills sent to tenants
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  invoiceId?: string; // Optional link to specific invoice
  invoiceNumber?: string;
  paymentDate: string;
  cashAmount: number; // Amount paid in cash
  onlineAmount: number; // Amount paid online
  totalAmount: number; // cashAmount + onlineAmount
  onlineMode?: 'UPI' | 'NEFT_RTGS' | 'IMPS' | 'NET_BANKING' | 'CHEQUE' | 'CARD';
  onlineReference?: string; // UTR / Cheque / Txn ID
  paymentFor: string; // e.g. "Rent & Maintenance - Nov 2026"
  notes?: string;
  attachments: BillAttachment[]; // Stored payment bill/receipt copies
}

export interface GstExpenseRecord {
  id: string;
  recordType: 'EXPENSE_GST' | 'GOVT_CHALLAN_PAYMENT';
  date: string;
  vendorOrAuthority: string; // e.g. "State GST Dept", "Otis Elevator AMC", "Power Corp"
  billOrChallanNumber: string; // Challan CIN or Vendor Bill #
  description: string;
  category: 'CHALLAN_PAYMENT' | 'MAINTENANCE' | 'UTILITIES' | 'SECURITY' | 'REPAIRS' | 'LEGAL' | 'OTHER';
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGstPaid: number;
  totalAmount: number;
  paymentMode: 'ONLINE' | 'CASH' | 'NET_BANKING' | 'CHEQUE';
  referenceNumber?: string;
  notes?: string;
  attachments: BillAttachment[]; // Stored GST bill / challan receipts
}

export interface BuildingProfile {
  buildingName: string;
  address: string;
  landlordName: string;
  landlordGstin: string;
  landlordPan: string;
  contactPhone: string;
  contactEmail: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  currencySymbol: string;
  defaultGstRate: number;
}

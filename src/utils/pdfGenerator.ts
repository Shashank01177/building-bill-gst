import jsPDF from 'jspdf';
import { type Bill, type Payment, type BuildingProfile } from '../db';
import { formatCurrency, formatDate } from './formatters';

export function generateBillPDF(bill: Bill, profile?: BuildingProfile | null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const bName = profile?.buildingName || 'Building Management';
  const owner = profile?.ownerName || 'Commercial Space Management';
  const phone = profile?.ownerPhone || '';
  const gstin = profile?.ownerGstin || '';
  const addr = profile?.address || '';

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(bName, 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`${addr} | Phone: ${phone}`, 14, 26);
  if (gstin) {
    doc.text(`GSTIN: ${gstin}`, 14, 32);
  }

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('TAX INVOICE / BILL', 140, 18);

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Bill No: ${bill.billNumber}`, 140, 26);
  doc.text(`Date: ${formatDate(bill.billDate)}`, 140, 32);

  // Bill To Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 48, 90, 32, 3, 3, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO / TENANT:', 18, 55);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(bill.orgName, 18, 62);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Billing Period: ${bill.billingMonth}`, 18, 68);
  doc.text(`Due Date: ${formatDate(bill.dueDate)}`, 18, 74);

  // Status badge box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, 48, 86, 32, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PAYMENT SUMMARY:', 114, 55);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Amount: ${formatCurrency(bill.totalAmount)}`, 114, 63);
  doc.text(`Amount Paid: ${formatCurrency(bill.paidAmount)}`, 114, 69);
  doc.setFont('helvetica', 'bold');
  if (bill.balanceAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Balance Due: ${formatCurrency(bill.balanceAmount)}`, 114, 76);
  } else {
    doc.setTextColor(22, 163, 74);
    doc.text(`Status: FULLY PAID`, 114, 76);
  }

  // Items Table Header
  let startY = 88;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, startY, 182, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SL', 18, startY + 6);
  doc.text('DESCRIPTION / PARTICULARS', 35, startY + 6);
  doc.text('AMOUNT (INR)', 160, startY + 6);

  startY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  bill.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, startY - 1, 182, 8, 'F');
    }
    doc.text(String(index + 1), 18, startY + 5);
    doc.text(item.description, 35, startY + 5);
    doc.text(formatCurrency(item.amount), 160, startY + 5);
    startY += 8;
  });

  // Subtotal & GST breakdown
  startY += 4;
  doc.line(14, startY, 196, startY);
  startY += 6;

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 125, startY);
  doc.text(formatCurrency(bill.subtotal), 165, startY);
  startY += 6;

  if (bill.gstRate > 0) {
    if (bill.isInterstate) {
      doc.text(`IGST (${bill.gstRate}%):`, 125, startY);
      doc.text(formatCurrency(bill.igstAmount), 165, startY);
      startY += 6;
    } else {
      const halfRate = bill.gstRate / 2;
      doc.text(`CGST (${halfRate}%):`, 125, startY);
      doc.text(formatCurrency(bill.cgstAmount), 165, startY);
      startY += 6;
      doc.text(`SGST (${halfRate}%):`, 125, startY);
      doc.text(formatCurrency(bill.sgstAmount), 165, startY);
      startY += 6;
    }
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(120, startY - 1, 76, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', 125, startY + 6);
  doc.text(formatCurrency(bill.totalAmount), 165, startY + 6);

  // Bank Account details box
  startY += 20;
  if (profile?.bankName || profile?.upiId) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, startY, 182, 28, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT BANK DETAILS:', 18, startY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    if (profile.bankName) {
      doc.text(`Bank: ${profile.bankName} | A/C: ${profile.accountNumber || '-'} | IFSC: ${profile.ifscCode || '-'}`, 18, startY + 13);
    }
    if (profile.upiId) {
      doc.text(`UPI ID for Online Transfer: ${profile.upiId}`, 18, startY + 20);
    }
  }

  // Footer notes
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated by Building Bill & GST Manager • ${new Date().toLocaleString()}`, 14, 285);

  doc.save(`${bill.billNumber}_${bill.orgName.replace(/\s+/g, '_')}.pdf`);
}

export function generatePaymentReceiptPDF(payment: Payment, profile?: BuildingProfile | null) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const bName = profile?.buildingName || 'Building Management';
  const phone = profile?.ownerPhone || '';
  const gstin = profile?.ownerGstin || '';

  // Header banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bName} | Phone: ${phone} | GSTIN: ${gstin || 'N/A'}`, 14, 28);

  // Receipt meta
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`Receipt No: ${payment.paymentNumber}`, 140, 18);
  doc.text(`Date: ${formatDate(payment.paymentDate)}`, 140, 26);

  let y = 48;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Received With Thanks From:`, 14, y);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(payment.orgName, 14, y + 8);

  if (payment.billNumber) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Against Bill / Invoice: ${payment.billNumber}`, 14, y + 16);
  }

  y += 26;
  // Payment Breakdown Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 50, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PAYMENT BREAKDOWN DETAILS', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  // Cash row
  doc.text('Cash Paid Amount:', 20, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.cashAmount), 120, y + 18);

  // Online row
  doc.setFont('helvetica', 'normal');
  doc.text('Online Paid Amount:', 20, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.onlineAmount), 120, y + 26);

  if (payment.onlineRefNumber) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`(Ref / UTR / Cheque: ${payment.onlineRefNumber})`, 20, y + 33);
  }

  // Total
  doc.line(20, y + 37, 180, y + 37);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Total Amount Received:', 20, y + 44);
  doc.text(formatCurrency(payment.totalAmount), 120, y + 44);

  y += 62;
  if (payment.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Notes / Remarks:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(payment.notes, 14, y + 7);
    y += 18;
  }

  // Signature box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory / Building Management', 130, y + 30);
  doc.line(130, y + 26, 196, y + 26);

  doc.save(`${payment.paymentNumber}_Receipt_${payment.orgName.replace(/\s+/g, '_')}.pdf`);
}

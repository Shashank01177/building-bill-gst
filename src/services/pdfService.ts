import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, PaymentReceipt, GstExpenseRecord, BuildingProfile, Tenant } from '../types';

export const PdfService = {
  // Generate Official Tax Invoice PDF
  generateInvoicePdf(invoice: Invoice, tenant?: Tenant, profile?: BuildingProfile) {
    const doc = new jsPDF();
    const curr = profile?.currencySymbol || '₹';

    // Header
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.buildingName || 'COMMERCIAL BUILDING INVOICE', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.address || '', 14, 23);
    doc.text(`GSTIN: ${profile?.landlordGstin || 'N/A'} | PAN: ${profile?.landlordPan || 'N/A'} | Tel: ${profile?.contactPhone || 'N/A'}`, 14, 29);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 196, 20, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`ORIGINAL FOR RECIPIENT`, 196, 27, { align: 'right' });

    // Details Grid
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO (TENANT / ORGANISATION):', 14, 46);
    doc.text('INVOICE DETAILS:', 120, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Business: ${invoice.tenantName}`, 14, 52);
    doc.text(`Premises / Unit: ${invoice.unitNumber}`, 14, 57);
    if (tenant?.contactPerson) doc.text(`Contact: ${tenant.contactPerson} (${tenant.phone})`, 14, 62);
    doc.text(`Tenant GSTIN: ${tenant?.gstin || 'Unregistered / Consumer'}`, 14, 67);

    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 120, 52);
    doc.text(`Date of Issue: ${invoice.invoiceDate}`, 120, 57);
    doc.text(`Due Date: ${invoice.dueDate}`, 120, 62);
    doc.text(`Billing Period: ${invoice.period}`, 120, 67);

    // Table of Particulars
    const tableBody = invoice.items.map((item, idx) => [
      idx + 1,
      item.description,
      item.hsnSac || '997212',
      `${curr} ${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 74,
      head: [['#', 'Description of Services / Particulars', 'SAC Code', 'Taxable Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 110 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // Calculation Summary Box
    doc.setFontSize(9);
    const rightColX = 140;
    const valueColX = 196;

    doc.text('Subtotal (Taxable Value):', rightColX, finalY);
    doc.text(`${curr} ${invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueColX, finalY, { align: 'right' });

    if (invoice.isInterState) {
      doc.text(`IGST (${invoice.gstRate}%):`, rightColX, finalY + 6);
      doc.text(`${curr} ${invoice.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueColX, finalY + 6, { align: 'right' });
    } else {
      doc.text(`CGST (${invoice.gstRate / 2}%):`, rightColX, finalY + 6);
      doc.text(`${curr} ${invoice.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueColX, finalY + 6, { align: 'right' });
      doc.text(`SGST (${invoice.gstRate / 2}%):`, rightColX, finalY + 12);
      doc.text(`${curr} ${invoice.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueColX, finalY + 12, { align: 'right' });
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(rightColX, finalY + 16, valueColX, finalY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Invoice Amount:', rightColX, finalY + 22);
    doc.text(`${curr} ${invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valueColX, finalY + 22, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Paid: ${curr} ${invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightColX, finalY + 28);
    doc.setTextColor(239, 68, 68);
    doc.text(`Balance Due: ${curr} ${invoice.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightColX, finalY + 34);

    // Bank Details & Signature
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK DETAILS FOR PAYMENT:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Bank Name: ${profile?.bankName || 'N/A'}`, 14, finalY + 5);
    doc.text(`A/C No: ${profile?.accountNumber || 'N/A'}`, 14, finalY + 10);
    doc.text(`IFSC Code: ${profile?.ifscCode || 'N/A'}`, 14, finalY + 15);
    doc.text(`UPI VPA: ${profile?.upiId || 'N/A'}`, 14, finalY + 20);

    doc.setFontSize(8);
    doc.text('Authorised Signatory', 196, finalY + 45, { align: 'right' });
    doc.text(`For ${profile?.landlordName || 'Landlord'}`, 196, finalY + 50, { align: 'right' });

    doc.save(`${invoice.invoiceNumber}.pdf`);
  },

  // Generate Payment Receipt PDF showing Cash vs Online split
  generatePaymentReceiptPdf(payment: PaymentReceipt, profile?: BuildingProfile) {
    const doc = new jsPDF();
    const curr = profile?.currencySymbol || '₹';

    // Header
    doc.setFillColor(15, 118, 110); // Teal-700
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.buildingName || 'COMMERCIAL BUILDING RECEIPT', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Landlord: ${profile?.landlordName || ''} | GSTIN: ${profile?.landlordGstin || 'N/A'}`, 14, 21);
    doc.text(`Address: ${profile?.address || ''}`, 14, 26);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 196, 18, { align: 'right' });

    // Details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.text(`Receipt No: ${payment.receiptNumber}`, 14, 42);
    doc.text(`Payment Date: ${payment.paymentDate}`, 120, 42);
    doc.text(`Received From: ${payment.tenantName}`, 14, 49);
    doc.text(`Unit / Floor: ${payment.unitNumber}`, 120, 49);
    if (payment.invoiceNumber) {
      doc.text(`Against Invoice: ${payment.invoiceNumber}`, 14, 56);
    }
    doc.text(`Purpose / For: ${payment.paymentFor}`, 120, 56);

    // Payment Breakup Table (Cash vs Online)
    const breakdown = [
      ['Cash Payment', `${curr} ${payment.cashAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Physical cash received at building office'],
      ['Online Payment', `${curr} ${payment.onlineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, `${payment.onlineMode || 'Online'} - Ref/UTR: ${payment.onlineReference || 'N/A'}`],
    ];

    autoTable(doc, {
      startY: 64,
      head: [['Payment Mode', 'Amount Paid', 'Mode Details / Reference']],
      body: breakdown,
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      styles: { fontSize: 9.5, cellPadding: 5 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    doc.setFillColor(243, 244, 246);
    doc.rect(14, finalY - 4, 182, 18, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Payment Received: ${curr} ${payment.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 20, finalY + 8);

    if (payment.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Notes: ${payment.notes}`, 14, finalY + 24);
    }

    doc.setFontSize(8.5);
    doc.text('This is a computer generated official payment receipt.', 14, finalY + 40);
    doc.text(`Authorized Signature: __________________`, 140, finalY + 40);

    doc.save(`${payment.receiptNumber}.pdf`);
  },

  // Generate GST Outward vs Inward vs Paid Summary Report
  generateGstSummaryReportPdf(invoices: Invoice[], gstExpenses: GstExpenseRecord[], profile?: BuildingProfile) {
    const doc = new jsPDF();
    const curr = profile?.currencySymbol || '₹';

    doc.setFillColor(30, 58, 138); // Blue-900
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GST TAX LEDGER & SUMMARY STATEMENT', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile?.buildingName} | GSTIN: ${profile?.landlordGstin}`, 14, 24);

    const totalOutwardGst = invoices.reduce((sum, i) => sum + i.totalGst, 0);
    const expenseGst = gstExpenses.filter(e => e.recordType === 'EXPENSE_GST');
    const challanGst = gstExpenses.filter(e => e.recordType === 'GOVT_CHALLAN_PAYMENT');

    const totalInwardGst = expenseGst.reduce((sum, e) => sum + e.totalGstPaid, 0);
    const totalChallanPaid = challanGst.reduce((sum, e) => sum + e.totalGstPaid, 0);

    // Summary Metric Cards
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GST OVERVIEW:', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Classification', 'Amount', 'Description']],
      body: [
        ['GST Collected from Tenants (Outward)', `${curr} ${totalOutwardGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Tax collected on commercial rent & maintenance'],
        ['GST Paid on Maintenance / Expenses (Inward ITC)', `${curr} ${totalInwardGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Input Tax Credit paid to vendors (Lift, Security, Repairs)'],
        ['GST Paid to Govt via Portal Challan', `${curr} ${totalChallanPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'GSTR-3B / PMT-06 direct tax deposits'],
        ['Net Liability After ITC & Payments', `${curr} ${(totalOutwardGst - totalInwardGst - totalChallanPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Current estimated net balance']
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('DETAILED GST PAID / CHALLAN VOUCHERS:', 14, finalY);

    const gstRows = gstExpenses.map((g, idx) => [
      idx + 1,
      g.date,
      g.recordType === 'GOVT_CHALLAN_PAYMENT' ? 'Govt Challan' : 'Vendor ITC Bill',
      g.vendorOrAuthority,
      g.billOrChallanNumber,
      `${curr} ${g.totalGstPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      g.paymentMode
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['#', 'Date', 'Type', 'Party / Authority', 'Bill/Challan #', 'GST Paid', 'Mode']],
      body: gstRows,
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      styles: { fontSize: 8.5 }
    });

    doc.save(`GST_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
};

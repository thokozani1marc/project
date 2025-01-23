import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getStorageItem } from './storage';

interface CompanySettings {
  companyName: string;
  storeName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  enableTax: boolean;
  vatPercentage: string;
}

interface OrderItem {
  serviceId: string;
  quantity: number;
  price: number;
  subtotal: number;
  colors?: string[];
  brandId?: string;
}

interface Order {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
  collectionDate: string;
  notes: string;
  items: OrderItem[];
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
}

const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export function generateReceipt(order: Order, services: Service[]) {
  // Get company settings
  const settings = getStorageItem<CompanySettings>('company_settings', {
    companyName: '',
    storeName: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    enableTax: false,
    vatPercentage: '15'
  });

  // Create new PDF document
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200] // 80mm width receipt
  });

  // Set font size and style
  doc.setFontSize(10);
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName || 'LAUNDRY POS', 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.storeName || '', 40, 15, { align: 'center' });
  if (settings.address) {
    doc.text(settings.address, 40, 19, { align: 'center' });
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 40, 23, { align: 'center' });
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 40, 27, { align: 'center' });
  }
  if (settings.website) {
    doc.text(`Web: ${settings.website}`, 40, 31, { align: 'center' });
  }

  // Order details
  doc.text(`Order #: ${order.id}`, 5, 37);
  doc.text(`Date: ${format(new Date(order.date), 'dd/MM/yyyy HH:mm')}`, 5, 41);
  doc.text(`Collection: ${format(new Date(order.collectionDate), 'dd/MM/yyyy HH:mm')}`, 5, 45);
  doc.text(`Customer: ${order.customer}`, 5, 49);

  // Items table
  const tableData = order.items.map(item => {
    const service = services.find(s => s.id === item.serviceId);
    return [
      service?.name || '',
      item.quantity.toFixed(2),
      formatPrice(item.price),
      item.colors?.join(', ') || '',
      formatPrice(item.subtotal)
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [['Item', 'Qty', 'Price', 'Colors', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 10 },
      2: { cellWidth: 15 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 }
    }
  });

  // Calculate the Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Totals
  doc.text('Subtotal:', 45, finalY);
  doc.text(formatPrice(order.total - order.tax), 75, finalY, { align: 'right' });
  
  if (settings.enableTax) {
    doc.text(`Tax (${settings.vatPercentage}%):`, 45, finalY + 4);
    doc.text(formatPrice(order.tax), 75, finalY + 4, { align: 'right' });
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 45, finalY + 8);
  doc.text(formatPrice(order.total), 75, finalY + 8, { align: 'right' });

  // Payment details
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Method:', 5, finalY + 14);
  doc.text(order.paymentMethod === 'pay_later' ? 'Pay Later' : 
    order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1), 
    30, finalY + 14
  );

  // Notes
  if (order.notes) {
    doc.text('Notes:', 5, finalY + 20);
    doc.text(order.notes, 5, finalY + 24);
  }

  // Footer
  doc.setFontSize(7);
  doc.text('Thank you for your business!', 40, finalY + 30, { align: 'center' });
  doc.text('Please keep this receipt for collection', 40, finalY + 34, { align: 'center' });

  return doc;
}
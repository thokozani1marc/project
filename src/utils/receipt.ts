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
  salesperson: string;
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

  const centerX = 40; // Center of receipt
  const marginLeft = 5;
  const marginRight = 75;
  let currentY = 10;
  const lineSpacing = 4;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.companyName || 'LAUNDRY POS', centerX, currentY, { align: 'center' });
  
  currentY += lineSpacing + 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (settings.storeName) {
    doc.text(settings.storeName, centerX, currentY, { align: 'center' });
    currentY += lineSpacing;
  }
  if (settings.address) {
    doc.text(settings.address, centerX, currentY, { align: 'center' });
    currentY += lineSpacing;
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, centerX, currentY, { align: 'center' });
    currentY += lineSpacing;
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, centerX, currentY, { align: 'center' });
    currentY += lineSpacing;
  }
  if (settings.website) {
    doc.text(`Website: ${settings.website}`, centerX, currentY, { align: 'center' });
    currentY += lineSpacing;
  }

  currentY += 2;
  // Divider
  doc.setLineWidth(0.1);
  doc.line(marginLeft, currentY, marginRight, currentY);
  currentY += lineSpacing;

  // Order details
  doc.setFontSize(8);
  doc.text(`Order #: ${order.id}`, marginLeft, currentY);
  currentY += lineSpacing;
  doc.text(`Date: ${format(new Date(order.date), 'dd/MM/yyyy HH:mm')}`, marginLeft, currentY);
  currentY += lineSpacing;
  doc.text(`Collection: ${format(new Date(order.collectionDate), 'dd/MM/yyyy HH:mm')}`, marginLeft, currentY);
  currentY += lineSpacing;
  doc.text(`Customer: ${order.customer}`, marginLeft, currentY);
  currentY += lineSpacing + 2;

  // Items table
  const tableData = order.items.map(item => {
    const service = services.find(s => s.id === item.serviceId);
    // Truncate long service names
    const serviceName = (service?.name || '').length > 12 
      ? (service?.name || '').substring(0, 12) + '...'
      : service?.name || '';
    
    // Format colors to fit in column
    const colorText = item.colors?.length 
      ? (item.colors.join(', ').length > 10 
        ? item.colors.join(', ').substring(0, 10) + '...'
        : item.colors.join(', '))
      : '';

    return [
      serviceName,
      item.quantity.toString(),
      formatPrice(item.price),
      colorText,
      formatPrice(item.subtotal)
    ];
  });

  // Calculate available width for table
  const pageWidth = 80; // 80mm
  const margins = 10; // 5mm on each side
  const tableWidth = pageWidth - margins;
  
  // Column width ratios (total should be 1)
  const columnRatios = {
    item: 0.35,    // 35% for item name
    qty: 0.1,      // 10% for quantity
    price: 0.2,    // 20% for price
    color: 0.15,   // 15% for colors
    total: 0.2     // 20% for total
  };

  autoTable(doc, {
    startY: currentY,
    head: [['Item', 'Qty', 'Price', 'Color', 'Total']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: { top: 1, right: 1, bottom: 1, left: 1 },
      lineWidth: 0.1,
      minCellHeight: 5,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { 
        cellWidth: tableWidth * columnRatios.item,
        halign: 'left',
        overflow: 'ellipsize'
      },
      1: { 
        cellWidth: tableWidth * columnRatios.qty,
        halign: 'center'
      },
      2: { 
        cellWidth: tableWidth * columnRatios.price,
        halign: 'right'
      },
      3: { 
        cellWidth: tableWidth * columnRatios.color,
        halign: 'left',
        overflow: 'ellipsize'
      },
      4: { 
        cellWidth: tableWidth * columnRatios.total,
        halign: 'right'
      }
    },
    margin: { left: marginLeft },
    tableWidth: tableWidth
  });

  // Calculate the Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Totals section with increased spacing
  doc.setLineWidth(0.1);
  doc.line(marginLeft, finalY - 2, marginRight, finalY - 2);
  
  // Increased spacing after separator line
  const totalsStartY = finalY + 3; // Increased from immediate start
  
  doc.text('Subtotal:', 45, totalsStartY);
  doc.text(formatPrice(order.total - order.tax), marginRight, totalsStartY, { align: 'right' });
  
  if (settings.enableTax) {
    doc.text(`Tax (${settings.vatPercentage}%):`, 45, totalsStartY + 4);
    doc.text(formatPrice(order.tax), marginRight, totalsStartY + 4, { align: 'right' });
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 45, totalsStartY + 8);
  doc.text(formatPrice(order.total), marginRight, totalsStartY + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  // Payment details - adjust starting position based on new totals position
  let paymentY = totalsStartY + 14;
  doc.text('Payment Method:', marginLeft, paymentY);
  doc.text(
    order.paymentMethod === 'pay_later' ? 'Pay Later' : 
    order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1), 
    28, paymentY
  );

  // Add payment status and salesperson
  const paymentStatus = order.paymentMethod === 'pay_later' ? 'Not Paid' : 'Paid';
  doc.text('Payment Status:', marginLeft, paymentY + 4);
  doc.text(paymentStatus, 26, paymentY + 4);

  if (order.salesperson) {
    doc.text('Served By:', marginLeft, paymentY + 8);
    doc.text(order.salesperson, 20, paymentY + 8);
  }

  // Notes - adjust position based on whether salesperson is shown
  if (order.notes) {
    const notesY = order.salesperson ? paymentY + 12 : paymentY + 8;
    doc.text('Notes:', marginLeft, notesY);
    doc.text(order.notes, marginLeft, notesY + 4);
    paymentY = notesY + (order.notes.length > 30 ? 12 : 8); // Adjust spacing based on notes length
  } else {
    paymentY = order.salesperson ? paymentY + 12 : paymentY + 8;
  }

  // Footer
  doc.setFontSize(6);
  const footerY = paymentY + 6;
  
  // Divider for footer
  doc.setLineWidth(0.1);
  doc.line(marginLeft, footerY, marginRight, footerY);
  
  // Split the footer text into manageable lines for the receipt width
  const fullText = "Every care is taken with all goods; however, goods are accepted at the customer's own risk. We are not responsible for losses due to fire, theft, burglary, hijacking during transit, non-removal of stains, stretching or fraying of materials, shrinking, color loss/fading, broken buckles, zips, beads, or buttons. Articles are accepted as secondhand, and in the case of liability, compensation shall not exceed five times the cleaning cost. Goods unclaimed after two months may be sold to defray expenses. No complaints will be considered after three days of delivery.";
  
  // Function to split text into lines that fit the receipt width
  const splitTextIntoLines = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = doc.getTextWidth(currentLine + ' ' + word);
      
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const maxWidth = marginRight - marginLeft - 2; // Leave 1mm padding on each side
  const footerLines = splitTextIntoLines(fullText, maxWidth);

  let footerLineY = footerY + 4;
  footerLines.forEach(line => {
    doc.text(line, marginLeft + 1, footerLineY, { align: 'left' });
    footerLineY += 2.5; // Reduced line spacing for compact footer
  });

  return doc;
}
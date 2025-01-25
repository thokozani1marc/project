export interface InventorySaleItem {
  keyId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface InventorySale {
  id: string;
  customer: string;
  status: string;
  total: number;
  tax: number;
  date: Date;
  paymentStatus: string;
  paymentMethod: 'cash' | 'card' | 'pay_later';
  items: InventorySaleItem[];
  salesperson: string;
  voidReason?: string;
  voidedAt?: Date;
}

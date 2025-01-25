import { getStorageItem, setStorageItem } from './storage';

export type StockOperationType = 'INTAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'SALE';
export type AdjustmentReason = 'DAMAGE' | 'LOSS' | 'THEFT' | 'RETURN' | 'OTHER';

export interface StockOperation {
  id: string;
  keyId: string;
  type: StockOperationType;
  quantity: number;
  date: string;
  performedBy: string;
  notes?: string;
  reason?: AdjustmentReason;
  fromLocationId?: string;
  toLocationId?: string;
  transferStatus?: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
}

export interface Key {
  id: string;
  name: string;
  type: string;
  brand: string;
  material: string;
  current_stock: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  supplier_id: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

export function processStockOperation(operation: Omit<StockOperation, 'id' | 'date'>) {
  const operations = getStorageItem<StockOperation[]>('stock_operations', []);
  const keys = getStorageItem<Key[]>('keys', []);

  const key = keys.find(k => k.id === operation.keyId);
  if (!key) throw new Error('Key not found');

  const newOperation: StockOperation = {
    ...operation,
    id: crypto.randomUUID(),
    date: new Date().toISOString()
  };

  // Update key stock
  let stockChange = operation.quantity;
  if (operation.type === 'SALE' || operation.type === 'TRANSFER') {
    stockChange = -stockChange;
  }

  const updatedKey = {
    ...key,
    current_stock: key.current_stock + stockChange,
    updated_at: new Date().toISOString()
  };

  if (updatedKey.current_stock < 0) {
    throw new Error('Insufficient stock');
  }

  const updatedKeys = keys.map(k => k.id === key.id ? updatedKey : k);
  
  setStorageItem('keys', updatedKeys);
  setStorageItem('stock_operations', [...operations, newOperation]);

  return { operation: newOperation, key: updatedKey };
}

export function getStockHistory(keyId?: string): StockOperation[] {
  const operations = getStorageItem<StockOperation[]>('stock_operations', []);
  return keyId 
    ? operations.filter(op => op.keyId === keyId)
    : operations;
}

export function checkLowStock(): Key[] {
  const keys = getStorageItem<Key[]>('keys', []);
  return keys.filter(key => key.current_stock <= key.reorder_point);
}

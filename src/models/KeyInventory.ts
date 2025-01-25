export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
}

export interface KeySpecification {
  type: string;
  brand: string;
  material: string;
  description?: string;
}

export interface KeyInventoryItem {
  id: string;
  name: string;
  specifications: KeySpecification;
  currentStock: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockAlert {
  keyId: string;
  currentStock: number;
  reorderPoint: number;
  status: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

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
}

export interface StockAdjustment extends StockOperation {
  type: 'ADJUSTMENT';
  reason: AdjustmentReason;
  costImpact: number;
}

export interface StockTransfer extends StockOperation {
  type: 'TRANSFER';
  fromLocationId: string;
  toLocationId: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
}

export interface StockIntake extends StockOperation {
  type: 'INTAKE';
  supplierId: string;
  purchaseOrderId?: string;
  unitCost: number;
}

export interface ReorderSuggestion {
  keyId: string;
  currentStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  supplierId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}

export interface CartReservation {
  id: string;
  keyId: string;
  quantity: number;
  cartId: string;
  expiresAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
}

export interface KeySale extends StockOperation {
  type: 'SALE';
  orderId: string;
  customerId: string;
  unitPrice: number;
  reservationId?: string;
}

export interface SalesHistory {
  keyId: string;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  lastSaleDate: string;
  salesByPeriod: {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
}

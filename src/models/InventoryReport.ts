import { KeyInventoryItem } from './KeyInventory';

export interface InventoryMovement {
  keyId: string;
  date: Date;
  type: 'ADDITION' | 'SUBTRACTION' | 'ADJUSTMENT' | 'LOSS';
  quantity: number;
  reason?: string;
  performedBy: string;
}

export interface KeyPerformanceMetrics {
  keyId: string;
  name: string;
  currentStock: number;
  totalSales: number;
  salesVelocity: number; // units sold per day
  daysOfStock: number;
  costValue: number;
  sellingValue: number;
  profitMargin: number;
  movementHistory: InventoryMovement[];
  wastage: number;
  category: string;
}

export interface InventoryReportData {
  totalStockValue: number;
  totalPotentialRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  averageMargin: number;
  fastMoving: KeyPerformanceMetrics[];
  slowMoving: KeyPerformanceMetrics[];
  stockAlerts: {
    lowStock: KeyInventoryItem[];
    outOfStock: KeyInventoryItem[];
  };
  categoryBreakdown: {
    [category: string]: {
      quantity: number;
      value: number;
      sales: number;
    };
  };
  paymentMethods: {
    cash: number;
    card: number;
    payLater: number;
  };
}

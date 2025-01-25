import {
  StockOperation,
  StockIntake,
  StockAdjustment,
  StockTransfer,
  AdjustmentReason,
  ReorderSuggestion
} from '../models/KeyInventory';
import { keyInventoryService } from './KeyInventoryService';
import { getStorageItem, setStorageItem } from '../utils/storage';

const STORAGE_KEYS = {
  OPERATIONS: 'stock_operations',
} as const;

class StockOperationsService {
  private static instance: StockOperationsService;
  private operations: Map<string, StockOperation>;
  private readonly REORDER_THRESHOLD = 0.8; // 80% of reorder point triggers suggestion
  private readonly SALES_HISTORY_DAYS = 30; // Days to consider for sales velocity

  private constructor() {
    this.operations = new Map(
      Object.entries(getStorageItem<Record<string, StockOperation>>(STORAGE_KEYS.OPERATIONS, {}))
    );
  }

  static getInstance(): StockOperationsService {
    if (!StockOperationsService.instance) {
      StockOperationsService.instance = new StockOperationsService();
    }
    return StockOperationsService.instance;
  }

  private persistOperations(): void {
    const operationsObject = Object.fromEntries(this.operations);
    setStorageItem(STORAGE_KEYS.OPERATIONS, operationsObject);
  }

  async createIntake(data: Omit<StockIntake, 'id' | 'date' | 'type'>): Promise<StockIntake> {
    const id = crypto.randomUUID();
    const operation: StockIntake = {
      id,
      type: 'INTAKE',
      date: new Date().toISOString(),
      ...data
    };

    await this.processOperation(operation);
    this.operations.set(id, operation);
    this.persistOperations();
    return operation;
  }

  async adjustStock(
    keyId: string,
    quantity: number,
    reason: AdjustmentReason,
    performedBy: string,
    notes?: string
  ): Promise<StockAdjustment> {
    const key = keyInventoryService.getKey(keyId);
    if (!key) throw new Error('Key not found');

    const adjustment: StockAdjustment = {
      id: crypto.randomUUID(),
      keyId,
      type: 'ADJUSTMENT',
      quantity,
      reason,
      date: new Date().toISOString(),
      performedBy,
      notes,
      costImpact: quantity * key.costPrice
    };

    await this.processOperation(adjustment);
    this.operations.set(adjustment.id, adjustment);
    this.persistOperations();
    return adjustment;
  }

  async initiateTransfer(
    keyId: string,
    quantity: number,
    fromLocationId: string,
    toLocationId: string,
    performedBy: string
  ): Promise<StockTransfer> {
    const transfer: StockTransfer = {
      id: crypto.randomUUID(),
      keyId,
      type: 'TRANSFER',
      quantity,
      fromLocationId,
      toLocationId,
      status: 'PENDING',
      date: new Date().toISOString(),
      performedBy
    };

    this.operations.set(transfer.id, transfer);
    this.persistOperations();
    return transfer;
  }

  async updateTransferStatus(
    transferId: string,
    status: StockTransfer['status']
  ): Promise<StockTransfer> {
    const transfer = this.operations.get(transferId) as StockTransfer;
    if (!transfer || transfer.type !== 'TRANSFER') {
      throw new Error('Transfer not found');
    }

    const updatedTransfer: StockTransfer = {
      ...transfer,
      status
    };

    if (status === 'COMPLETED') {
      await this.processOperation(updatedTransfer);
    }

    this.operations.set(transferId, updatedTransfer);
    this.persistOperations();
    return updatedTransfer;
  }

  private async processOperation(operation: StockOperation): Promise<void> {
    const key = keyInventoryService.getKey(operation.keyId);
    if (!key) throw new Error('Key not found');

    switch (operation.type) {
      case 'INTAKE':
        await keyInventoryService.updateStock(operation.keyId, operation.quantity);
        break;
      case 'ADJUSTMENT':
        await keyInventoryService.updateStock(operation.keyId, operation.quantity);
        break;
      case 'TRANSFER':
        if (operation.status === 'COMPLETED') {
          // Deduct from source location
          await keyInventoryService.updateStock(operation.keyId, -operation.quantity);
          // Add to destination location (you might want to implement location-specific stock tracking)
          // await locationService.updateStock(operation.toLocationId, operation.keyId, operation.quantity);
        }
        break;
    }
  }

  generateReorderSuggestions(): ReorderSuggestion[] {
    const suggestions: ReorderSuggestion[] = [];
    const keys = keyInventoryService.getAllKeys();

    for (const key of keys) {
      const salesVelocity = this.calculateSalesVelocity(key.id);
      const daysUntilReorder = (key.currentStock - key.reorderPoint) / salesVelocity;
      
      if (key.currentStock <= key.reorderPoint * this.REORDER_THRESHOLD) {
        const suggestedQuantity = Math.ceil(salesVelocity * 30); // 30 days supply

        suggestions.push({
          keyId: key.id,
          currentStock: key.currentStock,
          suggestedQuantity,
          estimatedCost: suggestedQuantity * key.costPrice,
          supplierId: key.supplierId,
          priority: this.calculatePriority(key.currentStock, key.reorderPoint),
          reason: `Current stock (${key.currentStock}) below reorder threshold. ${daysUntilReorder.toFixed(1)} days of stock remaining.`
        });
      }
    }

    return suggestions.sort((a, b) => 
      this.priorityValue(b.priority) - this.priorityValue(a.priority)
    );
  }

  private calculateSalesVelocity(keyId: string): number {
    const operations = Array.from(this.operations.values());
    const recentSales = operations.filter(op => 
      op.keyId === keyId &&
      op.type === 'SALE' &&
      new Date(op.date) >= new Date(Date.now() - this.SALES_HISTORY_DAYS * 24 * 60 * 60 * 1000)
    );

    if (recentSales.length === 0) return 1; // Default to 1 unit per day if no sales history

    const totalSold = recentSales.reduce((sum, sale) => sum + Math.abs(sale.quantity), 0);
    return totalSold / this.SALES_HISTORY_DAYS;
  }

  private calculatePriority(currentStock: number, reorderPoint: number): ReorderSuggestion['priority'] {
    const ratio = currentStock / reorderPoint;
    if (ratio <= 0.3) return 'HIGH';
    if (ratio <= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private priorityValue(priority: ReorderSuggestion['priority']): number {
    switch (priority) {
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
    }
  }

  getOperationHistory(keyId?: string, type?: StockOperation['type']): StockOperation[] {
    const operations = Array.from(this.operations.values());
    return operations.filter(op => 
      (!keyId || op.keyId === keyId) &&
      (!type || op.type === type)
    );
  }

  getOperationsByKeyId(keyId: string): StockOperation[] {
    return Array.from(this.operations.values())
      .filter(op => {
        if (op.type === 'TRANSFER') {
          return op.keyId === keyId;
        }
        return op.keyId === keyId;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getAllOperations(): StockOperation[] {
    return Array.from(this.operations.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}

export const stockOperationsService = StockOperationsService.getInstance();

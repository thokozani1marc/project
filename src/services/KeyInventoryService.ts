import { KeyInventoryItem, StockAlert, Supplier, CartReservation, SalesHistory } from '../models/KeyInventory';
import { getStorageItem, setStorageItem } from '../utils/storage';

const STORAGE_KEYS = {
  KEYS: 'keys',
  SUPPLIERS: 'suppliers',
  CART_RESERVATIONS: 'cartReservations',
  SALES_HISTORY: 'salesHistory'
} as const;

class KeyInventoryService {
  private static instance: KeyInventoryService;
  private keys: Map<string, KeyInventoryItem>;
  private suppliers: Map<string, Supplier>;
  private cartReservations: Map<string, CartReservation>;
  private salesHistory: Map<string, SalesHistory>;

  private constructor() {
    this.keys = new Map(
      Object.entries(getStorageItem<Record<string, KeyInventoryItem>>(STORAGE_KEYS.KEYS, {}))
    );
    this.suppliers = new Map(
      Object.entries(getStorageItem<Record<string, Supplier>>(STORAGE_KEYS.SUPPLIERS, {}))
    );
    this.cartReservations = new Map(
      Object.entries(getStorageItem<Record<string, CartReservation>>(STORAGE_KEYS.CART_RESERVATIONS, {}))
    );
    this.salesHistory = new Map(
      Object.entries(getStorageItem<Record<string, SalesHistory>>(STORAGE_KEYS.SALES_HISTORY, {}))
    );
  }

  static getInstance(): KeyInventoryService {
    if (!KeyInventoryService.instance) {
      KeyInventoryService.instance = new KeyInventoryService();
    }
    return KeyInventoryService.instance;
  }

  private persistKeys(): void {
    const keysObject = Object.fromEntries(this.keys);
    setStorageItem(STORAGE_KEYS.KEYS, keysObject);
  }

  private persistSuppliers(): void {
    const suppliersObject = Object.fromEntries(this.suppliers);
    setStorageItem(STORAGE_KEYS.SUPPLIERS, suppliersObject);
  }

  private persistCartReservations(): void {
    const reservationsObject = Object.fromEntries(this.cartReservations);
    setStorageItem(STORAGE_KEYS.CART_RESERVATIONS, reservationsObject);
  }

  private persistSalesHistory(): void {
    const historyObject = Object.fromEntries(this.salesHistory);
    setStorageItem(STORAGE_KEYS.SALES_HISTORY, historyObject);
  }

  addKey(key: Omit<KeyInventoryItem, 'id' | 'createdAt' | 'updatedAt'>): KeyInventoryItem {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const newKey: KeyInventoryItem = {
      ...key,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.keys.set(id, newKey);
    this.persistKeys();
    return newKey;
  }

  updateKey(id: string, key: Partial<KeyInventoryItem>): KeyInventoryItem {
    const existingKey = this.keys.get(id);
    if (!existingKey) {
      throw new Error('Key not found');
    }

    const updatedKey: KeyInventoryItem = {
      ...existingKey,
      ...key,
      updatedAt: new Date().toISOString(),
    };
    this.keys.set(id, updatedKey);
    this.persistKeys();
    return updatedKey;
  }

  deleteKey(id: string): boolean {
    const deleted = this.keys.delete(id);
    if (deleted) {
      this.persistKeys();
    }
    return deleted;
  }

  getKey(id: string): KeyInventoryItem | undefined {
    return this.keys.get(id);
  }

  getAllKeys(): KeyInventoryItem[] {
    return Array.from(this.keys.values());
  }

  updateStock(id: string, quantity: number): KeyInventoryItem {
    const key = this.keys.get(id);
    if (!key) {
      throw new Error('Key not found');
    }

    const updatedKey = this.updateKey(id, {
      currentStock: key.currentStock + quantity,
    });

    this.checkStockAlert(updatedKey);
    return updatedKey;
  }

  private checkStockAlert(key: KeyInventoryItem): StockAlert | null {
    let status: StockAlert['status'] | null = null;

    if (key.currentStock === 0) {
      status = 'OUT_OF_STOCK';
    } else if (key.currentStock <= key.reorderPoint * 0.5) {
      status = 'CRITICAL';
    } else if (key.currentStock <= key.reorderPoint) {
      status = 'LOW';
    }

    if (status) {
      const alert: StockAlert = {
        keyId: key.id,
        currentStock: key.currentStock,
        reorderPoint: key.reorderPoint,
        status,
      };
      this.handleStockAlert(alert);
      return alert;
    }

    return null;
  }

  private handleStockAlert(alert: StockAlert): void {
    // TODO: Implement notification system (email, UI alert, etc.)
    console.warn('Stock Alert:', alert);
  }

  // Supplier management
  addSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
    const id = crypto.randomUUID();
    const newSupplier: Supplier = { ...supplier, id };
    this.suppliers.set(id, newSupplier);
    this.persistSuppliers();
    return newSupplier;
  }

  getSupplier(id: string): Supplier | undefined {
    return this.suppliers.get(id);
  }

  getAllSuppliers(): Supplier[] {
    return Array.from(this.suppliers.values());
  }

  // Analytics and reporting
  getKeysBySupplier(supplierId: string): KeyInventoryItem[] {
    return this.getAllKeys().filter(key => key.supplierId === supplierId);
  }

  getLowStockKeys(): KeyInventoryItem[] {
    return this.getAllKeys().filter(key => key.currentStock <= key.reorderPoint);
  }

  calculateInventoryValue(): { total: number; byKey: Record<string, number> } {
    const byKey: Record<string, number> = {};
    let total = 0;

    this.getAllKeys().forEach(key => {
      const value = key.currentStock * key.costPrice;
      byKey[key.id] = value;
      total += value;
    });

    return { total, byKey };
  }

  // Cart Reservation Methods
  createCartReservation(keyId: string, quantity: number, cartId: string): CartReservation {
    const key = this.getKey(keyId);
    if (!key) throw new Error('Key not found');
    
    const availableStock = this.getAvailableStock(keyId);
    if (availableStock < quantity) throw new Error('Insufficient stock');

    const reservation: CartReservation = {
      id: crypto.randomUUID(),
      keyId,
      quantity,
      cartId,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(), // 30 minutes
      status: 'ACTIVE'
    };

    this.cartReservations.set(reservation.id, reservation);
    this.persistCartReservations();
    return reservation;
  }

  cancelCartReservation(reservationId: string): boolean {
    const reservation = this.cartReservations.get(reservationId);
    if (!reservation) return false;

    reservation.status = 'CANCELLED';
    this.cartReservations.set(reservationId, reservation);
    this.persistCartReservations();
    return true;
  }

  completeCartReservation(reservationId: string): boolean {
    const reservation = this.cartReservations.get(reservationId);
    if (!reservation) return false;

    reservation.status = 'COMPLETED';
    this.cartReservations.set(reservationId, reservation);
    this.persistCartReservations();
    return true;
  }

  getAvailableStock(keyId: string): number {
    const key = this.getKey(keyId);
    if (!key) return 0;

    const activeReservations = Array.from(this.cartReservations.values())
      .filter(r => r.keyId === keyId && r.status === 'ACTIVE')
      .reduce((total, r) => total + r.quantity, 0);

    return key.currentStock - activeReservations;
  }

  // Sales History Methods
  recordSale(keyId: string, quantity: number, unitPrice: number): void {
    let history = this.salesHistory.get(keyId);
    const date = new Date().toISOString().split('T')[0];

    if (!history) {
      history = {
        keyId,
        totalQuantitySold: 0,
        totalRevenue: 0,
        averagePrice: 0,
        lastSaleDate: date,
        salesByPeriod: {
          daily: {},
          weekly: {},
          monthly: {}
        }
      };
    }

    // Update totals
    history.totalQuantitySold += quantity;
    history.totalRevenue += quantity * unitPrice;
    history.averagePrice = history.totalRevenue / history.totalQuantitySold;
    history.lastSaleDate = date;

    // Update daily sales
    history.salesByPeriod.daily[date] = (history.salesByPeriod.daily[date] || 0) + quantity;

    // Update weekly and monthly
    const week = this.getWeekNumber(new Date());
    const month = date.substring(0, 7);
    history.salesByPeriod.weekly[week] = (history.salesByPeriod.weekly[week] || 0) + quantity;
    history.salesByPeriod.monthly[month] = (history.salesByPeriod.monthly[month] || 0) + quantity;

    this.salesHistory.set(keyId, history);
    this.persistSalesHistory();
  }

  private getWeekNumber(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  getSalesHistory(keyId: string): SalesHistory | undefined {
    return this.salesHistory.get(keyId);
  }
}

export const keyInventoryService = KeyInventoryService.getInstance();

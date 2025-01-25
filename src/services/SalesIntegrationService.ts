import { 
  CartReservation, 
  KeySale, 
  SalesHistory 
} from '../models/KeyInventory';
import { keyInventoryService } from './KeyInventoryService';
import { stockOperationsService } from './StockOperationsService';

class SalesIntegrationService {
  private static instance: SalesIntegrationService;
  private reservations: Map<string, CartReservation> = new Map();
  private salesHistory: Map<string, SalesHistory> = new Map();
  private readonly RESERVATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    // Start reservation cleanup interval
    setInterval(() => this.cleanupExpiredReservations(), 5 * 60 * 1000);
  }

  static getInstance(): SalesIntegrationService {
    if (!SalesIntegrationService.instance) {
      SalesIntegrationService.instance = new SalesIntegrationService();
    }
    return SalesIntegrationService.instance;
  }

  // Cart Reservations
  async reserveKey(keyId: string, quantity: number, cartId: string): Promise<CartReservation> {
    const key = keyInventoryService.getKey(keyId);
    if (!key) throw new Error('Key not found');

    const availableStock = await this.getAvailableStock(keyId);
    if (availableStock < quantity) {
      throw new Error(`Insufficient stock. Only ${availableStock} available`);
    }

    const reservation: CartReservation = {
      id: crypto.randomUUID(),
      keyId,
      quantity,
      cartId,
      expiresAt: new Date(Date.now() + this.RESERVATION_TIMEOUT).toISOString(),
      status: 'ACTIVE'
    };

    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  async updateReservation(
    reservationId: string, 
    quantity?: number, 
    status?: CartReservation['status']
  ): Promise<CartReservation> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) throw new Error('Reservation not found');

    if (quantity !== undefined) {
      const availableStock = await this.getAvailableStock(reservation.keyId, reservationId);
      if (availableStock < quantity) {
        throw new Error(`Insufficient stock. Only ${availableStock} available`);
      }
      reservation.quantity = quantity;
    }

    if (status) {
      reservation.status = status;
    }

    this.reservations.set(reservationId, reservation);
    return reservation;
  }

  // Sales Processing
  async processSale(
    keyId: string,
    quantity: number,
    orderId: string,
    customerId: string,
    reservationId?: string
  ): Promise<KeySale> {
    const key = keyInventoryService.getKey(keyId);
    if (!key) throw new Error('Key not found');

    // Verify stock availability
    const availableStock = await this.getAvailableStock(keyId, reservationId);
    if (availableStock < quantity) {
      throw new Error(`Insufficient stock. Only ${availableStock} available`);
    }

    // Complete reservation if exists
    if (reservationId) {
      await this.updateReservation(reservationId, undefined, 'COMPLETED');
    }

    // Create sale record
    const sale: KeySale = {
      id: crypto.randomUUID(),
      keyId,
      type: 'SALE',
      quantity: -quantity, // Negative quantity for sales
      date: new Date().toISOString(),
      performedBy: customerId,
      orderId,
      customerId,
      unitPrice: key.sellingPrice,
      reservationId
    };

    // Process the sale through stock operations
    await stockOperationsService.processOperation(sale);
    
    // Update sales history
    await this.updateSalesHistory(keyId, quantity, key.sellingPrice);

    return sale;
  }

  // Stock Availability
  private async getAvailableStock(keyId: string, excludeReservationId?: string): Promise<number> {
    const key = keyInventoryService.getKey(keyId);
    if (!key) throw new Error('Key not found');

    const reservedQuantity = Array.from(this.reservations.values())
      .filter(r => 
        r.keyId === keyId && 
        r.status === 'ACTIVE' &&
        r.id !== excludeReservationId
      )
      .reduce((total, r) => total + r.quantity, 0);

    return key.currentStock - reservedQuantity;
  }

  // Reservation Cleanup
  private async cleanupExpiredReservations(): Promise<void> {
    const now = new Date();
    for (const [id, reservation] of this.reservations) {
      if (
        reservation.status === 'ACTIVE' &&
        new Date(reservation.expiresAt) <= now
      ) {
        await this.updateReservation(id, undefined, 'EXPIRED');
      }
    }
  }

  // Sales History
  private async updateSalesHistory(
    keyId: string,
    quantity: number,
    unitPrice: number
  ): Promise<void> {
    const existing = this.salesHistory.get(keyId) || {
      keyId,
      totalQuantitySold: 0,
      totalRevenue: 0,
      averagePrice: 0,
      lastSaleDate: new Date().toISOString(),
      salesByPeriod: {
        daily: {},
        weekly: {},
        monthly: {}
      }
    };

    const revenue = quantity * unitPrice;
    const today = new Date().toISOString().split('T')[0];
    const week = this.getWeekNumber(new Date());
    const month = new Date().toISOString().slice(0, 7);

    // Update totals
    existing.totalQuantitySold += quantity;
    existing.totalRevenue += revenue;
    existing.averagePrice = existing.totalRevenue / existing.totalQuantitySold;
    existing.lastSaleDate = new Date().toISOString();

    // Update period data
    existing.salesByPeriod.daily[today] = (existing.salesByPeriod.daily[today] || 0) + quantity;
    existing.salesByPeriod.weekly[week] = (existing.salesByPeriod.weekly[week] || 0) + quantity;
    existing.salesByPeriod.monthly[month] = (existing.salesByPeriod.monthly[month] || 0) + quantity;

    this.salesHistory.set(keyId, existing);
  }

  // Utility
  private getWeekNumber(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  // Public Getters
  getReservation(reservationId: string): CartReservation | undefined {
    return this.reservations.get(reservationId);
  }

  getActiveReservations(cartId?: string): CartReservation[] {
    return Array.from(this.reservations.values())
      .filter(r => 
        r.status === 'ACTIVE' &&
        (!cartId || r.cartId === cartId)
      );
  }

  getSalesHistory(keyId: string): SalesHistory | undefined {
    return this.salesHistory.get(keyId);
  }

  async checkAvailability(keyId: string): Promise<{
    available: boolean;
    currentStock: number;
    reservedQuantity: number;
    availableQuantity: number;
  }> {
    const key = keyInventoryService.getKey(keyId);
    if (!key) throw new Error('Key not found');

    const availableStock = await this.getAvailableStock(keyId);
    const reservedQuantity = key.currentStock - availableStock;

    return {
      available: availableStock > 0,
      currentStock: key.currentStock,
      reservedQuantity,
      availableQuantity: availableStock
    };
  }
}

export const salesIntegrationService = SalesIntegrationService.getInstance();

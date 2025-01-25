import { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

interface CartReservation {
  id: string;
  keyId: string;
  quantity: number;
  cartId: string;
  expiresAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
}

interface Key {
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
}

interface CartItem {
  keyId: string;
  quantity: number;
  key: Key;
  reservationId: string;
}

export function useLocalCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cartId = localStorage.getItem('cartId') || crypto.randomUUID();

  useEffect(() => {
    localStorage.setItem('cartId', cartId);
    loadCart();
    
    // Cleanup expired reservations on mount
    cleanupExpiredReservations();

    const interval = setInterval(cleanupExpiredReservations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function loadCart() {
    try {
      const reservations = getStorageItem<CartReservation[]>('cart_reservations', []);
      const keys = getStorageItem<Key[]>('keys', []);

      const activeItems = reservations
        .filter(r => r.cartId === cartId && r.status === 'ACTIVE')
        .map(r => ({
          keyId: r.keyId,
          quantity: r.quantity,
          key: keys.find(k => k.id === r.keyId)!,
          reservationId: r.id
        }))
        .filter(item => item.key); // Only include items where key exists

      setCartItems(activeItems);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(keyId: string, quantity: number) {
    try {
      const keys = getStorageItem<Key[]>('keys', []);
      const key = keys.find(k => k.id === keyId);
      if (!key) throw new Error('Key not found');

      const reservations = getStorageItem<CartReservation[]>('cart_reservations', []);
      const activeReservations = reservations.filter(r => 
        r.keyId === keyId && 
        r.status === 'ACTIVE'
      );

      const totalReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

      if (key.current_stock - totalReserved < quantity) {
        throw new Error('Not enough stock available');
      }

      const reservation: CartReservation = {
        id: crypto.randomUUID(),
        keyId,
        quantity,
        cartId,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      setStorageItem('cart_reservations', [...reservations, reservation]);

      setCartItems(prev => [...prev, {
        keyId,
        quantity,
        key,
        reservationId: reservation.id
      }]);

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  }

  function removeFromCart(reservationId: string) {
    try {
      const reservations = getStorageItem<CartReservation[]>('cart_reservations', []);
      const updatedReservations = reservations.map(r => 
        r.id === reservationId ? { ...r, status: 'CANCELLED' } : r
      );

      setStorageItem('cart_reservations', updatedReservations);
      setCartItems(prev => prev.filter(item => item.reservationId !== reservationId));
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  }

  function updateQuantity(reservationId: string, newQuantity: number) {
    try {
      const item = cartItems.find(i => i.reservationId === reservationId);
      if (!item) return false;

      const keys = getStorageItem<Key[]>('keys', []);
      const key = keys.find(k => k.id === item.keyId);
      if (!key) return false;

      const reservations = getStorageItem<CartReservation[]>('cart_reservations', []);
      const activeReservations = reservations.filter(r => 
        r.keyId === item.keyId && 
        r.status === 'ACTIVE' &&
        r.id !== reservationId
      );

      const totalReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

      if (key.current_stock - totalReserved < newQuantity) {
        throw new Error('Not enough stock available');
      }

      const updatedReservations = reservations.map(r => 
        r.id === reservationId ? { ...r, quantity: newQuantity } : r
      );

      setStorageItem('cart_reservations', updatedReservations);
      setCartItems(prev => prev.map(item => 
        item.reservationId === reservationId
          ? { ...item, quantity: newQuantity }
          : item
      ));

      return true;
    } catch (error) {
      console.error('Error updating cart:', error);
      return false;
    }
  }

  function cleanupExpiredReservations() {
    try {
      const now = new Date();
      const reservations = getStorageItem<CartReservation[]>('cart_reservations', []);
      
      const updatedReservations = reservations.map(r => 
        r.status === 'ACTIVE' && new Date(r.expiresAt) <= now
          ? { ...r, status: 'EXPIRED' }
          : r
      );

      setStorageItem('cart_reservations', updatedReservations);
      loadCart(); // Reload cart to remove expired items
    } catch (error) {
      console.error('Error cleaning up reservations:', error);
    }
  }

  return {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    cartId
  };
}

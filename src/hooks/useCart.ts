import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { message } from 'antd';

type CartReservation = Database['public']['Tables']['cart_reservations']['Row'];
type Key = Database['public']['Tables']['keys']['Row'];

interface CartItem {
  keyId: string;
  quantity: number;
  key: Key;
  reservationId: string;
}

export function useCart() {
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

  async function loadCart() {
    try {
      const { data: reservations, error } = await supabase
        .from('cart_reservations')
        .select('*, key:keys(*)')
        .eq('cart_id', cartId)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      setCartItems(
        (reservations || []).map((r: any) => ({
          keyId: r.key_id,
          quantity: r.quantity,
          key: r.key,
          reservationId: r.id
        }))
      );
    } catch (error) {
      console.error('Error loading cart:', error);
      message.error('Error loading cart');
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(keyId: string, quantity: number) {
    try {
      // Check current stock
      const { data: key, error: keyError } = await supabase
        .from('keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (keyError) throw keyError;

      // Check existing reservations
      const { data: existingReservations, error: reservationError } = await supabase
        .from('cart_reservations')
        .select('quantity')
        .eq('key_id', keyId)
        .eq('status', 'ACTIVE');

      if (reservationError) throw reservationError;

      const totalReserved = (existingReservations || [])
        .reduce((sum, r) => sum + r.quantity, 0);

      if (key.current_stock - totalReserved < quantity) {
        message.error('Not enough stock available');
        return;
      }

      // Create reservation
      const { data: reservation, error } = await supabase
        .from('cart_reservations')
        .insert([{
          key_id: keyId,
          quantity,
          cart_id: cartId,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }])
        .select('*')
        .single();

      if (error) throw error;

      // Add to local cart
      setCartItems(prev => [...prev, {
        keyId,
        quantity,
        key,
        reservationId: reservation.id
      }]);

      message.success('Added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      message.error('Error adding to cart');
    }
  }

  async function removeFromCart(reservationId: string) {
    try {
      const { error } = await supabase
        .from('cart_reservations')
        .update({ status: 'CANCELLED' })
        .eq('id', reservationId);

      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.reservationId !== reservationId));
      message.success('Removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      message.error('Error removing from cart');
    }
  }

  async function updateQuantity(reservationId: string, newQuantity: number) {
    try {
      const item = cartItems.find(i => i.reservationId === reservationId);
      if (!item) return;

      // Check stock availability
      const { data: key, error: keyError } = await supabase
        .from('keys')
        .select('*')
        .eq('id', item.keyId)
        .single();

      if (keyError) throw keyError;

      const { data: existingReservations, error: reservationError } = await supabase
        .from('cart_reservations')
        .select('quantity')
        .eq('key_id', item.keyId)
        .eq('status', 'ACTIVE')
        .neq('id', reservationId);

      if (reservationError) throw reservationError;

      const totalReserved = (existingReservations || [])
        .reduce((sum, r) => sum + r.quantity, 0);

      if (key.current_stock - totalReserved < newQuantity) {
        message.error('Not enough stock available');
        return;
      }

      // Update reservation
      const { error } = await supabase
        .from('cart_reservations')
        .update({ quantity: newQuantity })
        .eq('id', reservationId);

      if (error) throw error;

      setCartItems(prev => prev.map(item => 
        item.reservationId === reservationId
          ? { ...item, quantity: newQuantity }
          : item
      ));

      message.success('Cart updated');
    } catch (error) {
      console.error('Error updating cart:', error);
      message.error('Error updating cart');
    }
  }

  async function cleanupExpiredReservations() {
    try {
      const { error } = await supabase
        .from('cart_reservations')
        .update({ status: 'EXPIRED' })
        .eq('status', 'ACTIVE')
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;

      // Reload cart to remove expired items
      loadCart();
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

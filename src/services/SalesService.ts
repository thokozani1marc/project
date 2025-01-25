import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type StockOperation = Database['public']['Tables']['stock_operations']['Row'];
type SalesHistory = Database['public']['Tables']['sales_history']['Row'];

export class SalesService {
  private static instance: SalesService;

  private constructor() {}

  static getInstance(): SalesService {
    if (!SalesService.instance) {
      SalesService.instance = new SalesService();
    }
    return SalesService.instance;
  }

  async processSale(
    items: Array<{ keyId: string; quantity: number; reservationId?: string }>,
    orderId: string,
    customerId: string
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      // Start a Supabase transaction
      const { error: txError } = await supabase.rpc('begin_transaction');
      if (txError) throw txError;

      try {
        // Process each item
        for (const item of items) {
          // Get current key data
          const { data: key, error: keyError } = await supabase
            .from('keys')
            .select('*')
            .eq('id', item.keyId)
            .single();
          
          if (keyError) throw keyError;

          // Verify stock availability
          if (key.current_stock < item.quantity) {
            throw new Error(`Insufficient stock for key: ${key.name}`);
          }

          // Create sale operation
          const { error: saleError } = await supabase
            .from('stock_operations')
            .insert([{
              key_id: item.keyId,
              type: 'SALE',
              quantity: -item.quantity, // Negative for sales
              date: new Date().toISOString(),
              performed_by: user.id,
              order_id: orderId,
              customer_id: customerId,
              unit_price: key.selling_price
            }]);

          if (saleError) throw saleError;

          // Update key stock
          const { error: updateError } = await supabase
            .from('keys')
            .update({ 
              current_stock: key.current_stock - item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.keyId);

          if (updateError) throw updateError;

          // Complete reservation if exists
          if (item.reservationId) {
            const { error: reservationError } = await supabase
              .from('cart_reservations')
              .update({ status: 'COMPLETED' })
              .eq('id', item.reservationId);

            if (reservationError) throw reservationError;
          }

          // Update sales history
          await this.updateSalesHistory(
            item.keyId,
            item.quantity,
            key.selling_price
          );
        }

        // Commit transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) throw commitError;

      } catch (error) {
        // Rollback on any error
        await supabase.rpc('rollback_transaction');
        throw error;
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      throw error;
    }
  }

  private async updateSalesHistory(
    keyId: string,
    quantity: number,
    unitPrice: number
  ) {
    const revenue = quantity * unitPrice;
    const today = new Date().toISOString().split('T')[0];
    const week = this.getWeekNumber(new Date());
    const month = new Date().toISOString().slice(0, 7);

    // Get or create sales history
    const { data: existing, error: fetchError } = await supabase
      .from('sales_history')
      .select('*')
      .eq('key_id', keyId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw fetchError;
    }

    if (existing) {
      // Update existing record
      const dailySales = { ...existing.daily_sales, [today]: (existing.daily_sales[today] || 0) + quantity };
      const weeklySales = { ...existing.weekly_sales, [week]: (existing.weekly_sales[week] || 0) + quantity };
      const monthlySales = { ...existing.monthly_sales, [month]: (existing.monthly_sales[month] || 0) + quantity };

      const { error: updateError } = await supabase
        .from('sales_history')
        .update({
          total_quantity: existing.total_quantity + quantity,
          total_revenue: existing.total_revenue + revenue,
          average_price: (existing.total_revenue + revenue) / (existing.total_quantity + quantity),
          last_sale_date: new Date().toISOString(),
          daily_sales: dailySales,
          weekly_sales: weeklySales,
          monthly_sales: monthlySales,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('sales_history')
        .insert([{
          key_id: keyId,
          total_quantity: quantity,
          total_revenue: revenue,
          average_price: unitPrice,
          last_sale_date: new Date().toISOString(),
          daily_sales: { [today]: quantity },
          weekly_sales: { [week]: quantity },
          monthly_sales: { [month]: quantity }
        }]);

      if (insertError) throw insertError;
    }
  }

  private getWeekNumber(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  async getSalesHistory(keyId: string) {
    const { data, error } = await supabase
      .from('sales_history')
      .select('*')
      .eq('key_id', keyId)
      .single();

    if (error) throw error;
    return data;
  }

  async getTopSellingKeys(limit = 10) {
    const { data, error } = await supabase
      .from('sales_history')
      .select('*, key:keys(*)')
      .order('total_quantity', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}

export const salesService = SalesService.getInstance();

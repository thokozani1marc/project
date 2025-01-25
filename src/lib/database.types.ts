export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      keys: {
        Row: {
          id: string
          name: string
          type: string
          brand: string
          material: string
          current_stock: number
          reorder_point: number
          cost_price: number
          selling_price: number
          supplier_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          brand: string
          material: string
          current_stock: number
          reorder_point: number
          cost_price: number
          selling_price: number
          supplier_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          brand?: string
          material?: string
          current_stock?: number
          reorder_point?: number
          cost_price?: number
          selling_price?: number
          supplier_id?: string
          updated_at?: string
        }
      }
      stock_operations: {
        Row: {
          id: string
          key_id: string
          type: 'INTAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'SALE'
          quantity: number
          date: string
          performed_by: string
          notes?: string
          reason?: string
          cost_impact?: number
          from_location_id?: string
          to_location_id?: string
          transfer_status?: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
          order_id?: string
          customer_id?: string
          unit_price?: number
          created_at: string
        }
        Insert: {
          id?: string
          key_id: string
          type: 'INTAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'SALE'
          quantity: number
          date: string
          performed_by: string
          notes?: string
          reason?: string
          cost_impact?: number
          from_location_id?: string
          to_location_id?: string
          transfer_status?: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
          order_id?: string
          customer_id?: string
          unit_price?: number
          created_at?: string
        }
        Update: {
          key_id?: string
          type?: 'INTAKE' | 'ADJUSTMENT' | 'TRANSFER' | 'SALE'
          quantity?: number
          date?: string
          performed_by?: string
          notes?: string
          reason?: string
          cost_impact?: number
          from_location_id?: string
          to_location_id?: string
          transfer_status?: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
          order_id?: string
          customer_id?: string
          unit_price?: number
        }
      }
      cart_reservations: {
        Row: {
          id: string
          key_id: string
          quantity: number
          cart_id: string
          expires_at: string
          status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
          created_at: string
        }
        Insert: {
          id?: string
          key_id: string
          quantity: number
          cart_id: string
          expires_at: string
          status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
          created_at?: string
        }
        Update: {
          key_id?: string
          quantity?: number
          cart_id?: string
          expires_at?: string
          status?: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
        }
      }
      sales_history: {
        Row: {
          id: string
          key_id: string
          total_quantity: number
          total_revenue: number
          average_price: number
          last_sale_date: string
          daily_sales: Json
          weekly_sales: Json
          monthly_sales: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key_id: string
          total_quantity: number
          total_revenue: number
          average_price: number
          last_sale_date: string
          daily_sales: Json
          weekly_sales: Json
          monthly_sales: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          key_id?: string
          total_quantity?: number
          total_revenue?: number
          average_price?: number
          last_sale_date?: string
          daily_sales?: Json
          weekly_sales?: Json
          monthly_sales?: Json
          updated_at?: string
        }
      }
    }
  }
}

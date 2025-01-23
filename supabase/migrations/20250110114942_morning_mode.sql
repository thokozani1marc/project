/*
  # Initial Schema for Laundry POS System

  1. New Tables
    - `customers`
      - Basic customer information and authentication
    - `orders`
      - Order details and status tracking
    - `order_items`
      - Individual items within orders
    - `services`
      - Available laundry services
    - `notifications`
      - Customer notifications log

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  status text NOT NULL DEFAULT 'pending',
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  pickup_date timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'cancelled')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('cash', 'card', 'online'))
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  service_id uuid REFERENCES services(id),
  quantity int NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  order_id uuid REFERENCES orders(id),
  type text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT valid_type CHECK (type IN ('email', 'sms')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for customers
CREATE POLICY "Customers can view their own data"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policies for orders
CREATE POLICY "Customers can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Policies for order items
CREATE POLICY "Customers can view their order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT id FROM orders WHERE customer_id = auth.uid()
  ));

-- Policies for services
CREATE POLICY "Anyone can view services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for notifications
CREATE POLICY "Customers can view their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Insert some default services
INSERT INTO services (name, description, price) VALUES
  ('Wash & Fold', 'Regular wash and fold service per kg', 5.99),
  ('Dry Cleaning', 'Professional dry cleaning per piece', 12.99),
  ('Express Service', 'Same day service (additional fee)', 15.00),
  ('Ironing', 'Professional ironing per piece', 3.99),
  ('Stain Removal', 'Special stain removal treatment', 8.99)
ON CONFLICT DO NOTHING;
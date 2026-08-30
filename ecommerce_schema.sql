-- ==========================================
-- SMARTWASTE E-COMMERCE SCHEMA & SEED DATA
-- ==========================================
-- Please run this script in your Supabase SQL Editor.

-- 1. Products Catalog Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customer Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'shipped', 'delivered')) DEFAULT 'pending',
  shipping_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Order Line Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(10, 2) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Anyone can view products
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- Users can only view their own orders
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
-- Users can insert their own orders
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own order items
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
-- Users can insert order items
CREATE POLICY "Users can create order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- ==========================================
-- SEED DATA (Prices in Nigerian Naira ₦)
-- ==========================================
INSERT INTO products (name, description, price, image_url, stock_quantity) VALUES
(
  '75L Heavy Duty Dustbin', 
  'Durable, weather-resistant outdoor dustbin with secure lock lid. Ideal for residential waste collection.', 
  35000.00, 
  'https://images.unsplash.com/photo-1595278069441-2f29f6005e8f?auto=format&fit=crop&q=80&w=600', 
  100
),
(
  'Biodegradable Waste Bags (50 Pack)', 
  'Eco-friendly compostable waste bags. Perfect for organic waste and standard bins.', 
  8500.00, 
  'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600', 
  500
),
(
  'Premium Recycling Sorter Bin', 
  'Three-compartment indoor bin for separating glass, plastic, and paper efficiently.', 
  65000.00, 
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600', 
  50
),
(
  'Industrial Waste Packer', 
  'Heavy-duty manual waste compactor. Reduces waste volume by up to 60%.', 
  120000.00, 
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600', 
  25
);

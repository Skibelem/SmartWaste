-- ==========================================
-- PAYSTACK INTEGRATION SCHEMA UPDATE
-- ==========================================
-- Please run this script in your Supabase SQL Editor.

-- Add the payment_reference column to the orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;

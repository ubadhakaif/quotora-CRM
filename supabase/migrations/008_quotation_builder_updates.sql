-- ============================================================
-- 008 — Quotation Builder Updates Migration
-- Add address to customers, new document attachments, likely purchase type,
-- mode of purchase, and GPS tracking to quotations
-- ============================================================

-- ─── 1. Add Address to Customers ───
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS address TEXT;

-- ─── 2. Add Purchase & Document Fields to Quotations ───
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS likely_purchase TEXT CHECK (likely_purchase IN ('first_time', 'additional', 'replacement')),
  ADD COLUMN IF NOT EXISTS exchange_images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exchange_rc_copy TEXT,
  ADD COLUMN IF NOT EXISTS exchange_insurance TEXT,
  ADD COLUMN IF NOT EXISTS exchange_noc TEXT,
  ADD COLUMN IF NOT EXISTS mode_of_purchase TEXT CHECK (mode_of_purchase IN ('cash', 'loan', 'other')),
  ADD COLUMN IF NOT EXISTS mode_of_purchase_other TEXT,
  ADD COLUMN IF NOT EXISTS loan_aadhar_front TEXT,
  ADD COLUMN IF NOT EXISTS loan_aadhar_back TEXT,
  ADD COLUMN IF NOT EXISTS loan_pan_front TEXT,
  ADD COLUMN IF NOT EXISTS loan_pan_back TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);

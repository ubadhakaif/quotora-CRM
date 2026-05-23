-- Migration 013: Support for multiple fuel & transmission types on variants
-- And chosen fuel/transmission type selections on quotations

-- 1. UPGRADE VEHICLE VARIANTS FOR MULTIPLE SPECS
ALTER TABLE variants ADD COLUMN IF NOT EXISTS fuel_type_ids UUID[] DEFAULT '{}';
ALTER TABLE variants ADD COLUMN IF NOT EXISTS transmission_type_ids UUID[] DEFAULT '{}';

-- Migrate existing data into arrays
UPDATE variants 
SET fuel_type_ids = ARRAY[fuel_type_id] 
WHERE fuel_type_id IS NOT NULL;

UPDATE variants 
SET transmission_type_ids = ARRAY[transmission_type_id] 
WHERE transmission_type_id IS NOT NULL;

-- 2. UPGRADE QUOTATIONS FOR SELECTED SPECIFICATIONS
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS selected_fuel_type_id UUID REFERENCES fuel_types(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS selected_transmission_type_id UUID REFERENCES transmission_types(id) ON DELETE SET NULL;

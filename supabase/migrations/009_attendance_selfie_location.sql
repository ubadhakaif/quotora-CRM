-- Migration to add selfie picture and GPS location to employee check-in records
ALTER TABLE employee_attendance
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

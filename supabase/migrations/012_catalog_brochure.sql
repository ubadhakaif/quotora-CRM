-- ============================================================
-- Quotora Catalog Upgrade — PDF Brochure & Documents Storage Migration
-- Adds brochure_url capability to models and variants tables
-- and ensures the secure private 'documents' storage bucket exists.
-- ============================================================

-- ─── 1. UPGRADE VEHICLE MODELS SCHEMA ───
-- Add brochure_url text column to store PDF document signed URLs
ALTER TABLE models ADD COLUMN IF NOT EXISTS brochure_url TEXT;

-- ─── 2. UPGRADE VEHICLE VARIANTS SCHEMA ───
-- Add brochure_url text column to store variant-specific PDF brochure URLs
ALTER TABLE variants ADD COLUMN IF NOT EXISTS brochure_url TEXT;


-- ─── 3. CREATE SECURE PRIVATE DOCUMENTS STORAGE BUCKET AND POLICIES ───

-- Create the "documents" private bucket (50 MB limit, restricted to secure documents and images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'documents', 
  'documents', 
  false, -- private bucket!
  52428800, -- 50 MB limit in bytes
  ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/webp',
    'image/jpg'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the private "documents" bucket

-- 1. Authenticated Read Access: Only logged-in employees/admins can download/view quotation documents
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

-- 2. Authenticated Upload: Only logged-in employees/admins can upload quotation documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

-- 3. Authenticated Modify/Delete: Users can manage their own document uploads
DROP POLICY IF EXISTS "Users can update/delete their own documents" ON storage.objects;
CREATE POLICY "Users can update/delete their own documents" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'documents' AND auth.uid() = owner) WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner);

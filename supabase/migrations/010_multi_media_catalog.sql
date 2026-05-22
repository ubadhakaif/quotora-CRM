-- ─── 1. ADD MULTI-IMAGE AND VIDEO COLUMNS TO CATALOG TABLES ───

-- Models table additions
ALTER TABLE models ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE models ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Variants table additions
ALTER TABLE variants ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE variants ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Accessories table additions
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS video_url TEXT;

-- ─── 2. CREATE VIDEOS STORAGE BUCKET AND POLICIES ───

-- Create the "videos" public bucket (50 MB limit, restricted to video formats)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'videos', 
  'videos', 
  true, 
  52428800, -- 50 MB limit in bytes
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the "videos" bucket

-- 1. Public Read Access: Anyone can view catalog videos
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
CREATE POLICY "Videos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

-- 2. Authenticated Upload: Only logged-in employees/admins can upload videos
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

-- 3. Authenticated Modify/Delete: Users can manage their own video assets
DROP POLICY IF EXISTS "Users can update/delete their own videos" ON storage.objects;
CREATE POLICY "Users can update/delete their own videos" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'videos' AND auth.uid() = owner) WITH CHECK (bucket_id = 'videos' AND auth.uid() = owner);


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


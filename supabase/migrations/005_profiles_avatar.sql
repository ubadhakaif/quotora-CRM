-- ─── ADD avatar_url TO profiles ───
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

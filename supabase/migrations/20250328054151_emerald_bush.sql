/*
  # Storage Bucket and Policies Setup

  1. New Storage Bucket
    - Creates 'uploads' bucket for temporary file storage
    
  2. Security
    - Enables RLS on the bucket
    - Adds policies for:
      - Anonymous uploads (for non-authenticated users)
      - Authenticated user uploads
      - File downloads
      - File deletions (service role only)
*/

-- Create the uploads bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('uploads', 'uploads', false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anonymous uploads (needed for non-authenticated compression)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'uploads' AND
  (LOWER(storage.filename(name)) LIKE '%.pdf')
);

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (LOWER(storage.filename(name)) LIKE '%.pdf')
);

-- Allow downloading files from uploads bucket
CREATE POLICY "Allow file downloads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'uploads');

-- Allow service role to delete files
CREATE POLICY "Allow service role to delete files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'uploads');
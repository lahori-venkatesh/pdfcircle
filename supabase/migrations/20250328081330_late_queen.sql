/*
  # Storage Policies for PDF Compression
  
  1. Storage Bucket
    - Creates 'uploads' bucket for temporary file storage
    
  2. Security Policies
    - Enables RLS on storage objects
    - Controls file uploads and access
    - Implements automatic cleanup
*/

-- Create the uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow uploads for PDF files only
CREATE POLICY "Allow PDF uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (LOWER(storage.filename(name)) LIKE '%.pdf') AND
  (LENGTH(COALESCE(CAST(storage.foldername(name) AS text), '')) <= 50)
);

-- Allow temporary access to uploaded files
CREATE POLICY "Allow temporary file access"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'uploads' AND
  (LOWER(storage.filename(name)) LIKE '%.pdf') AND
  (created_at > (CURRENT_TIMESTAMP - INTERVAL '1 hour'))
);

-- Allow deletion of temporary files
CREATE POLICY "Allow temporary file cleanup"
ON storage.objects FOR DELETE
TO service_role
USING (
  bucket_id = 'uploads' AND
  (created_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour'))
);

-- Create extension for cron jobs if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to clean up old files
CREATE OR REPLACE FUNCTION storage.cleanup_old_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'uploads'
  AND created_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
END;
$$;

-- Create scheduled job for cleanup (runs every hour)
SELECT cron.schedule(
  'cleanup-uploads',
  '0 * * * *',  -- Every hour
  $$
  SELECT storage.cleanup_old_files();
  $$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
/*
  # Setup Storage and Fix RLS Policies

  1. Storage Setup
    - Create storage bucket for KYC documents
    - Configure bucket policies for secure access
    
  2. RLS Policy Fixes
    - Ensure admins can see all sellers
    - Fix visibility issues for KYC documents
    
  3. Security
    - Sellers can only access their own documents
    - Admins can access all documents
*/

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents bucket

-- Sellers can upload to their own folder
CREATE POLICY "Sellers can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Sellers can view their own documents
CREATE POLICY "Sellers can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Sellers can delete their own pending documents
CREATE POLICY "Sellers can delete own pending documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix users table RLS to ensure admins can see all sellers
DROP POLICY IF EXISTS "Admins can view all sellers" ON users;
CREATE POLICY "Admins can view all users"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Ensure admins can update user KYC status
DROP POLICY IF EXISTS "Admins can update KYC status" ON users;
CREATE POLICY "Admins can update users"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

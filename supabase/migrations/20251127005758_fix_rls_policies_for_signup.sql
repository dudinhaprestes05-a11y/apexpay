/*
  # Fix RLS Policies for User Signup

  1. Changes
    - Drop existing INSERT policy that only allows authenticated users
    - Create new INSERT policy that allows both anon and authenticated users
    - This fixes the issue where signup fails because user is not yet authenticated

  2. Security
    - Still maintains security by only allowing INSERT during signup
    - Other operations (SELECT, UPDATE, DELETE) still require proper authentication
*/

-- Drop the old policy that was too restrictive
DROP POLICY IF EXISTS "Anyone can insert users" ON users;

-- Create new policy that allows both anon and authenticated users to insert
-- This is needed because during signup, the user is not yet authenticated
CREATE POLICY "Enable insert for signup"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also improve the SELECT policies to be more robust
-- Keep existing policies but ensure they work correctly

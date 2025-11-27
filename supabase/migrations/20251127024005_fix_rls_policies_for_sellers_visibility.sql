/*
  # Fix RLS Policies for Sellers Visibility

  1. Problem
    - Admin cannot see sellers even with correct JWT role
    - auth.jwt() might not be working as expected in policies
    
  2. Solution
    - Create a helper function that safely checks if user is admin
    - Use function in policies to avoid direct JWT checks
    - Ensure policies work with Supabase's RLS engine
    
  3. Security
    - Maintain proper access control
    - Admin sees all users
    - Regular users see only themselves
*/

-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE id = auth.uid()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users via JWT" ON users;
DROP POLICY IF EXISTS "Admins can update users via JWT" ON users;

-- Create new working policies using helper function
CREATE POLICY "Users can view: self or admin sees all"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "Admins can update all users"
ON users FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

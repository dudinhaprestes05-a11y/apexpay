/*
  # Fix Infinite Recursion in Users Table Policies

  1. Problem
    - Policies with subqueries on users table cause infinite recursion
    - "Admins can view all users" has: EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
    
  2. Solution
    - Store role in JWT claims during authentication
    - Use auth.jwt() to check role instead of querying users table
    - This breaks the recursion cycle
    
  3. Changes
    - Drop recursive policies
    - Create new policies using JWT claims only
*/

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Create new admin view policy using JWT (no recursion)
CREATE POLICY "Admins can view all users via JWT"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  COALESCE((auth.jwt()->>'role')::text, '') = 'admin'
);

-- Create new admin update policy using JWT (no recursion)
CREATE POLICY "Admins can update users via JWT"
ON users FOR UPDATE
TO authenticated
USING (
  COALESCE((auth.jwt()->>'role')::text, '') = 'admin'
)
WITH CHECK (
  COALESCE((auth.jwt()->>'role')::text, '') = 'admin'
);

-- Create trigger to update JWT claims when user role changes
CREATE OR REPLACE FUNCTION update_auth_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's metadata in auth.users to include role
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_user_role_change ON users;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_user_metadata();

-- Update existing users' metadata to include their role
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, role FROM users LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', user_record.role)
    WHERE id = user_record.id;
  END LOOP;
END $$;

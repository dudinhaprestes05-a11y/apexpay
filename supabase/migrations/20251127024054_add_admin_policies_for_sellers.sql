/*
  # Add Admin Policies for Viewing Sellers

  1. Solution
    - Create table to track admin users
    - Add policy allowing users in admin_users table to see all users
    - Populate admin_users table
    
  2. Changes
    - Create admin_users table
    - Add RLS policies using this table
    - Avoid recursion by using separate table
*/

-- Create table to track admin users (no RLS needed on this table)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Disable RLS on admin_users table (it's just a lookup table)
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Populate admin_users with current admins
INSERT INTO admin_users (user_id)
SELECT id FROM users WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to automatically add/remove from admin_users
CREATE OR REPLACE FUNCTION sync_admin_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO admin_users (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM admin_users WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_admin_users_trigger ON users;
CREATE TRIGGER sync_admin_users_trigger
  AFTER INSERT OR UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_users();

-- Add policy for admins to see all users (no recursion!)
CREATE POLICY "admins_can_see_all_users"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Add policy for admins to update all users
CREATE POLICY "admins_can_update_all_users"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

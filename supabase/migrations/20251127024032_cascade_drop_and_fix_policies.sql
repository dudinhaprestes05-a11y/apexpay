/*
  # Cascade Drop and Fix RLS Policies

  1. Drop everything with CASCADE
  2. Create simple working policies
  3. Use service role for admin operations
*/

-- Drop function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Drop any remaining policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for signup" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;

-- Create simple policies
-- Users can see only their own profile
CREATE POLICY "users_select_own"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "users_update_own"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow user registration
CREATE POLICY "users_insert_self"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Note: Service role (used by backend) automatically bypasses RLS
-- Admin operations should be done via service role, not user JWT

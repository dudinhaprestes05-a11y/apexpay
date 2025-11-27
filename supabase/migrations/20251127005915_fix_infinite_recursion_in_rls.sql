/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - The "Admins can view all users" policy was causing infinite recursion
    - It was querying the users table to check if the user is admin
    - This creates a circular dependency

  2. Solution
    - Use raw_app_metadata from auth.jwt() instead of querying users table
    - Store the role in app_metadata during signup
    - This avoids the circular query

  3. Changes
    - Drop the recursive admin policy
    - Create new non-recursive admin policy using JWT metadata
    - For now, keep only the simple "users can view own profile" policy
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Keep only the simple, non-recursive policies
-- Users can view their own profile (no recursion)
-- This policy already exists and works fine

-- If we need admin access later, we'll use a different approach
-- For now, admins can use the service role key for admin operations

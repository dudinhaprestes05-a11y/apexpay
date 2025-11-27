/*
  # Fix Recursive RLS Policies in Existing Tables

  1. Problem
    - Multiple tables have policies that query the users table to check for admin role
    - This causes infinite recursion: "infinite recursion detected in policy for relation users"
    - Affected tables: api_keys, transactions

  2. Solution
    - Remove all policies that check user role by querying users table
    - For admin access, we'll use Edge Functions with service role key
    - Keep only the simple, non-recursive policies for regular users

  3. Security
    - Regular users can still only access their own data
    - Admin functionality will be implemented via Edge Functions
*/

-- Fix api_keys table
DROP POLICY IF EXISTS "Admins can view all api keys" ON api_keys;

-- Fix transactions table  
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- All other non-recursive policies remain intact:
-- - Users can view own api keys
-- - Users can view own transactions
-- - Users can update/delete their own data

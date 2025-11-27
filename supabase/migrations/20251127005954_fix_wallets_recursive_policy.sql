/*
  # Fix Recursive RLS Policy in Wallets Table

  1. Problem
    - Wallets table has "Admins can view all wallets" policy that causes recursion
    - It queries the users table to check for admin role
    - This contributes to the infinite recursion error

  2. Solution
    - Remove the recursive admin policy
    - Keep the simple user policy intact

  3. Security
    - Users can still view their own wallet
    - Admin access will be via Edge Functions with service role
*/

-- Remove the recursive policy
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;

-- All other policies remain:
-- - Users can view own wallet (non-recursive)
-- - System can insert/update wallets (for internal operations)

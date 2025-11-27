/*
  # Fix All Remaining Recursive RLS Policies

  1. Problem
    - podpay_config and webhook_logs tables have recursive policies
    - They query the users table to check for admin role
    - This causes infinite recursion errors

  2. Solution
    - Remove all recursive admin policies
    - For admin-only tables, we'll use a different approach:
      - Option 1: Access via Edge Functions with service role
      - Option 2: Use auth.jwt() metadata instead of querying users table
    - For now, removing the policies to fix the login issue

  3. Security Note
    - These are admin-only tables, so we'll need to implement proper admin access
    - Will be done via Edge Functions that use service role key
*/

-- Fix podpay_config table
DROP POLICY IF EXISTS "Only admins can view podpay config" ON podpay_config;
DROP POLICY IF EXISTS "Only admins can manage podpay config" ON podpay_config;

-- Fix webhook_logs table
DROP POLICY IF EXISTS "Only admins can view webhook logs" ON webhook_logs;

-- Note: These tables are now locked down by RLS (no policies = no access)
-- Admin access will be implemented via Edge Functions

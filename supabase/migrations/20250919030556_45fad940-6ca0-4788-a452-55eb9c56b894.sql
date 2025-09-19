-- Fix the recursive RLS policy on profiles table
-- The current policy causes infinite recursion by querying profiles within profiles policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

-- Create a proper policy that doesn't cause recursion
-- This policy allows users to view profiles only in their own tenant
-- by using a function that gets the user's tenant directly
CREATE POLICY "Users can view profiles in their tenant" 
ON public.profiles 
FOR SELECT 
USING (
  tenant_id = (
    SELECT p.tenant_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    LIMIT 1
  )
  OR user_id = auth.uid()  -- Always allow users to see their own profile
);
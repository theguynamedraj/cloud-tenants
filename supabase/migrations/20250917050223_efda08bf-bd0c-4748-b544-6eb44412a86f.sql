-- Multi-tenant SaaS Notes Application Schema

-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email, tenant_id)
);

-- Create notes table with tenant isolation
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's tenant and role
CREATE OR REPLACE FUNCTION public.get_user_tenant_info(user_uuid UUID)
RETURNS TABLE(tenant_id UUID, user_role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id, p.role
  FROM public.profiles p
  WHERE p.user_id = user_uuid;
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, required_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = user_uuid
      AND p.role = required_role
  );
$$;

-- Create function to get tenant note count
CREATE OR REPLACE FUNCTION public.get_tenant_note_count(tenant_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notes
  WHERE tenant_id = tenant_uuid;
$$;

-- RLS Policies for tenants table
CREATE POLICY "Users can view their own tenant"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update their tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT p.tenant_id FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS Policies for profiles table
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for notes table
CREATE POLICY "Users can view notes in their tenant"
ON public.notes
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create notes in their tenant"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test tenants
INSERT INTO public.tenants (name, slug, subscription_plan) VALUES
  ('Acme Corporation', 'acme', 'free'),
  ('Globex Corporation', 'globex', 'free');

-- Create test users and profiles (will be created via auth after users sign up)
-- Note: The actual auth users will be created when they first sign up
-- We'll create a function to handle new user registration
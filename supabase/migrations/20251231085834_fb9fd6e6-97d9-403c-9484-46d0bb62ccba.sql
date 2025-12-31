-- Drop existing restrictive policies on servers table
DROP POLICY IF EXISTS "Admins can delete servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can insert servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can update servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can view all servers" ON public.servers;
DROP POLICY IF EXISTS "Anyone can view active servers" ON public.servers;

-- Recreate policies as PERMISSIVE (default) instead of RESTRICTIVE
-- Admins can do everything
CREATE POLICY "Admins can manage all servers" 
ON public.servers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active servers (for public browsing)
CREATE POLICY "Anyone can view active servers" 
ON public.servers 
FOR SELECT 
USING (is_active = true);
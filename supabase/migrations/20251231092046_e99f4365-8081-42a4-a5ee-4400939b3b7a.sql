-- Fix admin update policy for reservations - add WITH CHECK
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;
CREATE POLICY "Admins can update all reservations"
ON public.reservations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix admin credentials policy - ensure WITH CHECK exists
DROP POLICY IF EXISTS "Admins can manage all credentials" ON public.credentials;
CREATE POLICY "Admins can manage all credentials"
ON public.credentials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
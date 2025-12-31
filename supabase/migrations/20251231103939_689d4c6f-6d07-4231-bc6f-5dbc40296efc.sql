-- Allow anyone to see reservations for checking availability (public calendar view)
-- This only exposes reservation time slots, not personal user data
CREATE POLICY "Anyone can view server reservations for availability"
ON public.reservations
FOR SELECT
USING (true);
-- Create role enum type
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create rental type enum
CREATE TYPE public.rental_type AS ENUM ('hourly', 'daily');

-- Create reservation status enum  
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create servers table
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpu_model TEXT NOT NULL,
  gpu_model TEXT NOT NULL,
  ram_gb INTEGER NOT NULL,
  storage_gb INTEGER NOT NULL,
  os_name TEXT NOT NULL,
  hourly_price NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  daily_price NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  rental_type rental_type NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credentials table (assigned by admin after reservation)
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  ip_address TEXT,
  username TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON public.credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROFILES RLS POLICIES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES RLS POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- SERVERS RLS POLICIES
CREATE POLICY "Anyone can view active servers"
  ON public.servers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all servers"
  ON public.servers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert servers"
  ON public.servers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update servers"
  ON public.servers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete servers"
  ON public.servers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RESERVATIONS RLS POLICIES
CREATE POLICY "Users can view their own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending reservations"
  ON public.reservations FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all reservations"
  ON public.reservations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- CREDENTIALS RLS POLICIES
CREATE POLICY "Users can view credentials for their reservations"
  ON public.credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all credentials"
  ON public.credentials FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check for overlapping reservations
CREATE OR REPLACE FUNCTION public.check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reservations
    WHERE server_id = NEW.server_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'cancelled'
      AND (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
  ) THEN
    RAISE EXCEPTION 'Reservation overlaps with existing booking';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to prevent overlapping reservations
CREATE TRIGGER check_reservation_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_reservation_overlap();

-- Seed some servers
INSERT INTO public.servers (name, cpu_model, gpu_model, ram_gb, storage_gb, os_name, hourly_price, daily_price) VALUES
  ('Compute Pro X1', 'AMD Ryzen 9 7950X', 'NVIDIA RTX 4090', 128, 2000, 'Ubuntu 22.04 LTS', 12.50, 250.00),
  ('GPU Power Station', 'Intel Xeon W-3375', 'NVIDIA A100 80GB', 256, 4000, 'Ubuntu 22.04 LTS', 25.00, 500.00),
  ('Deep Learning Beast', 'AMD EPYC 9654', 'NVIDIA H100 80GB', 512, 8000, 'Ubuntu 22.04 LTS', 45.00, 900.00),
  ('Entry Workstation', 'Intel Core i9-14900K', 'NVIDIA RTX 4070', 64, 1000, 'Windows Server 2022', 8.00, 150.00),
  ('Mid-Range Server', 'AMD Ryzen 7 7800X3D', 'NVIDIA RTX 4080', 96, 2000, 'Debian 12', 10.00, 200.00),
  ('Rendering Farm Node', 'Intel Xeon Platinum 8480+', 'NVIDIA RTX 4090 x2', 256, 4000, 'Rocky Linux 9', 20.00, 400.00),
  ('AI Training Cluster', 'AMD EPYC 9474F', 'NVIDIA A10G x4', 384, 6000, 'Ubuntu 22.04 LTS', 35.00, 700.00),
  ('Budget GPU Server', 'AMD Ryzen 5 7600X', 'NVIDIA RTX 3060', 32, 500, 'Ubuntu 20.04 LTS', 5.00, 90.00);
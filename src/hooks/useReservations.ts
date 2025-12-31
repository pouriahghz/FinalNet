import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type RentalType = "hourly" | "daily";
export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Reservation {
  id: string;
  user_id: string;
  server_id: string;
  rental_type: RentalType;
  start_time: string;
  end_time: string;
  total_price: number;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  server?: {
    id: string;
    name: string;
    cpu_model: string;
    gpu_model: string;
    ram_gb: number;
    storage_gb: number;
    os_name: string;
  };
  credentials?: {
    id: string;
    ip_address: string | null;
    username: string | null;
    password: string | null;
  };
  profile?: {
    name: string | null;
    email: string;
  };
}

export interface CreateReservationInput {
  server_id: string;
  rental_type: RentalType;
  start_time: string;
  end_time: string;
  total_price: number;
}

export function useMyReservations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-reservations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          server:servers(id, name, cpu_model, gpu_model, ram_gb, storage_gb, os_name),
          credentials(id, ip_address, username, password)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!user,
  });
}

export function useAllReservations() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["all-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          server:servers(id, name, cpu_model, gpu_model, ram_gb, storage_gb, os_name),
          credentials(id, ip_address, username, password)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: isAdmin,
  });
}

export function useServerReservations(serverId: string) {
  return useQuery({
    queryKey: ["server-reservations", serverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("server_id", serverId)
        .neq("status", "cancelled")
        .gte("end_time", new Date().toISOString());

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!serverId,
  });
}

export function useCreateReservation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const { data, error } = await supabase
        .from("reservations")
        .insert({
          ...input,
          user_id: user!.id,
          status: "confirmed",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["server-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { data, error } = await supabase.functions.invoke("admin-mutate", {
        body: { action: "update_reservation_status", payload: { id, status } },
      });
      if (error) throw new Error(error.message);
      return (data as any)?.reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useAssignCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservation_id,
      ip_address,
      username,
      password,
    }: {
      reservation_id: string;
      ip_address: string;
      username: string;
      password: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-mutate", {
        body: {
          action: "assign_credentials",
          payload: { reservation_id, ip_address, username, password },
        },
      });
      if (error) throw new Error(error.message);
      return (data as any)?.credentials;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["all-reservations"] });
    },
  });
}

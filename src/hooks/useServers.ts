import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Server {
  id: string;
  name: string;
  cpu_model: string;
  gpu_model: string;
  ram_gb: number;
  storage_gb: number;
  os_name: string;
  hourly_price: number;
  daily_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServers(mode?: "cpu" | "gpu", searchValue?: string) {
  return useQuery({
    queryKey: ["servers", mode, searchValue],
    queryFn: async () => {
      let query = supabase
        .from("servers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (mode && searchValue) {
        if (mode === "cpu") {
          query = query.ilike("cpu_model", `%${searchValue}%`);
        } else {
          query = query.ilike("gpu_model", `%${searchValue}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Server[];
    },
  });
}

export function useAllServers() {
  const { isAdmin } = useAuth();
  
  return useQuery({
    queryKey: ["all-servers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Server[];
    },
    enabled: isAdmin,
  });
}

export function useServer(id: string) {
  return useQuery({
    queryKey: ["server", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Server | null;
    },
    enabled: !!id,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (server: Omit<Server, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.functions.invoke("admin-mutate", {
        body: { action: "create_server", payload: server },
      });
      if (error) throw new Error(error.message);
      return (data as any)?.server;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["all-servers"] });
    },
  });
}

export function useUpdateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Server> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-mutate", {
        body: { action: "update_server", payload: { id, ...updates } },
      });
      if (error) throw new Error(error.message);
      return (data as any)?.server as Server;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["all-servers"] });
      queryClient.invalidateQueries({ queryKey: ["server", data.id] });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("admin-mutate", {
        body: { action: "delete_server", payload: { id } },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["all-servers"] });
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Stats {
  totalUsers: number;
  totalServers: number;
  totalRentals: number;
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      // Get total users count
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (usersError) throw usersError;

      // Get total active servers count
      const { count: serversCount, error: serversError } = await supabase
        .from("servers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (serversError) throw serversError;

      // Get total confirmed rentals count
      const { count: rentalsCount, error: rentalsError } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed");

      if (rentalsError) throw rentalsError;

      return {
        totalUsers: usersCount || 0,
        totalServers: serversCount || 0,
        totalRentals: rentalsCount || 0,
      } as Stats;
    },
  });
}

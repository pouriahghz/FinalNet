import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Some networks block PATCH requests; use backend function (POST) instead.
      const { data, error } = await supabase.functions.invoke("update-profile", {
        body: {
          name: updates.name ?? null,
          phone: updates.phone ?? null,
        },
      });

      if (error) throw new Error(error.message);
      return (data as any)?.profile as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    retry: false,
  });
}

// Compress image before upload
async function compressImage(blob: Blob, maxWidth = 512, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Failed to compress image"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

export function useUploadProfileImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageBlob: Blob) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Compress image before upload
      const compressedBlob = await compressImage(imageBlob, 512, 0.85);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          const stripped = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
          resolve(stripped);
        };
        reader.onerror = () => reject(new Error("Failed to read image"));
        reader.readAsDataURL(compressedBlob);
      });

      // Use backend function (POST) to avoid networks/proxies blocking PUT to storage.
      const { data, error } = await supabase.functions.invoke("upload-avatar", {
        body: {
          imageBase64: base64,
          contentType: "image/jpeg",
        },
      });

      if (error) throw new Error(error.message);
      return (data as any)?.profile as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    retry: false,
  });
}

export function useDeleteProfileImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase.functions.invoke("delete-avatar");

      if (error) throw new Error(error.message);
      return (data as any)?.profile as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    retry: false,
  });
}

export function useAllProfiles() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });
}

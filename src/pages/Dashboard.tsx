import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile, useUploadProfileImage, useDeleteProfileImage } from "@/hooks/useProfile";
import { useMyReservations, Reservation } from "@/hooks/useReservations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { User, Server, Clock, Key, Download, Cpu, MonitorDot, Lock, Globe, UserCircle, Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileImageCropper } from "@/components/ProfileImageCropper";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: reservations, isLoading: reservationsLoading } = useMyReservations();
  const updateProfile = useUpdateProfile();
  const uploadProfileImage = useUploadProfileImage();
  const deleteProfileImage = useDeleteProfileImage();

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        name: editName,
        phone: editPhone,
      });
      toast({ title: "Profile updated", description: "Your profile has been updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportCSV = () => {
    if (!reservations || reservations.length === 0) {
      toast({ title: "No data", description: "No reservations to export.", variant: "destructive" });
      return;
    }

    const headers = ["ID", "Server", "Rental Type", "Start Time", "End Time", "Total Price", "Status", "IP Address", "Username", "Password"];
    const rows = reservations.map((r) => [
      r.id,
      r.server?.name || "",
      r.rental_type,
      format(new Date(r.start_time), "yyyy-MM-dd HH:mm"),
      format(new Date(r.end_time), "yyyy-MM-dd HH:mm"),
      r.total_price,
      r.status,
      r.credentials?.ip_address || "",
      r.credentials?.username || "",
      r.credentials?.password || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-reservations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export complete", description: "Your reservations have been exported to CSV." });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your rentals and profile</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="reservations" className="space-y-6">
          <TabsList className="bg-muted/50 w-full grid grid-cols-2 h-auto p-1">
            <TabsTrigger value="reservations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
              <Server className="mr-2 h-4 w-4 hidden sm:inline" />
              My Rentals
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2">
              <User className="mr-2 h-4 w-4 hidden sm:inline" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="space-y-4">
            {reservationsLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-32" />
                  </Card>
                ))}
              </div>
            ) : reservations && reservations.length > 0 ? (
              <div className="grid gap-4">
                {reservations.map((reservation) => (
                  <ReservationCard key={reservation.id} reservation={reservation} />
                ))}
              </div>
            ) : (
              <Card variant="gradient" className="text-center py-12">
                <CardContent>
                  <Server className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Rentals Yet</h3>
                  <p className="text-muted-foreground mb-4">Start by browsing our available servers.</p>
                  <Button variant="hero" onClick={() => navigate("/servers")}>
                    Browse Servers
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card variant="glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <ProfileImageCropper
                    currentImageUrl={profile?.profile_image_url}
                    isDeleting={deleteProfileImage.isPending}
                    onImageCropped={async (blob) => {
                      try {
                        await uploadProfileImage.mutateAsync(blob);
                        toast({ title: "Photo updated", description: "Your profile picture has been updated." });
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      }
                    }}
                    onDeleteImage={async () => {
                      try {
                        await deleteProfileImage.mutateAsync();
                        toast({ title: "Photo removed", description: "Your profile picture has been removed." });
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      }
                    }}
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={profile?.email || ""} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updateProfile.isPending}
                  className="min-w-[120px]"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card variant="feature">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Password must be at least 6 characters long.
                </p>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  variant="outline"
                  className="min-w-[160px]"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const statusVariant = {
    pending: "pending",
    confirmed: "confirmed",
    cancelled: "cancelled",
  } as const;

  return (
    <Card variant="feature">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">{reservation.server?.name}</h3>
              <Badge variant={statusVariant[reservation.status]} className="mt-1">
                {reservation.status}
              </Badge>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-gradient">
                ${Number(reservation.total_price).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {reservation.rental_type} rental
              </div>
            </div>
          </div>

          {/* Specs & Time */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Cpu className="h-3 w-3 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
              <span className="text-muted-foreground truncate">{reservation.server?.cpu_model}</span>
            </div>
            <div className="flex items-center gap-2">
              <MonitorDot className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground truncate">{reservation.server?.gpu_model}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                {format(new Date(reservation.start_time), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                {format(new Date(reservation.end_time), "MMM d, HH:mm")}
              </span>
            </div>
          </div>

          {/* Credentials */}
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <Key className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Access Credentials</span>
            </div>
            {reservation.credentials?.ip_address ? (
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm font-mono">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{reservation.credentials.ip_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{reservation.credentials.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{reservation.credentials.password}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Credentials will be assigned shortly by an administrator.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

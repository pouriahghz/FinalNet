import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useAllServers, useCreateServer, useUpdateServer, useDeleteServer, Server } from "@/hooks/useServers";
import { useAllReservations, useAssignCredentials, Reservation } from "@/hooks/useReservations";
import { useAllProfiles, Profile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Server as ServerIcon,
  Users,
  Calendar,
  Plus,
  Edit,
  Key,
  Download,
  Cpu,
  MonitorDot,
  Shield,
  Trash2,
} from "lucide-react";

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin, navigate]);

  if (authLoading || !user || !isAdmin) {
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

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-lg bg-accent/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage servers, users, and reservations</p>
          </div>
        </div>

        <Tabs defaultValue="servers" className="space-y-6">
          <TabsList className="bg-muted/50 w-full flex flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="servers" className="flex-1 min-w-[100px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <ServerIcon className="mr-2 h-4 w-4 hidden sm:inline" />
              Servers
            </TabsTrigger>
            <TabsTrigger value="reservations" className="flex-1 min-w-[100px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Calendar className="mr-2 h-4 w-4 hidden sm:inline" />
              Reservations
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 min-w-[100px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Users className="mr-2 h-4 w-4 hidden sm:inline" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servers">
            <ServersTab />
          </TabsContent>

          <TabsContent value="reservations">
            <ReservationsTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ServersTab() {
  const { data: servers, isLoading } = useAllServers();
  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [serverToToggle, setServerToToggle] = useState<Server | null>(null);
  const [serverToDelete, setServerToDelete] = useState<Server | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cpu_model: "",
    gpu_model: "",
    ram_gb: 64,
    storage_gb: 1000,
    os_name: "Ubuntu 22.04 LTS",
    hourly_price: 10,
    daily_price: 200,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      cpu_model: "",
      gpu_model: "",
      ram_gb: 64,
      storage_gb: 1000,
      os_name: "Ubuntu 22.04 LTS",
      hourly_price: 10,
      daily_price: 200,
      is_active: true,
    });
    setEditingServer(null);
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      cpu_model: server.cpu_model,
      gpu_model: server.gpu_model,
      ram_gb: server.ram_gb,
      storage_gb: server.storage_gb,
      os_name: server.os_name,
      hourly_price: Number(server.hourly_price),
      daily_price: Number(server.daily_price),
      is_active: server.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingServer) {
        await updateServer.mutateAsync({ id: editingServer.id, ...formData });
        toast({ title: "Server updated", description: "Server has been updated successfully." });
      } else {
        await createServer.mutateAsync(formData);
        toast({ title: "Server created", description: "New server has been added." });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (server: Server) => {
    try {
      await updateServer.mutateAsync({ id: server.id, is_active: !server.is_active });
      toast({
        title: server.is_active ? "Server deactivated" : "Server activated",
        description: `${server.name} is now ${server.is_active ? "inactive" : "active"}.`,
      });
      setServerToToggle(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setServerToToggle(null);
    }
  };

  const handleToggleClick = (server: Server) => {
    if (server.is_active) {
      // Show confirmation for deactivation
      setServerToToggle(server);
    } else {
      // Activate immediately without confirmation
      handleToggleActive(server);
    }
  };

  const handleDelete = async (server: Server) => {
    try {
      await deleteServer.mutateAsync(server.id);
      toast({ title: "Server deleted", description: `${server.name} has been permanently deleted.` });
      setServerToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setServerToDelete(null);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Server Management</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingServer ? "Edit Server" : "Add New Server"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>OS</Label>
                  <Input value={formData.os_name} onChange={(e) => setFormData({ ...formData, os_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CPU Model</Label>
                <Input value={formData.cpu_model} onChange={(e) => setFormData({ ...formData, cpu_model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>GPU Model</Label>
                <Input value={formData.gpu_model} onChange={(e) => setFormData({ ...formData, gpu_model: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RAM (GB)</Label>
                  <Input type="number" value={formData.ram_gb} onChange={(e) => setFormData({ ...formData, ram_gb: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Storage (GB)</Label>
                  <Input type="number" value={formData.storage_gb} onChange={(e) => setFormData({ ...formData, storage_gb: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hourly Price ($)</Label>
                  <Input type="number" step="0.01" value={formData.hourly_price} onChange={(e) => setFormData({ ...formData, hourly_price: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Price ($)</Label>
                  <Input type="number" step="0.01" value={formData.daily_price} onChange={(e) => setFormData({ ...formData, daily_price: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                <Label>Active</Label>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={createServer.isPending || updateServer.isPending} className="w-full">
              {editingServer ? "Update Server" : "Create Server"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {servers?.map((server) => (
            <Card key={server.id} variant="gradient">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center ${server.is_active ? "bg-success/20" : "bg-destructive/20"}`}>
                      <ServerIcon className={`h-5 w-5 ${server.is_active ? "text-success" : "text-destructive"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold flex flex-wrap items-center gap-2">
                        <span className="truncate">{server.name}</span>
                        <Badge variant={server.is_active ? "success" : "destructive"}>
                          {server.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                        <span className="flex items-center gap-1 truncate"><Cpu className="h-3 w-3 flex-shrink-0" /> {server.cpu_model}</span>
                        <span className="flex items-center gap-1 truncate"><MonitorDot className="h-3 w-3 flex-shrink-0" /> {server.gpu_model}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold">${Number(server.hourly_price).toFixed(2)}/hr</div>
                      <div className="text-sm text-muted-foreground">${Number(server.daily_price).toFixed(2)}/day</div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(server)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setServerToDelete(server)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button size="sm" variant={server.is_active ? "destructive" : "default"} onClick={() => handleToggleClick(server)} className="flex-1 sm:flex-none">
                        {server.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deactivation Confirmation Dialog */}
      <AlertDialog open={!!serverToToggle} onOpenChange={(open) => !open && setServerToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Server?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold text-foreground">{serverToToggle?.name}</span>? 
              This server will no longer be available for new reservations. Existing reservations will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => serverToToggle && handleToggleActive(serverToToggle)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!serverToDelete} onOpenChange={(open) => !open && setServerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">{serverToDelete?.name}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => serverToDelete && handleDelete(serverToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReservationsTab() {
  const { data: reservations, isLoading } = useAllReservations();
  const assignCredentials = useAssignCredentials();
  const { toast } = useToast();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({ ip_address: "", username: "", password: "" });

  const handleExportCSV = () => {
    if (!reservations || reservations.length === 0) {
      toast({ title: "No data", description: "No reservations to export.", variant: "destructive" });
      return;
    }

    const headers = ["ID", "Server", "User ID", "Rental Type", "Start Time", "End Time", "Total Price", "Status", "IP Address", "Username"];
    const rows = reservations.map((r) => [
      r.id,
      r.server?.name || "",
      r.user_id,
      r.rental_type,
      format(new Date(r.start_time), "yyyy-MM-dd HH:mm"),
      format(new Date(r.end_time), "yyyy-MM-dd HH:mm"),
      r.total_price,
      r.status,
      r.credentials?.ip_address || "",
      r.credentials?.username || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-reservations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export complete", description: "All reservations have been exported to CSV." });
  };

  const handleAssignCredentials = async () => {
    if (!selectedReservation) return;

    try {
      await assignCredentials.mutateAsync({
        reservation_id: selectedReservation.id,
        ...credentialsForm,
      });
      toast({ title: "Credentials assigned", description: "Access credentials have been assigned successfully." });
      setSelectedReservation(null);
      setCredentialsForm({ ip_address: "", username: "", password: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const statusVariant = {
    pending: "pending",
    confirmed: "confirmed",
    cancelled: "cancelled",
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">All Reservations</h2>
        <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {reservations?.map((reservation) => (
            <Card key={reservation.id} variant="gradient">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{reservation.server?.name}</h3>
                      <Badge variant={statusVariant[reservation.status]}>{reservation.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs uppercase">Start</span>
                        <div>{format(new Date(reservation.start_time), "MMM d, HH:mm")}</div>
                      </div>
                      <div>
                        <span className="text-xs uppercase">End</span>
                        <div>{format(new Date(reservation.end_time), "MMM d, HH:mm")}</div>
                      </div>
                      <div>
                        <span className="text-xs uppercase">Type</span>
                        <div className="capitalize">{reservation.rental_type}</div>
                      </div>
                      <div>
                        <span className="text-xs uppercase">Price</span>
                        <div className="font-semibold text-foreground">${Number(reservation.total_price).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {reservation.credentials?.ip_address ? (
                      <div className="text-sm font-mono bg-muted/50 p-2 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Credentials Assigned</div>
                        <div>{reservation.credentials.ip_address}</div>
                      </div>
                    ) : (
                      <Dialog open={selectedReservation?.id === reservation.id} onOpenChange={(open) => { if (!open) setSelectedReservation(null); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="default" onClick={() => setSelectedReservation(reservation)}>
                            <Key className="mr-2 h-4 w-4" />
                            Assign Credentials
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Access Credentials</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <Label>IP Address</Label>
                              <Input
                                placeholder="192.168.1.100"
                                value={credentialsForm.ip_address}
                                onChange={(e) => setCredentialsForm({ ...credentialsForm, ip_address: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Username</Label>
                              <Input
                                placeholder="admin"
                                value={credentialsForm.username}
                                onChange={(e) => setCredentialsForm({ ...credentialsForm, username: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                value={credentialsForm.password}
                                onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                              />
                            </div>
                          </div>
                          <Button onClick={handleAssignCredentials} disabled={assignCredentials.isPending}>
                            {assignCredentials.isPending ? "Assigning..." : "Assign Credentials"}
                          </Button>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const { data: profiles, isLoading } = useAllProfiles();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">All Users</h2>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles?.map((profile) => (
            <Card key={profile.id} variant="gradient">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{profile.name || "Unnamed User"}</div>
                      <div className="text-sm text-muted-foreground truncate">{profile.email}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Joined {format(new Date(profile.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

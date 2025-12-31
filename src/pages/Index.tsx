import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useStats } from "@/hooks/useStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Server, Users, Calendar, Cpu, Zap, Shield } from "lucide-react";

export default function Index() {
  const { user } = useAuth();
  const { data: stats } = useStats();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px] bg-primary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 animate-fade-in">
              Rent <span className="text-gradient">High-Performance</span> Servers
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 animate-fade-in px-4" style={{ animationDelay: "0.1s" }}>
              Access enterprise-grade hardware on demand. GPU clusters, AI workstations, 
              and rendering farms—pay only for what you use.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-fade-in px-4" style={{ animationDelay: "0.2s" }}>
              <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={() => navigate(user ? "/servers" : "/auth")}>
                <Zap className="mr-2 h-5 w-5" />
                Start Renting
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => navigate("/servers")}>
                View Servers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 sm:py-16 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card variant="feature" className="text-center p-6 sm:p-8">
              <CardContent className="p-0">
                <div className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gradient mb-1 sm:mb-2">{stats?.totalUsers || 0}</div>
                <p className="text-muted-foreground text-sm sm:text-base">Active Users</p>
              </CardContent>
            </Card>

            <Card variant="feature" className="text-center p-6 sm:p-8">
              <CardContent className="p-0">
                <div className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Server className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gradient mb-1 sm:mb-2">{stats?.totalServers || 0}</div>
                <p className="text-muted-foreground text-sm sm:text-base">Available Servers</p>
              </CardContent>
            </Card>

            <Card variant="feature" className="text-center p-6 sm:p-8">
              <CardContent className="p-0">
                <div className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-success/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-success" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-gradient mb-1 sm:mb-2">{stats?.totalRentals || 0}</div>
                <p className="text-muted-foreground text-sm sm:text-base">Completed Rentals</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Why Choose <span className="text-gradient">ServerRent</span>?
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <Card variant="gradient" className="p-5 sm:p-6">
              <Cpu className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Powerful Hardware</h3>
              <p className="text-muted-foreground text-sm sm:text-base">From RTX 4090s to H100s—access the latest GPUs and CPUs for any workload.</p>
            </Card>

            <Card variant="gradient" className="p-5 sm:p-6">
              <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-warning mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Instant Access</h3>
              <p className="text-muted-foreground text-sm sm:text-base">Book by the hour or day. Get your credentials immediately after checkout.</p>
            </Card>

            <Card variant="gradient" className="p-5 sm:p-6 sm:col-span-2 md:col-span-1">
              <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-success mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-muted-foreground text-sm sm:text-base">Enterprise-grade security with 99.9% uptime guarantee for all servers.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 ServerRent. High-performance computing on demand.</p>
        </div>
      </footer>
    </div>
  );
}

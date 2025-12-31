import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useServers, Server } from "@/hooks/useServers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Cpu, MonitorDot, HardDrive, MemoryStick, Server as ServerIcon, Search, Zap, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

type SelectionMode = "cpu" | "gpu" | null;
type SelectionStep = "choose-mode" | "select-value" | "view-results";

// Common CPU and GPU options for quick selection
const CPU_OPTIONS = ["Intel Xeon", "AMD EPYC", "AMD Ryzen 9", "Intel Core i9"];
const GPU_OPTIONS = ["NVIDIA RTX 4090", "NVIDIA H100", "NVIDIA A100", "NVIDIA RTX 3090"];

export default function Servers() {
  const [step, setStep] = useState<SelectionStep>("choose-mode");
  const [mode, setMode] = useState<SelectionMode>(null);
  const [searchValue, setSearchValue] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const navigate = useNavigate();

  const { data: servers, isLoading } = useServers(
    mode || undefined,
    activeSearch || undefined
  );

  const handleSelectMode = (selectedMode: SelectionMode) => {
    setMode(selectedMode);
    setStep("select-value");
    setSearchValue("");
    setActiveSearch("");
  };

  const handleSelectValue = (value: string) => {
    setSearchValue(value);
    setActiveSearch(value);
    setStep("view-results");
  };

  const handleCustomSearch = () => {
    if (searchValue.trim()) {
      setActiveSearch(searchValue.trim());
      setStep("view-results");
    }
  };

  const handleBack = () => {
    if (step === "view-results") {
      setStep("select-value");
      setActiveSearch("");
    } else if (step === "select-value") {
      setStep("choose-mode");
      setMode(null);
      setSearchValue("");
      setActiveSearch("");
    }
  };

  const handleStartOver = () => {
    setStep("choose-mode");
    setMode(null);
    setSearchValue("");
    setActiveSearch("");
  };

  const handleSelectServer = (server: Server) => {
    navigate(`/reserve/${server.id}`);
  };

  // Step 1: Choose Mode (CPU or GPU)
  if (step === "choose-mode") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center mb-8 sm:mb-12 px-4">
            <Badge variant="info" className="mb-4">Step 1 of 3</Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Build Your <span className="text-gradient">Perfect System</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto">
              Choose how you want to configure your server. Select your priority component first.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto px-4">
            <Card
              variant="feature"
              className="cursor-pointer hover:scale-[1.02] transition-all group"
              onClick={() => handleSelectMode("cpu")}
            >
              <CardContent className="p-5 sm:p-8 text-center">
                <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-accent/30 transition-colors">
                  <Cpu className="h-7 w-7 sm:h-10 sm:w-10 text-accent" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Build by CPU</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Start with your preferred processor. Ideal for compute-intensive workloads, data processing, and general purpose tasks.
                </p>
                <Button variant="hero" className="w-full group-hover:shadow-glow">
                  Select CPU First
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              variant="feature"
              className="cursor-pointer hover:scale-[1.02] transition-all group"
              onClick={() => handleSelectMode("gpu")}
            >
              <CardContent className="p-5 sm:p-8 text-center">
                <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-primary/30 transition-colors">
                  <MonitorDot className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Build by GPU</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Start with your preferred graphics card. Perfect for AI/ML training, rendering, and GPU-accelerated tasks.
                </p>
                <Button variant="hero" className="w-full group-hover:shadow-glow">
                  Select GPU First
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Step 2: Select Value (specific CPU or GPU)
  if (step === "select-value") {
    const options = mode === "cpu" ? CPU_OPTIONS : GPU_OPTIONS;
    const Icon = mode === "cpu" ? Cpu : MonitorDot;

    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <Button variant="ghost" className="mb-4 sm:mb-6" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Selection Mode
          </Button>

          <div className="text-center mb-8 sm:mb-12">
            <Badge variant="info" className="mb-4">Step 2 of 3</Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Select Your <span className="text-gradient">{mode === "cpu" ? "Processor" : "Graphics Card"}</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg">
              Choose from popular options or search for a specific model
            </p>
          </div>

          {/* Quick Selection Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-6 sm:mb-8">
            {options.map((option) => (
              <Card
                key={option}
                variant="gradient"
                className="cursor-pointer hover:scale-[1.02] transition-all group"
                onClick={() => handleSelectValue(option)}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${mode === "cpu" ? "text-accent" : "text-primary"}`} />
                  <div className="font-medium text-xs sm:text-sm">{option}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Search */}
          <Card variant="glow" className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Or search for a specific model</CardTitle>
              <CardDescription>
                Enter a {mode === "cpu" ? "CPU" : "GPU"} model name to find matching servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={mode === "cpu" ? "e.g., Ryzen 9, Xeon, EPYC..." : "e.g., RTX 4090, H100, A100..."}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleCustomSearch} disabled={!searchValue.trim()}>
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Step 3: View Results
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <Button variant="ghost" onClick={handleBack} className="order-1 sm:order-none">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to {mode === "cpu" ? "CPU" : "GPU"} Selection</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <Button variant="outline" onClick={handleStartOver} className="order-2 sm:order-none">
            Start Over
          </Button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <Badge variant="info" className="mb-4">Step 3 of 3</Badge>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
            Matching Servers
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground text-sm sm:text-base">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Filtered by {mode === "cpu" ? "CPU" : "GPU"}: <strong className="text-foreground">{activeSearch}</strong></span>
          </div>
        </div>

        {/* Server List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="gradient" className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : servers && servers.length > 0 ? (
            servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onSelect={handleSelectServer}
                highlightMode={mode}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-8 sm:py-12">
              <ServerIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No Servers Found</h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-4">
                No servers match your {mode === "cpu" ? "CPU" : "GPU"} criteria: "{activeSearch}"
              </p>
              <Button variant="outline" onClick={handleBack}>
                Try Different Selection
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

interface ServerCardProps {
  server: Server;
  onSelect: (server: Server) => void;
  highlightMode?: SelectionMode;
}

function ServerCard({ server, onSelect, highlightMode }: ServerCardProps) {
  return (
    <Card variant="feature" className="group cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => onSelect(server)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{server.name}</CardTitle>
          <Badge variant="info" className="shrink-0">
            <Zap className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className={`flex items-center gap-2 ${highlightMode === "cpu" ? "text-accent font-medium" : "text-muted-foreground"}`}>
            <Cpu className={`h-4 w-4 ${highlightMode === "cpu" ? "text-accent" : ""}`} />
            <span>{server.cpu_model}</span>
            {highlightMode === "cpu" && <CheckCircle2 className="h-3 w-3 text-success ml-auto" />}
          </div>
          <div className={`flex items-center gap-2 ${highlightMode === "gpu" ? "text-primary font-medium" : "text-muted-foreground"}`}>
            <MonitorDot className={`h-4 w-4 ${highlightMode === "gpu" ? "text-primary" : ""}`} />
            <span>{server.gpu_model}</span>
            {highlightMode === "gpu" && <CheckCircle2 className="h-3 w-3 text-success ml-auto" />}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <MemoryStick className="h-4 w-4" />
              <span>{server.ram_gb} GB</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              <span>{server.storage_gb} GB</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            OS: {server.os_name}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Starting at</div>
            <div className="text-lg font-bold text-gradient">
              ${Number(server.hourly_price).toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/hr</span>
            </div>
          </div>
          <Button size="sm" variant="default" className="group-hover:shadow-glow-sm">
            Reserve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

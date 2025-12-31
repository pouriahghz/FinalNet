import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, addHours, addDays, isBefore, startOfDay, setHours, setMinutes, isSameDay } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { useServer } from "@/hooks/useServers";
import { useServerReservations, useCreateReservation, RentalType } from "@/hooks/useReservations";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Cpu, MonitorDot, HardDrive, MemoryStick, Clock, CalendarDays, CreditCard, ArrowLeft, Check, AlertTriangle, Lock } from "lucide-react";

export default function Reserve() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: server, isLoading: serverLoading } = useServer(id || "");
  const { data: existingReservations } = useServerReservations(id || "");
  const createReservation = useCreateReservation();

  const [rentalType, setRentalType] = useState<RentalType>("hourly");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startHour, setStartHour] = useState<string>("9");
  const [duration, setDuration] = useState<string>("1");
  const [step, setStep] = useState<"select" | "checkout" | "success">("select");

  // Get booked hours for a specific date
  const getBookedHoursForDate = (date: Date): number[] => {
    if (!existingReservations) return [];
    
    const bookedHours: Set<number> = new Set();
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    
    existingReservations.forEach((r) => {
      const rStart = new Date(r.start_time);
      const rEnd = new Date(r.end_time);
      
      // Check if reservation overlaps with this date
      if (rStart < dayEnd && rEnd > dayStart) {
        // Find which hours are booked on this day
        for (let hour = 0; hour < 24; hour++) {
          const slotStart = setHours(setMinutes(dayStart, 0), hour);
          const slotEnd = addHours(slotStart, 1);
          
          if (slotStart < rEnd && slotEnd > rStart) {
            bookedHours.add(hour);
          }
        }
      }
    });
    
    return Array.from(bookedHours);
  };

  // Check if a date is fully booked (all 24 hours)
  const isDateFullyBooked = (date: Date): boolean => {
    const bookedHours = getBookedHoursForDate(date);
    return bookedHours.length === 24;
  };

  // Check if a date has any bookings (for daily rental mode, check full day overlap)
  const dateHasBookings = (date: Date): boolean => {
    if (!existingReservations) return false;
    
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    
    return existingReservations.some((r) => {
      const rStart = new Date(r.start_time);
      const rEnd = new Date(r.end_time);
      // Check if reservation overlaps with this day at all
      return rStart < dayEnd && rEnd > dayStart;
    });
  };

  // Check if a date range is blocked for daily rentals
  const isDateRangeBlocked = (startDate: Date, days: number): boolean => {
    if (!existingReservations) return false;
    
    const rangeStart = startOfDay(startDate);
    const rangeEnd = addDays(rangeStart, days);
    
    return existingReservations.some((r) => {
      const rStart = new Date(r.start_time);
      const rEnd = new Date(r.end_time);
      return rStart < rangeEnd && rEnd > rangeStart;
    });
  };

  // Get available hours for selected date
  const availableHours = useMemo(() => {
    if (!selectedDate) return [];
    const bookedHours = new Set(getBookedHoursForDate(selectedDate));
    const now = new Date();
    
    return Array.from({ length: 24 }, (_, i) => {
      const isBooked = bookedHours.has(i);
      const isPast = isSameDay(selectedDate, now) && i <= now.getHours();
      return {
        hour: i,
        available: !isBooked && !isPast,
        isBooked,
        isPast,
      };
    });
  }, [selectedDate, existingReservations]);

  // Check if a time slot is available
  const isSlotAvailable = (start: Date, end: Date) => {
    if (!existingReservations) return true;
    
    // Validate dates
    if (isBefore(start, new Date())) return false;
    if (isBefore(end, start)) return false;
    if (start.getTime() === end.getTime()) return false;
    
    return !existingReservations.some((r) => {
      const rStart = new Date(r.start_time);
      const rEnd = new Date(r.end_time);
      return (start < rEnd && end > rStart);
    });
  };

  // Calculate reservation details with validation
  const reservationDetails = useMemo(() => {
    if (!selectedDate || !server) return null;

    const durationNum = parseInt(duration);
    
    // Validate duration
    if (isNaN(durationNum) || durationNum <= 0) {
      return { error: "Invalid duration", valid: false };
    }

    let startTime: Date;
    let endTime: Date;
    let totalPrice: number;

    if (rentalType === "hourly") {
      const hourNum = parseInt(startHour);
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        return { error: "Invalid start hour", valid: false };
      }
      
      startTime = setMinutes(setHours(selectedDate, hourNum), 0);
      endTime = addHours(startTime, durationNum);
      
      // Pricing: hourly_price × hours (no partial hours allowed)
      totalPrice = Number(server.hourly_price) * durationNum;
    } else {
      startTime = startOfDay(selectedDate);
      endTime = addDays(startTime, durationNum);
      
      // Pricing: daily_price × days (full days only)
      totalPrice = Number(server.daily_price) * durationNum;
    }

    // Validate dates
    if (isBefore(startTime, new Date())) {
      return { error: "Cannot book in the past", valid: false, startTime, endTime, totalPrice };
    }

    if (isBefore(endTime, startTime)) {
      return { error: "End time must be after start time", valid: false, startTime, endTime, totalPrice };
    }

    // Validate price
    if (totalPrice <= 0 || isNaN(totalPrice)) {
      return { error: "Invalid price calculation", valid: false, startTime, endTime, totalPrice: 0 };
    }

    const available = isSlotAvailable(startTime, endTime);

    return {
      startTime,
      endTime,
      totalPrice,
      available,
      valid: true,
      durationDisplay: rentalType === "hourly" 
        ? `${durationNum} hour${durationNum > 1 ? 's' : ''}`
        : `${durationNum} day${durationNum > 1 ? 's' : ''}`,
    };
  }, [selectedDate, startHour, duration, rentalType, server, existingReservations]);

  const handleProceedToCheckout = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a reservation.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!reservationDetails?.valid) {
      toast({
        title: "Invalid selection",
        description: reservationDetails?.error || "Please check your selection.",
        variant: "destructive",
      });
      return;
    }

    if (!reservationDetails?.available) {
      toast({
        title: "Time slot unavailable",
        description: "This time slot is already booked. Please select a different time.",
        variant: "destructive",
      });
      return;
    }

    setStep("checkout");
  };

  const handleConfirmReservation = async () => {
    if (!server || !reservationDetails?.valid || !reservationDetails.startTime || !id) return;

    try {
      await createReservation.mutateAsync({
        server_id: id,
        rental_type: rentalType,
        start_time: reservationDetails.startTime.toISOString(),
        end_time: reservationDetails.endTime!.toISOString(),
        total_price: reservationDetails.totalPrice,
      });

      setStep("success");
      toast({
        title: "Reservation confirmed!",
        description: "Your server rental has been booked successfully.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "There was an error creating your reservation.";
      toast({
        title: "Reservation failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (serverLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Server Not Found</h1>
          <Button onClick={() => navigate("/servers")}>Back to Servers</Button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card variant="glow" className="max-w-lg mx-auto text-center">
            <CardContent className="pt-8">
              <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-10 w-10 text-success" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Reservation Confirmed!</h1>
              <p className="text-muted-foreground mb-6">
                Your server rental has been booked. Check your dashboard for credentials once assigned.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => navigate("/servers")}>
                  Browse More
                </Button>
                <Button variant="hero" onClick={() => navigate("/dashboard")}>
                  View Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => step === "checkout" ? setStep("select") : navigate("/servers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === "checkout" ? "Back to Selection" : "Back to Servers"}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Server Info - Collapsible on mobile */}
          <Card variant="gradient" className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg lg:text-xl">{server.name}</CardTitle>
              <CardDescription>Server Specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 lg:h-5 lg:w-5 text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">CPU</div>
                    <div className="font-medium text-sm truncate">{server.cpu_model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MonitorDot className="h-4 w-4 lg:h-5 lg:w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">GPU</div>
                    <div className="font-medium text-sm truncate">{server.gpu_model}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MemoryStick className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">RAM</div>
                    <div className="font-medium text-sm">{server.ram_gb} GB</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">Storage</div>
                    <div className="font-medium text-sm">{server.storage_gb} GB</div>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Operating System</div>
                <Badge variant="outline" className="text-xs">{server.os_name}</Badge>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Hourly</div>
                    <div className="text-lg lg:text-xl font-bold text-gradient">${Number(server.hourly_price).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Daily</div>
                    <div className="text-lg lg:text-xl font-bold text-gradient">${Number(server.daily_price).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selection / Checkout */}
          <div className="lg:col-span-2">
            {step === "select" ? (
              <Card variant="glow">
                <CardHeader>
                  <CardTitle>Select Rental Period</CardTitle>
                  <CardDescription>Choose your rental type and time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Rental Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={rentalType === "hourly" ? "hero" : "outline"}
                      className="flex-1"
                      onClick={() => setRentalType("hourly")}
                    >
                      <Clock className="mr-1 sm:mr-2 h-4 w-4" />
                      <span className="hidden xs:inline">Hourly</span>
                      <span className="xs:hidden">Hour</span>
                    </Button>
                    <Button
                      variant={rentalType === "daily" ? "hero" : "outline"}
                      className="flex-1"
                      onClick={() => setRentalType("daily")}
                    >
                      <CalendarDays className="mr-1 sm:mr-2 h-4 w-4" />
                      <span className="hidden xs:inline">Daily</span>
                      <span className="xs:hidden">Day</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Calendar */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Date</label>
                      <div className="border border-border rounded-lg p-3 bg-card">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => isBefore(date, startOfDay(new Date())) || isDateFullyBooked(date)}
                          modifiers={{
                            booked: (date) => dateHasBookings(date) && !isDateFullyBooked(date),
                            fullyBooked: (date) => isDateFullyBooked(date),
                          }}
                          modifiersStyles={{
                            booked: { 
                              backgroundColor: "hsl(var(--warning) / 0.2)",
                              color: "hsl(var(--warning))",
                            },
                            fullyBooked: {
                              backgroundColor: "hsl(var(--destructive) / 0.2)",
                              color: "hsl(var(--muted-foreground))",
                              textDecoration: "line-through",
                            },
                          }}
                          className="pointer-events-auto"
                        />
                        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-primary" />
                            <span>Selected</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-warning/20 border border-warning" />
                            <span>Partially Booked</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-destructive/20" />
                            <span>Fully Booked</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-4">
                      {rentalType === "hourly" && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Start Time</label>
                          <Select value={startHour} onValueChange={setStartHour}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableHours.map(({ hour, available, isBooked, isPast }) => (
                                <SelectItem 
                                  key={hour} 
                                  value={hour.toString()}
                                  disabled={!available}
                                  className={!available ? "opacity-50" : ""}
                                >
                                  <div className="flex items-center gap-2">
                                    {!available && <Lock className="h-3 w-3" />}
                                    <span>{hour.toString().padStart(2, "0")}:00</span>
                                    {isBooked && <Badge variant="destructive" className="text-xs ml-2">Booked</Badge>}
                                    {isPast && !isBooked && <Badge variant="secondary" className="text-xs ml-2">Past</Badge>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {availableHours.filter(h => h.available).length} of 24 hours available on {format(selectedDate, "MMM d")}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Duration ({rentalType === "hourly" ? "Hours" : "Days"})
                        </label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: rentalType === "hourly" ? 24 : 30 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1} {rentalType === "hourly" ? (i === 0 ? "hour" : "hours") : (i === 0 ? "day" : "days")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Summary */}
                      {reservationDetails && reservationDetails.valid && reservationDetails.startTime && (
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Start</span>
                            <span>{format(reservationDetails.startTime, "PPP p")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">End</span>
                            <span>{format(reservationDetails.endTime!, "PPP p")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Duration</span>
                            <span>{reservationDetails.durationDisplay}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-border">
                            <span className="text-muted-foreground">Availability</span>
                            <Badge variant={reservationDetails.available ? "success" : "destructive"}>
                              {reservationDetails.available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                            <span>Total</span>
                            <span className="text-gradient">${reservationDetails.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rentalType === "hourly" 
                              ? `${duration} hour(s) × $${Number(server.hourly_price).toFixed(2)}/hr`
                              : `${duration} day(s) × $${Number(server.daily_price).toFixed(2)}/day`
                            }
                          </div>
                        </div>
                      )}

                      {reservationDetails && !reservationDetails.valid && (
                        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <span className="text-sm text-destructive">{reservationDetails.error}</span>
                        </div>
                      )}

                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full"
                        onClick={handleProceedToCheckout}
                        disabled={!reservationDetails?.valid || !reservationDetails?.available}
                      >
                        <CreditCard className="mr-2 h-5 w-5" />
                        Proceed to Checkout
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card variant="glow">
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                  <CardDescription>Review and confirm your reservation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h3 className="font-semibold">Reservation Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Server</div>
                        <div className="font-medium">{server.name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rental Type</div>
                        <div className="font-medium capitalize">{rentalType}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Start</div>
                        <div className="font-medium">{reservationDetails?.startTime && format(reservationDetails.startTime, "PPP p")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">End</div>
                        <div className="font-medium">{reservationDetails?.endTime && format(reservationDetails.endTime, "PPP p")}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">{reservationDetails?.durationDisplay}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rate</div>
                        <div className="font-medium">
                          ${rentalType === "hourly" ? Number(server.hourly_price).toFixed(2) : Number(server.daily_price).toFixed(2)}/{rentalType === "hourly" ? "hr" : "day"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-primary/30 rounded-lg bg-primary/5">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Total Amount</span>
                      <span className="text-3xl font-bold text-gradient">
                        ${reservationDetails?.totalPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {rentalType === "hourly" 
                        ? `${duration} hour(s) × $${Number(server.hourly_price).toFixed(2)}/hr`
                        : `${duration} day(s) × $${Number(server.daily_price).toFixed(2)}/day`
                      }
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    This is a simulated payment. Click confirm to complete your reservation.
                  </p>

                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={handleConfirmReservation}
                    disabled={createReservation.isPending}
                  >
                    {createReservation.isPending ? (
                      "Processing..."
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Confirm Reservation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

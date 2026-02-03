'use client';

import React, { useState, useEffect } from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Globe, MapPin, Video, Car, Save, Loader2, Plus, Trash2, Calendar, Monitor } from "lucide-react";
import AddressInput, { GooglePlace } from "@/components/ux/AddressInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import { usePractitionerSchedule, PractitionerWeekday, DeliveryMethodsConfig } from "./hooks/UsePractitionerSchedule";
import { useUpdatePractitionerSchedule } from "./hooks/UseUpdatePractitionerSchedule";
import DateOverridesSection from "./components/DateOverridesSection";

// Common timezones
const TIMEZONES = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona (AZ)" },
    { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
    { value: "America/Anchorage", label: "Alaska (AKT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Europe/Berlin", label: "Berlin (CET)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
    { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
    { value: "Australia/Perth", label: "Perth (AWST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
];

const COUNTRIES = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "GB", label: "United Kingdom" },
    { value: "AU", label: "Australia" },
    { value: "NZ", label: "New Zealand" },
    { value: "DE", label: "Germany" },
    { value: "FR", label: "France" },
    { value: "JP", label: "Japan" },
    { value: "SG", label: "Singapore" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_WEEKDAYS: PractitionerWeekday[] = DAY_NAMES.map((name, index) => ({
    day: index,
    dayName: name,
    enabled: index >= 1 && index <= 5, // Mon-Fri enabled by default
    timeSlots: index >= 1 && index <= 5 ? [{ id: `default-${index}`, start: "09:00", end: "17:00" }] : [],
}));

const DEFAULT_DELIVERY_METHODS: DeliveryMethodsConfig = {
    online: { enabled: true, defaultMeetingLink: "" },
    atPractitionerLocation: { enabled: false, displayArea: "" },
    mobile: { enabled: false, serviceRadiusKm: 25 },
};

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
};

export default function PractitionerAvailabilityUI({ session, practitionerId, slug }: Props) {
    const { data: schedule, isLoading } = usePractitionerSchedule(practitionerId);
    const updateScheduleMutation = useUpdatePractitionerSchedule();

    // Form state
    const [timezone, setTimezone] = useState("America/New_York");
    const [country, setCountry] = useState("US");
    const [weekdays, setWeekdays] = useState<PractitionerWeekday[]>(DEFAULT_WEEKDAYS);
    const [bufferMinutes, setBufferMinutes] = useState(15);
    const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
    const [minimumNoticeHours, setMinimumNoticeHours] = useState(24);
    const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethodsConfig>(DEFAULT_DELIVERY_METHODS);

    // Populate form when schedule loads
    useEffect(() => {
        if (schedule) {
            setTimezone(schedule.timezone || "America/New_York");
            setCountry(schedule.country || "US");
            setWeekdays(schedule.weekdays?.length > 0 ? schedule.weekdays : DEFAULT_WEEKDAYS);
            setBufferMinutes(schedule.bufferMinutes ?? 15);
            setAdvanceBookingDays(schedule.advanceBookingDays ?? 30);
            setMinimumNoticeHours(schedule.minimumNoticeHours ?? 24);
            setDeliveryMethods(schedule.deliveryMethods || DEFAULT_DELIVERY_METHODS);
        }
    }, [schedule]);

    const handleSave = async () => {
        try {
            await updateScheduleMutation.mutateAsync({
                practitionerId,
                input: {
                    timezone,
                    country,
                    weekdays,
                    bufferMinutes,
                    advanceBookingDays,
                    minimumNoticeHours,
                    deliveryMethods,
                },
            });
            toast.success("Availability saved successfully");
        } catch (error) {
            console.error("Failed to save availability:", error);
            toast.error("Failed to save availability");
        }
    };

    const toggleDay = (dayIndex: number) => {
        setWeekdays(prev =>
            prev.map(day =>
                day.day === dayIndex
                    ? {
                          ...day,
                          enabled: !day.enabled,
                          timeSlots: !day.enabled && day.timeSlots.length === 0
                              ? [{ id: `slot-${Date.now()}`, start: "09:00", end: "17:00" }]
                              : day.timeSlots,
                      }
                    : day
            )
        );
    };

    const addTimeSlot = (dayIndex: number) => {
        setWeekdays(prev =>
            prev.map(day =>
                day.day === dayIndex
                    ? {
                          ...day,
                          timeSlots: [...day.timeSlots, { id: `slot-${Date.now()}`, start: "09:00", end: "17:00" }],
                      }
                    : day
            )
        );
    };

    const removeTimeSlot = (dayIndex: number, slotId: string) => {
        setWeekdays(prev =>
            prev.map(day =>
                day.day === dayIndex
                    ? { ...day, timeSlots: day.timeSlots.filter(slot => slot.id !== slotId) }
                    : day
            )
        );
    };

    const updateTimeSlot = (dayIndex: number, slotId: string, field: 'start' | 'end', value: string) => {
        setWeekdays(prev =>
            prev.map(day =>
                day.day === dayIndex
                    ? {
                          ...day,
                          timeSlots: day.timeSlots.map(slot =>
                              slot.id === slotId ? { ...slot, [field]: value } : slot
                          ),
                      }
                    : day
            )
        );
    };

    const updateTimeSlotLocation = (dayIndex: number, slotId: string, location: GooglePlace | null) => {
        setWeekdays(prev =>
            prev.map(day =>
                day.day === dayIndex
                    ? {
                          ...day,
                          timeSlots: day.timeSlots.map(slot =>
                              slot.id === slotId
                                  ? {
                                        ...slot,
                                        location: location
                                            ? { id: location.id, formattedAddress: location.formattedAddress }
                                            : null,
                                    }
                                  : slot
                          ),
                      }
                    : day
            )
        );
    };

    if (isLoading) {
        return (
            <div className="flex min-h-full">
                <PractitionerSideNav session={session} practitionerId={practitionerId} practitionerSlug={slug} />
                <div className="flex-1 md:ml-[200px] p-4 md:p-6 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-full">
            <PractitionerSideNav session={session} practitionerId={practitionerId} practitionerSlug={slug} />

            <div className="flex-1 md:ml-[200px] p-4 md:p-6">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <Clock className="w-6 h-6 text-purple-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Availability</h1>
                            </div>
                            <p className="text-slate-400">
                                Set your working hours and availability for live readings
                            </p>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={updateScheduleMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid="save-availability-btn"
                        >
                            {updateScheduleMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>

                    <Tabs defaultValue="schedule" className="space-y-6">
                        <TabsList className="bg-slate-800/50 border border-slate-700">
                            <TabsTrigger value="schedule" className="data-[state=active]:bg-purple-600">
                                <Clock className="w-4 h-4 mr-2" />
                                Weekly Schedule
                            </TabsTrigger>
                            <TabsTrigger value="delivery" className="data-[state=active]:bg-purple-600">
                                <Video className="w-4 h-4 mr-2" />
                                Delivery Methods
                            </TabsTrigger>
                            <TabsTrigger value="overrides" className="data-[state=active]:bg-purple-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                Date Overrides
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
                                <Globe className="w-4 h-4 mr-2" />
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        {/* Weekly Schedule Tab */}
                        <TabsContent value="schedule" className="space-y-4">
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Weekly Schedule</CardTitle>
                                    <CardDescription>Set your regular working hours for each day</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {weekdays.map(day => (
                                        <div
                                            key={day.day}
                                            className="flex flex-col gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50"
                                            data-testid={`weekday-${day.dayName.toLowerCase()}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={day.enabled}
                                                        onCheckedChange={() => toggleDay(day.day)}
                                                        data-testid={`toggle-${day.dayName.toLowerCase()}`}
                                                    />
                                                    <span className={`font-medium ${day.enabled ? 'text-white' : 'text-slate-500'}`}>
                                                        {day.dayName}
                                                    </span>
                                                </div>
                                                {day.enabled && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => addTimeSlot(day.day)}
                                                        className="text-purple-400 hover:text-purple-300"
                                                        data-testid={`add-slot-${day.dayName.toLowerCase()}`}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Add Time Slot
                                                    </Button>
                                                )}
                                            </div>

                                            {day.enabled && day.timeSlots.length > 0 && (
                                                <div className="pl-10 space-y-4">
                                                    {day.timeSlots.map(slot => (
                                                        <div
                                                            key={slot.id}
                                                            className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 space-y-3"
                                                        >
                                                            {/* Time row */}
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="time"
                                                                    value={slot.start}
                                                                    onChange={e => updateTimeSlot(day.day, slot.id, 'start', e.target.value)}
                                                                    className="w-32 bg-slate-800 border-slate-600 text-white"
                                                                    data-testid={`slot-start-${slot.id}`}
                                                                />
                                                                <span className="text-slate-400">to</span>
                                                                <Input
                                                                    type="time"
                                                                    value={slot.end}
                                                                    onChange={e => updateTimeSlot(day.day, slot.id, 'end', e.target.value)}
                                                                    className="w-32 bg-slate-800 border-slate-600 text-white"
                                                                    data-testid={`slot-end-${slot.id}`}
                                                                />
                                                                {day.timeSlots.length > 1 && (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => removeTimeSlot(day.day, slot.id)}
                                                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                                        data-testid={`remove-slot-${slot.id}`}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                )}
                                                            </div>

                                                            {/* Location row */}
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-sm text-slate-400">Location:</span>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant={!slot.location ? "default" : "outline"}
                                                                            className={!slot.location
                                                                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
                                                                            }
                                                                            onClick={() => updateTimeSlotLocation(day.day, slot.id, null)}
                                                                            data-testid={`slot-location-online-${slot.id}`}
                                                                        >
                                                                            <Monitor className="w-4 h-4 mr-1" />
                                                                            Online
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant={slot.location ? "default" : "outline"}
                                                                            className={slot.location
                                                                                ? "bg-purple-600 hover:bg-purple-700 text-white"
                                                                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
                                                                            }
                                                                            onClick={() => {
                                                                                // If not already set, initialize with empty location to trigger address input
                                                                                if (!slot.location) {
                                                                                    updateTimeSlotLocation(day.day, slot.id, {
                                                                                        id: '',
                                                                                        formattedAddress: '',
                                                                                        components: { city: '', country: '', line1: '', postal_code: '' },
                                                                                        point: { type: 'Point', coordinates: { lng: 0, lat: 0 } }
                                                                                    });
                                                                                }
                                                                            }}
                                                                            data-testid={`slot-location-inperson-${slot.id}`}
                                                                        >
                                                                            <MapPin className="w-4 h-4 mr-1" />
                                                                            In-Person
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Address input when In-Person is selected */}
                                                                {slot.location && (
                                                                    <div className="mt-2">
                                                                        <AddressInput
                                                                            name={`slot-address-${slot.id}`}
                                                                            value={slot.location?.id ? {
                                                                                id: slot.location.id,
                                                                                formattedAddress: slot.location.formattedAddress,
                                                                                components: { city: '', country: '', line1: '', postal_code: '' },
                                                                                point: { type: 'Point', coordinates: { lng: 0, lat: 0 } }
                                                                            } : null}
                                                                            onChange={(place) => updateTimeSlotLocation(day.day, slot.id, place)}
                                                                            onBlur={() => {}}
                                                                            placeholder="Search for an address..."
                                                                            aria-label="Time slot location"
                                                                        />
                                                                        <p className="text-xs text-slate-500 mt-1">
                                                                            Search and select an address for this time slot
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Delivery Methods Tab */}
                        <TabsContent value="delivery" className="space-y-4">
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Video className="w-5 h-5 text-purple-400" />
                                        Online Sessions
                                    </CardTitle>
                                    <CardDescription>Video call sessions via Zoom, Google Meet, etc.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="online-enabled" className="text-white">Enable online sessions</Label>
                                        <Switch
                                            id="online-enabled"
                                            checked={deliveryMethods.online.enabled}
                                            onCheckedChange={checked =>
                                                setDeliveryMethods(prev => ({
                                                    ...prev,
                                                    online: { ...prev.online, enabled: checked },
                                                }))
                                            }
                                            data-testid="toggle-online-delivery"
                                        />
                                    </div>
                                    {deliveryMethods.online.enabled && (
                                        <div>
                                            <Label htmlFor="meeting-link" className="text-slate-300">
                                                Default Meeting Link (optional)
                                            </Label>
                                            <Input
                                                id="meeting-link"
                                                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                                                value={deliveryMethods.online.defaultMeetingLink || ""}
                                                onChange={e =>
                                                    setDeliveryMethods(prev => ({
                                                        ...prev,
                                                        online: { ...prev.online, defaultMeetingLink: e.target.value },
                                                    }))
                                                }
                                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                                data-testid="default-meeting-link-input"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Pre-fill this when confirming bookings. You can override per booking.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-purple-400" />
                                        At Your Location
                                    </CardTitle>
                                    <CardDescription>Customers come to your studio or office</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="location-enabled" className="text-white">Enable in-person sessions</Label>
                                        <Switch
                                            id="location-enabled"
                                            checked={deliveryMethods.atPractitionerLocation.enabled}
                                            onCheckedChange={checked =>
                                                setDeliveryMethods(prev => ({
                                                    ...prev,
                                                    atPractitionerLocation: { ...prev.atPractitionerLocation, enabled: checked },
                                                }))
                                            }
                                            data-testid="toggle-location-delivery"
                                        />
                                    </div>
                                    {deliveryMethods.atPractitionerLocation.enabled && (
                                        <div>
                                            <Label htmlFor="display-area" className="text-slate-300">
                                                Display Area (shown before booking)
                                            </Label>
                                            <Input
                                                id="display-area"
                                                placeholder="e.g., Brooklyn, NY"
                                                value={deliveryMethods.atPractitionerLocation.displayArea || ""}
                                                onChange={e =>
                                                    setDeliveryMethods(prev => ({
                                                        ...prev,
                                                        atPractitionerLocation: {
                                                            ...prev.atPractitionerLocation,
                                                            displayArea: e.target.value,
                                                        },
                                                    }))
                                                }
                                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                                data-testid="display-area-input"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Your full address will be shared only after confirming the booking.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Car className="w-5 h-5 text-purple-400" />
                                        Mobile Service
                                    </CardTitle>
                                    <CardDescription>You travel to the customer&apos;s location</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="mobile-enabled" className="text-white">Enable mobile service</Label>
                                        <Switch
                                            id="mobile-enabled"
                                            checked={deliveryMethods.mobile.enabled}
                                            onCheckedChange={checked =>
                                                setDeliveryMethods(prev => ({
                                                    ...prev,
                                                    mobile: { ...prev.mobile, enabled: checked },
                                                }))
                                            }
                                            data-testid="toggle-mobile-delivery"
                                        />
                                    </div>
                                    {deliveryMethods.mobile.enabled && (
                                        <>
                                            <div>
                                                <Label htmlFor="service-radius" className="text-slate-300">
                                                    Service Radius (km)
                                                </Label>
                                                <Input
                                                    id="service-radius"
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={deliveryMethods.mobile.serviceRadiusKm || 25}
                                                    onChange={e =>
                                                        setDeliveryMethods(prev => ({
                                                            ...prev,
                                                            mobile: {
                                                                ...prev.mobile,
                                                                serviceRadiusKm: parseInt(e.target.value) || 25,
                                                            },
                                                        }))
                                                    }
                                                    className="mt-2 w-32 bg-slate-800 border-slate-600 text-white"
                                                    data-testid="service-radius-input"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="travel-surcharge" className="text-slate-300">
                                                    Travel Surcharge ($)
                                                </Label>
                                                <Input
                                                    id="travel-surcharge"
                                                    type="number"
                                                    min={0}
                                                    step={5}
                                                    value={deliveryMethods.mobile.travelSurcharge?.amount || 0}
                                                    onChange={e =>
                                                        setDeliveryMethods(prev => ({
                                                            ...prev,
                                                            mobile: {
                                                                ...prev.mobile,
                                                                travelSurcharge: {
                                                                    amount: parseFloat(e.target.value) || 0,
                                                                    currency: "USD",
                                                                },
                                                            },
                                                        }))
                                                    }
                                                    className="mt-2 w-32 bg-slate-800 border-slate-600 text-white"
                                                    data-testid="travel-surcharge-input"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Additional charge for travel. Set to 0 for no surcharge.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Date Overrides Tab */}
                        <TabsContent value="overrides">
                            <DateOverridesSection
                                practitionerId={practitionerId}
                                dateOverrides={schedule?.dateOverrides || []}
                            />
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="space-y-4">
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Timezone & Location</CardTitle>
                                    <CardDescription>Set your timezone for accurate scheduling</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="country" className="text-slate-300">Country</Label>
                                            <Select value={country} onValueChange={setCountry}>
                                                <SelectTrigger className="mt-2 bg-slate-800 border-slate-600 text-white" data-testid="country-select">
                                                    <SelectValue placeholder="Select country" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600">
                                                    {COUNTRIES.map(c => (
                                                        <SelectItem key={c.value} value={c.value} className="text-white">
                                                            {c.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="timezone" className="text-slate-300">Timezone</Label>
                                            <Select value={timezone} onValueChange={setTimezone}>
                                                <SelectTrigger className="mt-2 bg-slate-800 border-slate-600 text-white" data-testid="timezone-select">
                                                    <SelectValue placeholder="Select timezone" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600">
                                                    {TIMEZONES.map(tz => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-white">
                                                            {tz.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Booking Settings</CardTitle>
                                    <CardDescription>Configure how customers can book with you</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="buffer" className="text-slate-300">Buffer Between Sessions (min)</Label>
                                            <Input
                                                id="buffer"
                                                type="number"
                                                min={0}
                                                max={60}
                                                value={bufferMinutes}
                                                onChange={e => setBufferMinutes(parseInt(e.target.value) || 15)}
                                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                                data-testid="buffer-minutes-input"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Time between appointments</p>
                                        </div>
                                        <div>
                                            <Label htmlFor="advance" className="text-slate-300">Advance Booking (days)</Label>
                                            <Input
                                                id="advance"
                                                type="number"
                                                min={1}
                                                max={365}
                                                value={advanceBookingDays}
                                                onChange={e => setAdvanceBookingDays(parseInt(e.target.value) || 30)}
                                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                                data-testid="advance-booking-days-input"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">How far ahead customers can book</p>
                                        </div>
                                        <div>
                                            <Label htmlFor="notice" className="text-slate-300">Minimum Notice (hours)</Label>
                                            <Input
                                                id="notice"
                                                type="number"
                                                min={1}
                                                max={168}
                                                value={minimumNoticeHours}
                                                onChange={e => setMinimumNoticeHours(parseInt(e.target.value) || 24)}
                                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                                data-testid="minimum-notice-hours-input"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Required notice before booking</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

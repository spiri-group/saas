'use client';

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Trash2, Ban, Clock, Loader2, Monitor, MapPin } from "lucide-react";
import AddressInput, { GooglePlace } from "@/components/ux/AddressInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { DateOverride } from "../hooks/UsePractitionerSchedule";
import { useSetPractitionerDateOverride, useRemovePractitionerDateOverride } from "../hooks/UseUpdatePractitionerSchedule";

interface CustomSlot {
    start: string;
    end: string;
    location: { id: string; formattedAddress: string } | null;
}

interface Props {
    practitionerId: string;
    dateOverrides: DateOverride[];
}

export default function DateOverridesSection({ practitionerId, dateOverrides }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState("");
    const [overrideType, setOverrideType] = useState<"BLOCKED" | "CUSTOM">("BLOCKED");
    const [reason, setReason] = useState("");
    const [customSlots, setCustomSlots] = useState<CustomSlot[]>([{ start: "09:00", end: "17:00", location: null }]);

    const setOverrideMutation = useSetPractitionerDateOverride();
    const removeOverrideMutation = useRemovePractitionerDateOverride();

    const handleAddOverride = async () => {
        if (!selectedDate) {
            toast.error("Please select a date");
            return;
        }

        try {
            await setOverrideMutation.mutateAsync({
                practitionerId,
                input: {
                    date: selectedDate,
                    type: overrideType,
                    timeSlots: overrideType === "CUSTOM" ? customSlots : undefined,
                    reason: reason || undefined,
                },
            });
            toast.success("Date override added");
            setDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to add date override:", error);
            toast.error("Failed to add date override");
        }
    };

    const handleRemoveOverride = async (date: string) => {
        try {
            await removeOverrideMutation.mutateAsync({ practitionerId, date });
            toast.success("Date override removed");
        } catch (error) {
            console.error("Failed to remove date override:", error);
            toast.error("Failed to remove date override");
        }
    };

    const resetForm = () => {
        setSelectedDate("");
        setOverrideType("BLOCKED");
        setReason("");
        setCustomSlots([{ start: "09:00", end: "17:00", location: null }]);
    };

    const addCustomSlot = () => {
        setCustomSlots(prev => [...prev, { start: "09:00", end: "17:00", location: null }]);
    };

    const removeCustomSlot = (index: number) => {
        setCustomSlots(prev => prev.filter((_, i) => i !== index));
    };

    const updateCustomSlot = (index: number, field: 'start' | 'end', value: string) => {
        setCustomSlots(prev =>
            prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
        );
    };

    const updateCustomSlotLocation = (index: number, place: GooglePlace | null) => {
        setCustomSlots(prev =>
            prev.map((slot, i) =>
                i === index
                    ? {
                          ...slot,
                          location: place ? { id: place.id, formattedAddress: place.formattedAddress } : null,
                      }
                    : slot
            )
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const sortedOverrides = [...dateOverrides].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Get today's date in YYYY-MM-DD format for the date input min
    const today = new Date().toISOString().split('T')[0];

    return (
        <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Date Overrides
                    </CardTitle>
                    <CardDescription>Block specific dates or set custom hours</CardDescription>
                </div>
                <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="add-date-override-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Override
                </Button>
            </CardHeader>
            <CardContent>
                {sortedOverrides.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No date overrides set</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Add overrides to block specific dates or set custom hours
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedOverrides.map(override => (
                            <div
                                key={override.date}
                                className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700/50"
                                data-testid={`date-override-${override.date}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${override.type === 'BLOCKED' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                                        {override.type === 'BLOCKED' ? (
                                            <Ban className="w-5 h-5 text-red-400" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-yellow-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{formatDate(override.date)}</p>
                                        <div className="text-sm text-slate-400">
                                            {override.type === 'BLOCKED' ? (
                                                <p>Blocked{override.reason && ` - ${override.reason}`}</p>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p>Custom hours:</p>
                                                    {override.timeSlots?.map((slot, i) => (
                                                        <p key={i} className="pl-2">
                                                            {slot.start} - {slot.end}
                                                            {slot.location?.formattedAddress ? (
                                                                <span className="ml-2 text-slate-500">
                                                                    <MapPin className="w-3 h-3 inline mr-1" />
                                                                    {slot.location.formattedAddress}
                                                                </span>
                                                            ) : (
                                                                <span className="ml-2 text-slate-500">
                                                                    <Monitor className="w-3 h-3 inline mr-1" />
                                                                    Online
                                                                </span>
                                                            )}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveOverride(override.date)}
                                    disabled={removeOverrideMutation.isPending}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                    data-testid={`remove-override-${override.date}`}
                                >
                                    {removeOverrideMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Add Override Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Add Date Override</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Block a date completely or set custom hours for a specific day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div>
                            <Label htmlFor="override-date" className="text-slate-300">Date</Label>
                            <Input
                                id="override-date"
                                type="date"
                                min={today}
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="mt-2 bg-slate-800 border-slate-600 text-white"
                                data-testid="override-date-input"
                            />
                        </div>

                        <div>
                            <Label className="text-slate-300">Override Type</Label>
                            <RadioGroup
                                value={overrideType}
                                onValueChange={v => setOverrideType(v as "BLOCKED" | "CUSTOM")}
                                className="mt-2 space-y-2"
                            >
                                <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <RadioGroupItem value="BLOCKED" id="blocked" data-testid="override-type-blocked" />
                                    <Label htmlFor="blocked" className="flex items-center gap-2 cursor-pointer">
                                        <Ban className="w-4 h-4 text-red-400" />
                                        <span>Block this day</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                                    <RadioGroupItem value="CUSTOM" id="custom" data-testid="override-type-custom" />
                                    <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                                        <Clock className="w-4 h-4 text-yellow-400" />
                                        <span>Set custom hours</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {overrideType === "BLOCKED" && (
                            <div>
                                <Label htmlFor="reason" className="text-slate-300">Reason (optional)</Label>
                                <Input
                                    id="reason"
                                    placeholder="e.g., Holiday, Personal day"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="mt-2 bg-slate-800 border-slate-600 text-white"
                                    data-testid="override-reason-input"
                                />
                            </div>
                        )}

                        {overrideType === "CUSTOM" && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-300">Custom Time Slots</Label>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={addCustomSlot}
                                        className="text-purple-400 hover:text-purple-300"
                                        data-testid="add-custom-slot-btn"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Slot
                                    </Button>
                                </div>
                                {customSlots.map((slot, index) => (
                                    <div
                                        key={index}
                                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 space-y-3"
                                    >
                                        {/* Time row */}
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={slot.start}
                                                onChange={e => updateCustomSlot(index, 'start', e.target.value)}
                                                className="w-32 bg-slate-800 border-slate-600 text-white"
                                                data-testid={`custom-slot-start-${index}`}
                                            />
                                            <span className="text-slate-400">to</span>
                                            <Input
                                                type="time"
                                                value={slot.end}
                                                onChange={e => updateCustomSlot(index, 'end', e.target.value)}
                                                className="w-32 bg-slate-800 border-slate-600 text-white"
                                                data-testid={`custom-slot-end-${index}`}
                                            />
                                            {customSlots.length > 1 && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeCustomSlot(index)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                    data-testid={`remove-custom-slot-${index}`}
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
                                                        onClick={() => updateCustomSlotLocation(index, null)}
                                                        data-testid={`custom-slot-location-online-${index}`}
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
                                                            if (!slot.location) {
                                                                // Initialize with empty location to show address input
                                                                setCustomSlots(prev =>
                                                                    prev.map((s, i) =>
                                                                        i === index
                                                                            ? { ...s, location: { id: '', formattedAddress: '' } }
                                                                            : s
                                                                    )
                                                                );
                                                            }
                                                        }}
                                                        data-testid={`custom-slot-location-inperson-${index}`}
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
                                                        name={`custom-slot-address-${index}`}
                                                        value={slot.location?.id ? {
                                                            id: slot.location.id,
                                                            formattedAddress: slot.location.formattedAddress,
                                                            components: { city: '', country: '', line1: '', postal_code: '' },
                                                            point: { type: 'Point', coordinates: { lng: 0, lat: 0 } }
                                                        } : null}
                                                        onChange={(place) => updateCustomSlotLocation(index, place)}
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

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddOverride}
                            disabled={setOverrideMutation.isPending || !selectedDate}
                            className="bg-purple-600 hover:bg-purple-700"
                            data-testid="save-override-btn"
                        >
                            {setOverrideMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Add Override'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Calendar, Clock, Video, MapPin, Car, ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useAvailableSlots } from "../hooks/UseAvailableSlots";
import { useBookScheduledService, BookScheduledServiceInput } from "../hooks/UseBookScheduledService";
import { toast } from "sonner";

interface DeliveryMethodsConfig {
    online?: { enabled: boolean; defaultMeetingLink?: string };
    atPractitionerLocation?: { enabled: boolean; displayArea?: string };
    mobile?: { enabled: boolean; serviceRadiusKm?: number; travelSurcharge?: { amount: number; currency: string } };
}

interface ServicePricing {
    type: "FIXED" | "PACKAGE" | "HOURLY";
    fixedPrice?: { amount: number; currency: string };
    packages?: Array<{
        name: string;
        description?: string;
        price: { amount: number; currency: string };
        sessions?: number;
    }>;
    hourlyRate?: { amount: number; currency: string };
}

interface ServiceQuestion {
    id: string;
    question: string;
    type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT";
    required: boolean;
    options?: string[];
}

interface ServiceAddOn {
    id: string;
    name: string;
    description?: string;
    price: { amount: number; currency: string };
}

interface Props {
    vendorId: string;
    serviceId: string;
    customerId?: string;
    serviceName: string;
    serviceDuration?: { amount: number; unit: { id: string; defaultLabel: string } };
    pricing: ServicePricing;
    deliveryMethods?: DeliveryMethodsConfig | null;
    questionnaire?: ServiceQuestion[];
    addOns?: ServiceAddOn[];
    onComplete?: () => void;
}

type QuestionnaireResponses = Record<string, string | string[]>;

const DELIVERY_METHOD_OPTIONS = [
    { value: 'ONLINE', label: 'Online Session', icon: Video, description: 'Video call via Zoom, Google Meet, etc.' },
    { value: 'AT_PRACTITIONER', label: 'At Their Location', icon: MapPin, description: 'Visit the practitioner' },
    { value: 'MOBILE', label: 'They Come to You', icon: Car, description: 'Practitioner travels to your location' },
];

export default function ScheduledBookingFlow({
    vendorId,
    serviceId,
    customerId,
    serviceName,
    serviceDuration,
    pricing,
    deliveryMethods,
    questionnaire,
    addOns,
    onComplete
}: Props) {
    // State
    const [step, setStep] = useState<'delivery' | 'date' | 'time' | 'details' | 'confirm'>('delivery');
    const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
    const [questionnaireResponses, setQuestionnaireResponses] = useState<QuestionnaireResponses>({});
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
    // For package pricing - default to first package (index 0)
    // TODO: Add package selection UI when pricing.type === 'PACKAGE'
    const [selectedPackage, _setSelectedPackage] = useState<number | null>(pricing.type === 'PACKAGE' ? 0 : null);
    void _setSelectedPackage; // Will be used when package selection UI is implemented
    const [calendarStartDate, setCalendarStartDate] = useState(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString().split('T')[0];
    });

    // Customer timezone
    const customerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Calculate date range for availability query (30 days from calendar start)
    const endDate = useMemo(() => {
        const end = new Date(calendarStartDate);
        end.setDate(end.getDate() + 30);
        return end.toISOString().split('T')[0];
    }, [calendarStartDate]);

    // Fetch available slots
    const { data: availableDays, isLoading: loadingSlots, error: slotsError } = useAvailableSlots(
        vendorId,
        serviceId,
        calendarStartDate,
        endDate,
        customerTimezone,
        selectedDeliveryMethod || undefined
    );

    // Book service mutation
    const bookMutation = useBookScheduledService();

    // Available delivery methods based on practitioner config
    const enabledDeliveryMethods = DELIVERY_METHOD_OPTIONS.filter(option => {
        if (!deliveryMethods) return option.value === 'ONLINE'; // Default to online if no config
        if (option.value === 'ONLINE') return deliveryMethods.online?.enabled;
        if (option.value === 'AT_PRACTITIONER') return deliveryMethods.atPractitionerLocation?.enabled;
        if (option.value === 'MOBILE') return deliveryMethods.mobile?.enabled;
        return false;
    });

    // Check if we have questionnaire or add-ons to show
    const hasDetails = (questionnaire && questionnaire.length > 0) || (addOns && addOns.length > 0);

    // Get base price
    const getBasePrice = (): { amount: number; currency: string } => {
        if (pricing.type === "FIXED" && pricing.fixedPrice) {
            return pricing.fixedPrice;
        }
        if (pricing.type === "PACKAGE" && pricing.packages && selectedPackage !== null) {
            return pricing.packages[selectedPackage].price;
        }
        if (pricing.type === "HOURLY" && pricing.hourlyRate) {
            return pricing.hourlyRate;
        }
        return { amount: 0, currency: "USD" };
    };

    const basePrice = getBasePrice();

    // Calculate add-ons total
    const addOnsTotal = selectedAddOns.reduce((total, addOnId) => {
        const addOn = addOns?.find(a => a.id === addOnId);
        return total + (addOn?.price.amount || 0);
    }, 0);

    // Calculate travel surcharge
    const travelSurcharge = selectedDeliveryMethod === 'MOBILE' && deliveryMethods?.mobile?.travelSurcharge
        ? deliveryMethods.mobile.travelSurcharge.amount
        : 0;

    // Calculate total price
    const totalPrice = basePrice.amount + addOnsTotal + travelSurcharge;

    // Calendar navigation
    const navigateCalendar = (direction: 'prev' | 'next') => {
        const current = new Date(calendarStartDate);
        if (direction === 'prev') {
            current.setDate(current.getDate() - 7);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (current < today) return; // Don't go before today
        } else {
            current.setDate(current.getDate() + 7);
        }
        setCalendarStartDate(current.toISOString().split('T')[0]);
        setSelectedDate(null);
        setSelectedSlot(null);
    };

    // Get slots for selected date
    const slotsForSelectedDate = useMemo(() => {
        if (!selectedDate || !availableDays) return [];
        const day = availableDays.find(d => d.date === selectedDate);
        return day?.slots || [];
    }, [selectedDate, availableDays]);

    // Format date for display
    const formatDateForDisplay = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Toggle add-on selection
    const toggleAddOn = (id: string) => {
        setSelectedAddOns(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Set questionnaire response
    const setQuestionResponse = (questionId: string, value: string | string[]) => {
        setQuestionnaireResponses(prev => ({ ...prev, [questionId]: value }));
    };

    // Validate questionnaire
    const isQuestionnaireValid = () => {
        if (!questionnaire) return true;
        return questionnaire.every(q => {
            if (!q.required) return true;
            const response = questionnaireResponses[q.id];
            if (Array.isArray(response)) return response.length > 0;
            return response && response.trim().length > 0;
        });
    };

    // Handle booking
    const handleBook = async () => {
        if (!customerId || !selectedDate || !selectedSlot || !selectedDeliveryMethod) {
            if (!customerId) {
                toast.error("Please sign in to book this service");
            } else {
                toast.error("Please complete all required fields");
            }
            return;
        }

        // Build questionnaire responses array
        const questionnaireResponsesArray = Object.entries(questionnaireResponses).map(([questionId, answer]) => {
            const question = questionnaire?.find(q => q.id === questionId);
            return {
                questionId,
                question: question?.question || '',
                answer: Array.isArray(answer) ? answer.join(', ') : answer
            };
        });

        try {
            const input: BookScheduledServiceInput = {
                vendorId,
                serviceId,
                customerId,
                customerEmail: '', // TODO: Get from session
                date: selectedDate,
                startTime: selectedSlot.start,
                endTime: selectedSlot.end,
                customerTimezone,
                deliveryMethod: selectedDeliveryMethod,
                questionnaireResponses: questionnaireResponsesArray.length > 0 ? questionnaireResponsesArray : undefined,
                selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined
            };

            const result = await bookMutation.mutateAsync(input);

            if (result.success && result.booking) {
                toast.success("Booking request submitted! Awaiting practitioner confirmation.");
                onComplete?.();
            } else {
                toast.error(result.message || "Failed to create booking");
            }
        } catch (error) {
            console.error("Booking error:", error);
            toast.error("An error occurred while creating the booking");
        }
    };

    // Move to next step
    const nextStep = () => {
        if (step === 'delivery') setStep('date');
        else if (step === 'date') setStep('time');
        else if (step === 'time') setStep(hasDetails ? 'details' : 'confirm');
        else if (step === 'details') setStep('confirm');
    };

    // Move to previous step
    const prevStep = () => {
        if (step === 'confirm') setStep(hasDetails ? 'details' : 'time');
        else if (step === 'details') setStep('time');
        else if (step === 'time') setStep('date');
        else if (step === 'date') setStep('delivery');
    };

    // Render delivery method selection
    const renderDeliveryMethodStep = () => (
        <div className="space-y-4">
            <Label className="text-slate-700">How would you like to meet?</Label>
            <RadioGroup
                value={selectedDeliveryMethod || ''}
                onValueChange={(value) => {
                    setSelectedDeliveryMethod(value);
                    setSelectedDate(null);
                    setSelectedSlot(null);
                }}
            >
                {enabledDeliveryMethods.map(option => {
                    const Icon = option.icon;
                    const extraInfo = option.value === 'AT_PRACTITIONER' && deliveryMethods?.atPractitionerLocation?.displayArea
                        ? `(${deliveryMethods.atPractitionerLocation.displayArea})`
                        : option.value === 'MOBILE' && travelSurcharge > 0
                        ? `(+$${travelSurcharge} travel fee)`
                        : '';

                    return (
                        <div
                            key={option.value}
                            className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                selectedDeliveryMethod === option.value
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-slate-200 hover:border-purple-300'
                            }`}
                            onClick={() => {
                                setSelectedDeliveryMethod(option.value);
                                setSelectedDate(null);
                                setSelectedSlot(null);
                            }}
                            data-testid={`delivery-method-${option.value.toLowerCase()}`}
                        >
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Icon className="w-5 h-5 text-purple-600" />
                            <div className="flex-1">
                                <Label htmlFor={option.value} className="font-medium cursor-pointer">
                                    {option.label} {extraInfo && <span className="text-slate-500 text-sm">{extraInfo}</span>}
                                </Label>
                                <p className="text-sm text-slate-500">{option.description}</p>
                            </div>
                        </div>
                    );
                })}
            </RadioGroup>

            {/* Show duration if available */}
            {serviceDuration && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-slate-700">
                        Session duration: {serviceDuration.amount} {serviceDuration.unit.defaultLabel}
                    </span>
                </div>
            )}

            {/* Show base price */}
            <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                <div className="text-2xl font-bold text-purple-700">
                    <CurrencySpan value={basePrice} withAnimation={false} />
                </div>
                {pricing.type === "HOURLY" && (
                    <div className="text-sm text-slate-500">Per Hour</div>
                )}
            </div>

            <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!selectedDeliveryMethod}
                onClick={nextStep}
                data-testid="continue-to-date-btn"
            >
                Continue to Select Date
            </Button>
        </div>
    );

    // Render date selection
    const renderDateStep = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    className="text-purple-600"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateCalendar('prev')}
                        data-testid="calendar-prev-btn"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-slate-600">
                        {new Date(calendarStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateCalendar('next')}
                        data-testid="calendar-next-btn"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-slate-500">Loading available dates...</span>
                </div>
            ) : slotsError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to load available dates. Please try again.</AlertDescription>
                </Alert>
            ) : availableDays && availableDays.length > 0 ? (
                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                            {day}
                        </div>
                    ))}
                    {/* Generate calendar grid */}
                    {(() => {
                        const startOfWeek = new Date(calendarStartDate);
                        const dayOfWeek = startOfWeek.getDay();
                        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

                        const days: React.ReactNode[] = [];
                        for (let i = 0; i < 35; i++) {
                            const date = new Date(startOfWeek);
                            date.setDate(startOfWeek.getDate() + i);
                            const dateStr = date.toISOString().split('T')[0];
                            const isAvailable = availableDays.some(d => d.date === dateStr && d.slots.length > 0);
                            const isSelected = selectedDate === dateStr;
                            const isPast = date < new Date(new Date().toISOString().split('T')[0]);

                            days.push(
                                <button
                                    key={dateStr}
                                    disabled={!isAvailable || isPast}
                                    onClick={() => {
                                        setSelectedDate(dateStr);
                                        setSelectedSlot(null);
                                    }}
                                    className={`p-2 text-sm rounded-lg transition-colors ${
                                        isSelected
                                            ? 'bg-purple-600 text-white'
                                            : isAvailable && !isPast
                                            ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                            : 'text-slate-300 cursor-not-allowed'
                                    }`}
                                    data-testid={`calendar-date-${dateStr}`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        }
                        return days;
                    })()}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No available dates in this period</p>
                    <p className="text-sm">Try selecting a different date range</p>
                </div>
            )}

            {selectedDate && (
                <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={nextStep}
                    data-testid="continue-to-time-btn"
                >
                    Continue to Select Time
                </Button>
            )}
        </div>
    );

    // Render time selection
    const renderTimeStep = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    className="text-purple-600"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                    {selectedDate && formatDateForDisplay(selectedDate)}
                </Badge>
            </div>

            <Label className="text-slate-700">Select a time slot</Label>

            {slotsForSelectedDate.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {slotsForSelectedDate.map((slot, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 text-sm rounded-lg border transition-colors ${
                                selectedSlot?.start === slot.start
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-slate-200 hover:border-purple-300'
                            }`}
                            data-testid={`time-slot-${slot.start}`}
                        >
                            <div className="flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                {slot.start}
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No available time slots for this date</p>
                </div>
            )}

            {selectedSlot && (
                <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={nextStep}
                    data-testid="continue-to-details-btn"
                >
                    {hasDetails ? 'Continue to Details' : 'Review & Confirm'}
                </Button>
            )}
        </div>
    );

    // Render details step (questionnaire + add-ons)
    const renderDetailsStep = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    className="text-purple-600"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                    {selectedDate && formatDateForDisplay(selectedDate)} at {selectedSlot?.start}
                </Badge>
            </div>

            {/* Add-ons */}
            {addOns && addOns.length > 0 && (
                <div className="space-y-3">
                    <Label className="text-slate-700">Add-Ons (Optional)</Label>
                    {addOns.map((addOn) => (
                        <div
                            key={addOn.id}
                            className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 hover:border-purple-300"
                        >
                            <Checkbox
                                checked={selectedAddOns.includes(addOn.id)}
                                onCheckedChange={() => toggleAddOn(addOn.id)}
                                data-testid={`addon-${addOn.id}`}
                            />
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-slate-700">{addOn.name}</div>
                                        {addOn.description && (
                                            <div className="text-sm text-slate-500">{addOn.description}</div>
                                        )}
                                    </div>
                                    <div className="text-sm font-semibold text-purple-700">
                                        +<CurrencySpan value={addOn.price} withAnimation={false} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {addOns && addOns.length > 0 && questionnaire && questionnaire.length > 0 && (
                <Separator />
            )}

            {/* Questionnaire */}
            {questionnaire && questionnaire.length > 0 && (
                <div className="space-y-3">
                    <Label className="text-slate-700">Intake Questionnaire</Label>
                    {questionnaire.map((q) => (
                        <div key={q.id} className="space-y-2">
                            <Label htmlFor={q.id}>
                                {q.question}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>

                            {q.type === "TEXT" && (
                                <Input
                                    id={q.id}
                                    value={(questionnaireResponses[q.id] as string) || ''}
                                    onChange={(e) => setQuestionResponse(q.id, e.target.value)}
                                    required={q.required}
                                    data-testid={`questionnaire-${q.id}`}
                                />
                            )}

                            {q.type === "TEXTAREA" && (
                                <Textarea
                                    id={q.id}
                                    value={(questionnaireResponses[q.id] as string) || ''}
                                    onChange={(e) => setQuestionResponse(q.id, e.target.value)}
                                    required={q.required}
                                    rows={4}
                                    data-testid={`questionnaire-${q.id}`}
                                />
                            )}

                            {q.type === "SELECT" && q.options && (
                                <Select
                                    value={(questionnaireResponses[q.id] as string) || ''}
                                    onValueChange={(value) => setQuestionResponse(q.id, value)}
                                >
                                    <SelectTrigger id={q.id} data-testid={`questionnaire-${q.id}`}>
                                        <SelectValue placeholder="Select an option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {q.options.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {q.type === "MULTISELECT" && q.options && (
                                <div className="space-y-2">
                                    {q.options.map((option) => (
                                        <div key={option} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`${q.id}-${option}`}
                                                checked={((questionnaireResponses[q.id] as string[]) || []).includes(option)}
                                                onCheckedChange={(checked) => {
                                                    const current = (questionnaireResponses[q.id] as string[]) || [];
                                                    const updated = checked
                                                        ? [...current, option]
                                                        : current.filter(x => x !== option);
                                                    setQuestionResponse(q.id, updated);
                                                }}
                                            />
                                            <Label htmlFor={`${q.id}-${option}`} className="font-normal">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={nextStep}
                disabled={!isQuestionnaireValid()}
                data-testid="continue-to-confirm-btn"
            >
                Review & Confirm
            </Button>
        </div>
    );

    // Render confirmation
    const renderConfirmStep = () => {
        const deliveryOption = DELIVERY_METHOD_OPTIONS.find(o => o.value === selectedDeliveryMethod);
        const DeliveryIcon = deliveryOption?.icon || Video;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevStep}
                        className="text-purple-600"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                </div>

                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 space-y-3">
                    <h3 className="font-semibold text-purple-800">Booking Summary</h3>

                    <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>{selectedDate && formatDateForDisplay(selectedDate)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>{selectedSlot?.start} - {selectedSlot?.end}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                        <DeliveryIcon className="w-4 h-4 text-purple-600" />
                        <span>{deliveryOption?.label}</span>
                    </div>

                    <Separator />

                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">{serviceName}</span>
                            <CurrencySpan value={basePrice} withAnimation={false} />
                        </div>
                        {selectedAddOns.length > 0 && addOns && (
                            <>
                                {selectedAddOns.map(addOnId => {
                                    const addOn = addOns.find(a => a.id === addOnId);
                                    return addOn ? (
                                        <div key={addOnId} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{addOn.name}</span>
                                            <span>+<CurrencySpan value={addOn.price} withAnimation={false} /></span>
                                        </div>
                                    ) : null;
                                })}
                            </>
                        )}
                        {travelSurcharge > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Travel Fee</span>
                                <span>+${travelSurcharge.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span className="text-purple-700">${totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                        Your card will be authorized but not charged until the practitioner confirms your booking.
                    </AlertDescription>
                </Alert>

                <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleBook}
                    disabled={bookMutation.isPending || !customerId}
                    data-testid="confirm-booking-btn"
                >
                    {bookMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : !customerId ? (
                        'Sign in to Book'
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm Booking
                        </>
                    )}
                </Button>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Schedule Your Session
                </CardTitle>
            </CardHeader>
            <CardContent>
                {step === 'delivery' && renderDeliveryMethodStep()}
                {step === 'date' && renderDateStep()}
                {step === 'time' && renderTimeStep()}
                {step === 'details' && renderDetailsStep()}
                {step === 'confirm' && renderConfirmStep()}
            </CardContent>
        </Card>
    );
}

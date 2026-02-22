'use client'

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, MapPinIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, Globe } from "lucide-react";
import { useCreateVendorEvent } from "./hooks/UseCreateVendorEvent";
import { useUpdateVendorEvent } from "./hooks/UseUpdateVendorEvent";
import { DateTime } from "luxon";
import HashtagInput from "@/components/ux/HashtagInput";
import ThumbnailInput, { default_thumbnail } from "@/components/ux/ThumbnailInput";
import AddressInput, { GooglePlaceSchema } from "@/components/ux/AddressInput";
import CalendarDropdown from "@/components/ux/CalendarDropdown";
import RichTextInput from "@/components/ux/RichTextInput";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { omit } from "@/lib/functions";
import { toast } from "sonner";

// Schema that matches VendorEventLocationInput GraphQL type
const VendorEventLocationSchema = z.object({
    type: z.enum(["physical", "digital"]),
    address: GooglePlaceSchema.optional(),
    externalUrl: z.string().url().optional().or(z.literal(""))
});

const eventFormSchema = z.object({
    title: z.string().min(1, "Event title is required").max(100, "Title must be less than 100 characters"),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    timezone: z.string(),
    location: VendorEventLocationSchema,
    visibility: z.enum(["public", "private"]),
    tags: z.array(z.string()).optional(),
    landscapeImage: ThumbnailSchema
}).refine((data) => {
    // Start date is required
    if (!data.startDate || data.startDate.trim() === "") {
        return false;
    }
    return true;
}, {
    message: "Start date is required",
    path: ["startDate"]
}).refine((data) => {
    // If it's a digital event, no physical location validation needed
    if (data.location.type === "digital") {
        return true;
    }
    // If it's a physical event, address is required
    return data.location.type === "physical" && data.location.address && data.location.address && data.location.address.formattedAddress.trim() !== "";
}, {
    message: "Physical events require a location",
    path: ["location", "address"]
});

type EventFormData = z.infer<typeof eventFormSchema>;

type Props = {
    merchantId: string;
    event?: any;
    eventId?: string | null;
    onSuccess: () => void;
    onDelete?: () => void;
}

const EventForm: React.FC<Props> = ({ merchantId, event, eventId, onSuccess, onDelete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitClicked, setIsSubmitClicked] = useState(false);
    
    const createMutation = useCreateVendorEvent();
    const updateMutation = useUpdateVendorEvent();
    
    const form = useForm<EventFormData>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            title: event?.title || "",
            description: event?.description || "",
            startDate: event?.startAt ? (() => {
                const dt = DateTime.fromISO(event.startAt);
                return dt.isValid ? dt.toISODate() || undefined : undefined;
            })() : undefined,
            endDate: event?.endAt ? (() => {
                const dt = DateTime.fromISO(event.endAt);
                return dt.isValid ? dt.toISODate() || undefined : undefined;
            })() : undefined,
            timezone: event?.timezone || "Australia/Melbourne",
            location: event?.location || {
                type: "physical",
                address: undefined,
                externalUrl: ""
            },
            visibility: event?.visibility || "public",
            tags: event?.tags || [],
            landscapeImage: event?.landscapeImage || default_thumbnail
        }
    });

    const onSubmit = async (data: EventFormData) => {
        if (!isSubmitClicked) {
            return; // Prevent auto-submission
        }
        
        try {
            // Validate that we have a start date
            if (!data.startDate || data.startDate.trim() === "") {
                console.error("No start date provided");
                return;
            }

            // Parse and validate dates
            const startDateTime = DateTime.fromISO(data.startDate, { zone: data.timezone });
            if (!startDateTime.isValid) {
                console.error("Invalid start date:", data.startDate, startDateTime.invalidReason);
                form.setError("startDate", { 
                    type: "manual", 
                    message: "Invalid start date format" 
                });
                return;
            }
            
            let endDateTime: DateTime | undefined = undefined;
            if (data.endDate && data.endDate.trim() !== "") {
                endDateTime = DateTime.fromISO(data.endDate, { zone: data.timezone });
                if (!endDateTime.isValid) {
                    console.error("Invalid end date:", data.endDate, endDateTime.invalidReason);
                    form.setError("endDate", { 
                        type: "manual", 
                        message: "Invalid end date format" 
                    });
                    return;
                }
                
                // Ensure end date is not before start date
                if (endDateTime < startDateTime) {
                    form.setError("endDate", { 
                        type: "manual", 
                        message: "End date cannot be before start date" 
                    });
                    return;
                }
            }
            
            const eventData = {
                ...omit(data, ["landscapeImage.image.media.url", "startDate", "endDate"]),
                startAt: startDateTime.toISO(),
                endAt: endDateTime ? endDateTime.toISO() : undefined,
            };

            if (event) {
                await updateMutation.mutateAsync({
                    id: event.id,
                    ...eventData
                });
            } else {
                await createMutation.mutateAsync({
                    id: eventId,
                    vendorId: merchantId,
                    ...eventData
                });
            }
            
            onSuccess();
        } catch (error) {
            console.error("Failed to save event:", error);
            toast.error("Failed to save event. Please try again.");
        } finally {
            setIsSubmitClicked(false); // Reset after submission
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    const validateStep1 = async () => {
        const location = form.getValues('location');
        // Make a mutable copy to avoid readonly array issues
        const fieldsToValidate: Parameters<typeof form.trigger>[0] = ['title', 'startDate'];
        const mutableFieldsToValidate = [...fieldsToValidate];

        // If it's a physical event, also validate the address
        if (location.type === "physical") {
            mutableFieldsToValidate.push('location.address');
        }
        
        const result = await form.trigger(mutableFieldsToValidate);
        return result;
    };

    const validateStep2 = async () => {
        // Step 2 only validates description (location is validated in Step 1)
        const result = await form.trigger(['description']);
        return result;
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            const isValid = await validateStep1();
            if (isValid) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            const isValid = await validateStep2();
            if (isValid) {
                setCurrentStep(3);
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Modern progress indicator */}
            <div className="flex items-center justify-between mb-8 px-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-16 rounded-full transition-colors ${
                        currentStep >= 1 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-sm font-medium transition-colors ${
                        currentStep === 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Event Details
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-16 rounded-full transition-colors ${
                        currentStep >= 2 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-sm font-medium transition-colors ${
                        currentStep === 2 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Description
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-16 rounded-full transition-colors ${
                        currentStep >= 3 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-sm font-medium transition-colors ${
                        currentStep === 3 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Media & Tags
                    </span>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                    {/* Step 1: Event Details */}
                    {currentStep === 1 && (
                        <Card className="flex-1 flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-base">
                                    <div className="flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-2" />
                                        Event Details
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="visibility"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormLabel className="text-sm font-normal">Visibility:</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-[180px] h-8">
                                                            <SelectValue placeholder="Select visibility" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="public">Public - Visible to all</SelectItem>
                                                        <SelectItem value="private">Private - Only you</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Title *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Autumn Showcase" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />


                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => {
                                        // Create day profiles to disable past dates
                                        const today = DateTime.now().startOf('day');
                                        const currentMonth = DateTime.now();
                                        const nextMonth = currentMonth.plus({ months: 1 });
                                        const monthAfter = currentMonth.plus({ months: 2 });
                                        
                                        type DayProfile = { date: DateTime; available: boolean; className: string };
                                        const dayProfiles: DayProfile[] = [];
                                        
                                        // Generate profiles for current month and next 2 months
                                        [currentMonth, nextMonth, monthAfter].forEach(month => {
                                            const daysInMonth = month.daysInMonth;
                                            if (daysInMonth) {
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const date = month.startOf('month').plus({ days: day - 1 });
                                                    dayProfiles.push({
                                                        date,
                                                        available: date >= today, // Only allow today and future dates
                                                        className: date < today ? '' : ''
                                                    });
                                                }
                                            }
                                        });

                                        return (
                                            <FormItem>
                                                <FormLabel>Start Date *</FormLabel>
                                                <FormControl>
                                                    <CalendarDropdown
                                                        {...field}
                                                        selectMode="single"
                                                        value={field.value}
                                                        onChange={(date) => field.onChange(date)}
                                                        dayProfiles={dayProfiles}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => {
                                        const startDate = form.watch("startDate");
                                        
                                        // Create day profiles to disable dates before start date
                                        const minDate = startDate && startDate.trim() !== "" ? 
                                            (() => {
                                                const dt = DateTime.fromISO(startDate);
                                                return dt.isValid ? dt : DateTime.now().startOf('day');
                                            })() : 
                                            DateTime.now().startOf('day');
                                        
                                        const currentMonth = DateTime.now();
                                        const nextMonth = currentMonth.plus({ months: 1 });
                                        const monthAfter = currentMonth.plus({ months: 2 });
                                        
                                        type DayProfile = { date: DateTime; available: boolean; className: string };
                                        const dayProfiles: DayProfile[] = [];
                                        
                                        // Generate profiles for current month and next 2 months
                                        [currentMonth, nextMonth, monthAfter].forEach(month => {
                                            const daysInMonth = month.daysInMonth;
                                            if (daysInMonth) {
                                                for (let day = 1; day <= daysInMonth; day++) {
                                                    const date = month.startOf('month').plus({ days: day - 1 });
                                                    dayProfiles.push({
                                                        date,
                                                        available: date >= minDate, // Only allow dates from start date onwards
                                                        className: date < minDate ? '' : ''
                                                    });
                                                }
                                            }
                                        });

                                        // Check if current end date is still valid given the new start date
                                        const currentEndDate = field.value;
                                        const isEndDateInvalid = currentEndDate && startDate && 
                                            DateTime.fromISO(currentEndDate).isValid && 
                                            DateTime.fromISO(startDate).isValid && 
                                            DateTime.fromISO(currentEndDate) < DateTime.fromISO(startDate);

                                        // Clear end date if it's before the new start date
                                        if (isEndDateInvalid) {
                                            field.onChange("");
                                        }

                                        return (
                                            <FormItem>
                                                <FormLabel>End Date (Optional)</FormLabel>
                                                <FormControl>
                                                    <CalendarDropdown
                                                        {...field}
                                                        selectMode="single"
                                                        value={field.value}
                                                        onChange={(date) => field.onChange(date)}
                                                        dayProfiles={dayProfiles}
                                                        disabled={!startDate || startDate.trim() === ""}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Leave empty for single-day events
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="location.type"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value === "digital"}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        form.setValue("location.type", "digital");
                                                        form.setValue("location.externalUrl", form.getValues("location.externalUrl") || "");
                                                    } else {
                                                        form.setValue("location.type", "physical");
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="flex items-center gap-2">
                                                <Globe className="h-4 w-4" />
                                                This is a digital event
                                            </FormLabel>
                                            <FormDescription>
                                                Digital events don&apos;t require a physical location
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {form.watch("location.type") === "physical" && (
                                <FormField
                                    control={form.control}
                                    name="location.address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Event Address *</FormLabel>
                                            <FormControl>
                                                <AddressInput
                                                    {...field}
                                                    value={field.value}
                                                    onChange={(googlePlaceData) => {
                                                        field.onChange(googlePlaceData);
                                                    }}
                                                    placeholder="Enter the event location"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This address will be shown to customers
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                        </CardContent>
                    </Card>
                    )}

                    {/* Step 2: Description & Link */}
                    {currentStep === 2 && (
                        <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center text-base">
                                <MapPinIcon className="h-4 w-4 mr-2" />
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1">
                            <FormField
                                control={form.control}
                                name="location.externalUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {form.watch("location.type") === "digital" ? "Event Link" : "External Link (Optional)"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="url"
                                                placeholder={form.watch("location.type") === "digital" 
                                                    ? "https://zoom.us/j/123456789 or https://your-event-website.com"
                                                    : "Optional external link (website, booking, etc.)"
                                                }
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {form.watch("location.type") === "digital" 
                                                ? "Link to join the digital event"
                                                : "Optional external link that will be shown on the event tile"
                                            }
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Description</FormLabel>
                                        <FormControl>
                                            <div className="h-[200px] flex flex-col">
                                                <RichTextInput
                                                    {...field}
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    placeholder="Describe your event, include times, what to expect, what to bring..."
                                                    maxWords={200}
                                                    className="h-full"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Use this to describe your event and include specific times (max 200 words)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    )}

                    {/* Step 3: Image and Tags */}
                    {currentStep === 3 && (
                        <Card className="flex-1 flex flex-col">
                        <CardContent className="space-y-4 pt-6 flex-1">
                            <FormField
                                control={form.control}
                                name="landscapeImage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Image</FormLabel>
                                        <FormControl>
                                            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                                                <ThumbnailInput
                                                    {...field}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    relativePath={`merchants/${merchantId}/events/${event?.id || eventId}/thumbnail`}
                                                    easyModeOnly={true}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Upload a landscape image for your event (recommended: 16:9 aspect ratio)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <HashtagInput
                                                {...field}
                                                value={field.value ?? []}
                                                onChange={field.onChange}
                                                placeholder="Add tags (e.g., demo, promo, exhibition)"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Add tags to help categorize your event
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-auto pt-4 flex-shrink-0">
                        <div className="flex space-x-2">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={onSuccess}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            {event && onDelete && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={onDelete}
                                    disabled={isLoading}
                                >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Delete Event
                                </Button>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrevious}
                                    disabled={isLoading}
                                >
                                    <ChevronLeftIcon className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                            )}
                            {currentStep < 3 ? (
                                <Button 
                                    type="button"
                                    onClick={handleNext}
                                    disabled={isLoading}
                                >
                                    Next
                                    <ChevronRightIcon className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    onClick={() => setIsSubmitClicked(true)}
                                >
                                    {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </Form>
        </div>
    );
};

export default EventForm;
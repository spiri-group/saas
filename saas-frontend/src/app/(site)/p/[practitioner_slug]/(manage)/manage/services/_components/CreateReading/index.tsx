import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { escape_key } from "@/lib/functions";
import { useCreateReadingOffer, type ExistingServiceData } from "./hooks/UseCreateReadingOffer";
import { Label } from "@/components/ui/label";
import { StepIndicator } from "@/components/ui/step-indicator";
import ThumbnailBuilder from "@/components/ux/ThumbnailBuilder";
import QuestionBuilder from "@/components/ux/QuestionBuilder";
import VisuallyHidden from "@/components/ux/VisuallyHidden";
import { usePractitionerSchedule } from "../../../availability/hooks/UsePractitionerSchedule";
import ServiceScheduleSelector from "@/components/scheduling/ServiceScheduleSelector";
import { Monitor, MapPin, AlertTriangle } from "lucide-react";

type BLProps = {
    merchantId: string;
    editingService?: ExistingServiceData;
    onClose?: () => void;
}

const useBL = (props: BLProps) => {
    const router = useRouter();
    const params = useParams();
    const practitioner_slug = params.practitioner_slug as string;
    const { form, mutation, isEditing } = useCreateReadingOffer(props.merchantId, props.editingService);
    const schedule = usePractitionerSchedule(props.merchantId);
    const inPersonEnabled = schedule.data?.deliveryMethods?.atPractitionerLocation?.enabled === true;
    const [currentStep, setCurrentStep] = useState(1);

    const serviceId = form.watch('id');
    const requiresConsultation = form.watch('requiresConsultation');
    const consultationType = form.watch('consultationType');
    const totalSteps = requiresConsultation ? 5 : 4;

    const stepLabels = requiresConsultation
        ? [{ label: 'Basic Info' }, { label: 'Details' }, { label: 'Thumbnail' }, { label: 'Schedule' }, { label: 'Questions' }]
        : [{ label: 'Basic Info' }, { label: 'Details' }, { label: 'Thumbnail' }, { label: 'Questions' }];

    // Check if the practitioner has availability set up for the chosen consultation type
    const weekdays = schedule.data?.weekdays || [];
    const onlineEnabled = schedule.data?.deliveryMethods?.online?.enabled !== false;
    const filteredWeekdays = weekdays
        .filter(d => d.enabled && d.timeSlots.length > 0)
        .map(day => {
            if (consultationType === 'IN_PERSON') {
                return { ...day, timeSlots: day.timeSlots.filter(slot => slot.location != null) };
            }
            return day;
        })
        .filter(d => d.timeSlots.length > 0);

    // Block if: no slots for the chosen type, OR online selected but not enabled in delivery methods
    const deliveryMethodDisabled = requiresConsultation && (
        (consultationType === 'ONLINE' && !onlineEnabled) ||
        (consultationType === 'IN_PERSON' && !inPersonEnabled)
    );
    const noSlots = requiresConsultation && filteredWeekdays.length === 0;
    const availabilityBlocked = (deliveryMethodDisabled || noSlots) && !schedule.isLoading;

    const uploadToAzure = async (file: File, fileType: 'IMAGE' | 'VIDEO'): Promise<any> => {
        const formData = new FormData();
        formData.append('files', file);

        const originalExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(originalExtension);

        let finalFilename = file.name.split('.')[0];
        if (isVideo) {
            finalFilename = `${finalFilename}.${originalExtension}`;
        } else {
            finalFilename = `${finalFilename}.webp`;
        }
        finalFilename = finalFilename.replace(/%20/g, '-').replace(/ /g, '-');

        const container = 'public';
        const relative_path = `merchant/${props.merchantId}/service/${serviceId}/thumbnail`;

        await fetch('/api/azure_upload', {
            method: 'POST',
            body: formData,
            headers: {
                'container': container,
                'relative_path': relative_path
            }
        });

        const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/${container}/${relative_path}/${encodeURIComponent(finalFilename)}`;
        const urlRelative = `${container}/${relative_path}/${finalFilename}`;

        return {
            code: Math.random().toString(36).substring(7),
            name: finalFilename,
            url,
            urlRelative,
            type: fileType,
            size: 'RECTANGLE_HORIZONTAL' as const,
            sizeBytes: file.size,
            ...(isVideo && { durationSeconds: 5 })
        };
    };

    const mockUploadCoverPhoto = async (file: File) => {
        return uploadToAzure(file, 'IMAGE');
    };

    const mockUploadVideo = async (file: File) => {
        return uploadToAzure(file, 'VIDEO');
    };

    const mockUploadCollageImage = async (file: File) => {
        return uploadToAzure(file, 'IMAGE');
    };

    const canProceedToNextStep = () => {
        if (availabilityBlocked) return false;
        const values = form.getValues();
        if (currentStep === 1) {
            return values.name && values.description && values.price;
        }
        if (currentStep === 2) {
            return true;
        }
        if (currentStep === 3) {
            return values.thumbnail?.image?.media;
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep < totalSteps && canProceedToNextStep()) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return {
        form,
        mutation,
        isEditing,
        inPersonEnabled,
        currentStep,
        totalSteps,
        stepLabels,
        setCurrentStep,
        handleNext,
        handlePrevious,
        canProceedToNextStep,
        schedule,
        availabilityBlocked,
        mockUploadCoverPhoto,
        mockUploadVideo,
        mockUploadCollageImage,
        submit: async (values: any) => {
            await mutation.mutateAsync(values);
            if (props.onClose) {
                props.onClose();
            } else {
                escape_key();
                router.push(`/p/${practitioner_slug}/manage/services`);
            }
        }
    };
}

type Props = BLProps & {}

const CreateReading: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <DialogContent className="w-[1000px] max-w-[95vw] h-[800px] flex flex-col overflow-hidden">
            <VisuallyHidden>
                <DialogTitle>{bl.isEditing ? 'Edit Your Reading Offer' : 'Create Your Reading Offer'}</DialogTitle>
                <DialogDescription>{bl.isEditing ? 'Update your reading service details.' : 'Fill in the form to create a new reading service.'}</DialogDescription>
            </VisuallyHidden>

            {/* Progress indicator with close button */}
            <div className="flex items-center justify-between mb-4 px-4 pt-2">
                <StepIndicator
                    dark
                    steps={bl.stepLabels}
                    currentStep={bl.currentStep}
                    onStepClick={bl.setCurrentStep}
                />
                <Button variant="outline" onClick={() => {
                    if (props.onClose) {
                        props.onClose();
                    } else {
                        const event = new CustomEvent('close-dialog');
                        window.dispatchEvent(event);
                    }
                }}>
                    ✕ Close
                </Button>
            </div>

            <Form {...bl.form}>
                <form
                    onSubmit={bl.form.handleSubmit(bl.submit)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && bl.currentStep < bl.totalSteps) {
                            e.preventDefault();
                        }
                    }}
                    className="flex-grow flex flex-col min-h-0">
                    <div className="flex-grow overflow-y-auto px-4 pb-4">
                        {/* Step 1: Basic Info */}
                        {bl.currentStep === 1 && (
                        <div className="space-y-4 mt-4">
                            {/* Service Name — first question */}
                            <FormField
                                name="name"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel dark>Service Name *</FormLabel>
                                        <FormControl>
                                            <Input {...field} dark placeholder="e.g., 30-Minute Tarot Reading" data-testid="service-name-input" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {/* Reading Type */}
                            <FormField
                                name="readingType"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel dark>Reading Type</FormLabel>
                                        <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger data-testid="reading-type-select">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Tarot">Tarot</SelectItem>
                                                <SelectItem value="Oracle">Oracle</SelectItem>
                                                <SelectItem value="Astrology">Astrology</SelectItem>
                                                <SelectItem value="Psychic">Psychic</SelectItem>
                                                <SelectItem value="Mediumship">Mediumship</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            {/* Live Session toggle — second question */}
                            <FormField
                                name="requiresConsultation"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 rounded-md border border-slate-700 p-4">
                                        <FormControl>
                                            <Checkbox
                                                dark
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                data-testid="requires-consultation-checkbox"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel dark className="font-medium cursor-pointer">
                                                This is a live session
                                            </FormLabel>
                                            <p className="text-sm text-slate-400">
                                                Tick this if you&apos;ll meet with the client in real time (video call or in person)
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {/* If live: Online or In Person — third question */}
                            {bl.form.watch('requiresConsultation') && (
                                <FormField
                                    name="consultationType"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel dark>Where will you meet?</FormLabel>
                                            <div className="flex gap-2" data-testid="consultation-type-tabs">
                                                <Button
                                                    type="button"
                                                    variant={field.value === 'ONLINE' ? 'default' : 'outline'}
                                                    className={field.value === 'ONLINE'
                                                        ? 'flex-1 bg-purple-600 hover:bg-purple-700 text-white'
                                                        : 'flex-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                                                    }
                                                    onClick={() => field.onChange('ONLINE')}
                                                    data-testid="consultation-type-online"
                                                >
                                                    <Monitor className="w-4 h-4 mr-2" />
                                                    Online
                                                </Button>
                                                {bl.inPersonEnabled && (
                                                    <Button
                                                        type="button"
                                                        variant={field.value === 'IN_PERSON' ? 'default' : 'outline'}
                                                        className={field.value === 'IN_PERSON'
                                                            ? 'flex-1 bg-purple-600 hover:bg-purple-700 text-white'
                                                            : 'flex-1 border-slate-600 text-slate-300 hover:bg-slate-700'
                                                        }
                                                        onClick={() => field.onChange('IN_PERSON')}
                                                        data-testid="consultation-type-inperson"
                                                    >
                                                        <MapPin className="w-4 h-4 mr-2" />
                                                        In Person
                                                    </Button>
                                                )}
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Availability gate — blocks the rest of the form if no slots */}
                            {bl.availabilityBlocked && (
                                <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-5">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-2">
                                            <p className="font-semibold text-amber-300 text-base">
                                                {bl.form.watch('consultationType') === 'IN_PERSON'
                                                    ? 'No in-person availability set up'
                                                    : 'No online availability set up'}
                                            </p>
                                            <p className="text-sm text-slate-300">
                                                {bl.form.watch('consultationType') === 'IN_PERSON'
                                                    ? 'You need to add in-person time slots with a location on your Availability page before you can create an in-person live service.'
                                                    : 'You need to enable online sessions and set up time slots on your Availability page before you can create an online live service.'}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="mt-2 border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                                                onClick={() => {
                                                    escape_key();
                                                    window.location.href = window.location.pathname.replace(/\/services$/, '/availability');
                                                }}
                                                data-testid="go-to-availability-btn"
                                            >
                                                Go to Availability Settings
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rest of the form — only show if not blocked */}
                            {!bl.availabilityBlocked && (
                                <>
                                    {/* Live session fields: duration */}
                                    {bl.form.watch('requiresConsultation') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                name="durationAmount"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark>Session Duration</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                dark
                                                                type="number"
                                                                min={5}
                                                                placeholder="30"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                                data-testid="duration-amount-input"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                name="durationUnit"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark>Unit</FormLabel>
                                                        <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger data-testid="duration-unit-select">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="minute">Minutes</SelectItem>
                                                                <SelectItem value="hour">Hours</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* Async fields: delivery format + turnaround */}
                                    {!bl.form.watch('requiresConsultation') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                name="deliveryFormat"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark>How will you share it?</FormLabel>
                                                        <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="RECORDED_VIDEO">Recorded Video</SelectItem>
                                                                <SelectItem value="RECORDED_AUDIO">Recorded Audio</SelectItem>
                                                                <SelectItem value="WRITTEN_PDF">Written PDF</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                name="turnaroundDays"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark>Deliver within (days)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                dark
                                                                type="number"
                                                                min="1"
                                                                max="30"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    <FormField
                                        name="description"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>About this service *</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        dark
                                                        placeholder="Describe what clients can expect..."
                                                        rows={4}
                                                        data-testid="service-description-input"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            name="price"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel dark>Price *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            dark
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            data-testid="service-price-input"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            name="currency"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel dark>Currency</FormLabel>
                                                    <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="USD">USD</SelectItem>
                                                            <SelectItem value="EUR">EUR</SelectItem>
                                                            <SelectItem value="GBP">GBP</SelectItem>
                                                            <SelectItem value="AUD">AUD</SelectItem>
                                                            <SelectItem value="CAD">CAD</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Details (conditional based on reading type) */}
                    {bl.currentStep === 2 && (
                        <div className="space-y-6 mt-4">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold">Service Details</h2>
                                <p className="text-sm text-slate-400">
                                    Add specific details based on your reading type
                                </p>
                            </div>

                            {/* Tarot/Oracle specific fields */}
                            {(bl.form.watch('readingType') === 'Tarot' || bl.form.watch('readingType') === 'Oracle') && (
                                <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-white/5">
                                    <h3 className="font-medium flex items-center gap-2">
                                        🃏 {bl.form.watch('readingType')} Details
                                    </h3>
                                    <FormField
                                        name="deckUsed"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Deck(s) Used</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dark
                                                        placeholder="e.g., Rider-Waite, Thoth, Wild Unknown"
                                                        data-testid="deck-used-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-slate-400">
                                                    List the tarot or oracle decks you use for this service
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        name="availableTopics"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Available Topics</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dark
                                                        placeholder="e.g., Love, Career, General Guidance"
                                                        data-testid="available-topics-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-slate-400">
                                                    Topics clients can choose from (comma separated)
                                                </p>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-600">
                                        <Label dark>Include with Reading</Label>
                                        <FormField
                                            name="includePullCardSummary"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            dark
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel dark className="font-normal">Pull-card summary PDF</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Astrology specific fields */}
                            {bl.form.watch('readingType') === 'Astrology' && (
                                <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-white/5">
                                    <h3 className="font-medium flex items-center gap-2">
                                        ✨ Astrology Details
                                    </h3>
                                    <FormField
                                        name="astrologyReadingTypes"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Reading Types Offered</FormLabel>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {[
                                                        { value: 'birth_chart', label: 'Birth Chart Analysis' },
                                                        { value: 'transit', label: 'Transit Reading' },
                                                        { value: 'synastry', label: 'Synastry/Compatibility' },
                                                        { value: 'solar_return', label: 'Solar Return' },
                                                        { value: 'progressed', label: 'Progressed Chart' },
                                                        { value: 'horary', label: 'Horary' },
                                                    ].map((option) => (
                                                        <div key={option.value} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                dark
                                                                id={`astro-${option.value}`}
                                                                checked={(field.value || []).includes(option.value)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = field.value || [];
                                                                    if (checked) {
                                                                        field.onChange([...current, option.value]);
                                                                    } else {
                                                                        field.onChange(current.filter((v: string) => v !== option.value));
                                                                    }
                                                                }}
                                                                data-testid={`astrology-type-${option.value}`}
                                                            />
                                                            <label htmlFor={`astro-${option.value}`} className="text-sm cursor-pointer">
                                                                {option.label}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        name="houseSystem"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>House System</FormLabel>
                                                <Select dark onValueChange={field.onChange} defaultValue={field.value || 'placidus'}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="house-system-select">
                                                            <SelectValue placeholder="Select house system" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="placidus">Placidus</SelectItem>
                                                        <SelectItem value="whole_sign">Whole Sign</SelectItem>
                                                        <SelectItem value="koch">Koch</SelectItem>
                                                        <SelectItem value="equal">Equal House</SelectItem>
                                                        <SelectItem value="campanus">Campanus</SelectItem>
                                                        <SelectItem value="regiomontanus">Regiomontanus</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        name="requiresBirthTime"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-2">
                                                <FormControl>
                                                    <Checkbox
                                                        dark
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        data-testid="requires-birth-time-checkbox"
                                                    />
                                                </FormControl>
                                                <div>
                                                    <FormLabel dark className="font-normal cursor-pointer">
                                                        Requires exact birth time
                                                    </FormLabel>
                                                    <p className="text-xs text-slate-400">
                                                        Check if your reading requires the client&apos;s exact birth time
                                                    </p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-600">
                                        <Label dark>Include with Reading</Label>
                                        <FormField
                                            name="includePullCardSummary"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            dark
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel dark className="font-normal">Birth chart PDF</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Psychic/Mediumship specific fields */}
                            {(bl.form.watch('readingType') === 'Psychic' || bl.form.watch('readingType') === 'Mediumship') && (
                                <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-white/5">
                                    <h3 className="font-medium flex items-center gap-2">
                                        🔮 {bl.form.watch('readingType')} Details
                                    </h3>
                                    <FormField
                                        name="focusAreas"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Focus Areas / Specialties</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dark
                                                        placeholder="e.g., Spirit Communication, Past Lives, Energy Reading"
                                                        data-testid="focus-areas-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-slate-400">
                                                    Your areas of specialty (comma separated)
                                                </p>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex flex-col gap-3 pt-2 border-t border-slate-600">
                                        <Label dark>Include with Reading</Label>
                                        <FormField
                                            name="includeVoiceNote"
                                            control={bl.form.control}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            dark
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormLabel dark className="font-normal">Voice note</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Other reading type */}
                            {bl.form.watch('readingType') === 'Other' && (
                                <div className="space-y-4 p-4 border border-slate-700 rounded-lg bg-white/5">
                                    <h3 className="font-medium">Additional Details</h3>
                                    <FormField
                                        name="customReadingDetails"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Describe Your Reading Style</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        dark
                                                        placeholder="Describe the tools or methods you use..."
                                                        rows={3}
                                                        data-testid="custom-details-input"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* No reading type selected message */}
                            {!bl.form.watch('readingType') && (
                                <div className="text-center p-8 border border-slate-700 rounded-lg border-dashed">
                                    <p className="text-slate-400">
                                        Please select a reading type on the previous step to see relevant options.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Thumbnail */}
                    {bl.currentStep === 3 && (
                        <div className="space-y-4">
                            <ThumbnailBuilder
                                dark
                                control={bl.form.control}
                                name="thumbnail"
                                onUploadCoverPhoto={bl.mockUploadCoverPhoto}
                                onUploadVideo={bl.mockUploadVideo}
                                onUploadCollageImage={bl.mockUploadCollageImage}
                            />
                        </div>
                    )}

                    {/* Step 4: Schedule (only when requiresConsultation) */}
                    {bl.currentStep === 4 && bl.form.watch('requiresConsultation') && (
                        <div className="space-y-4 mt-4">
                            <div className="mb-2">
                                <h2 className="text-lg font-semibold">Schedule</h2>
                                <p className="text-sm text-slate-400">
                                    Choose when customers can book this service
                                </p>
                            </div>
                            <ServiceScheduleSelector
                                dark
                                weekdays={bl.schedule.data?.weekdays || []}
                                value={bl.form.watch('scheduleConfig')}
                                onChange={(config) => bl.form.setValue('scheduleConfig', config)}
                                consultationType={bl.form.watch('consultationType')}
                            />
                        </div>
                    )}

                    {/* Questions step (step 4 without consultation, step 5 with) */}
                    {bl.currentStep === bl.totalSteps && (
                        <div className="space-y-4">
                            <QuestionBuilder
                                dark
                                control={bl.form.control}
                                name="questionnaire"
                                readingType={bl.form.watch('readingType')}
                            />
                        </div>
                    )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between p-4 border-t border-slate-700">
                        {bl.currentStep > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={bl.handlePrevious}
                                data-testid="wizard-back-btn"
                            >
                                ← Back
                            </Button>
                        ) : (
                            <div></div>
                        )}

                        {bl.currentStep < bl.totalSteps ? (
                            <Button
                                type="button"
                                onClick={bl.handleNext}
                                disabled={!bl.canProceedToNextStep()}
                                data-testid="wizard-next-btn"
                            >
                                Next →
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="lg"
                                onClick={async () => {
                                    const values = bl.form.getValues();
                                    await bl.submit(values);
                                }}
                                disabled={bl.mutation.isPending}
                                data-testid="wizard-submit-btn"
                            >
                                {bl.mutation.isPending
                                    ? (bl.isEditing ? 'Saving Changes...' : 'Creating Reading Offer...')
                                    : (bl.isEditing ? 'Save Changes' : 'Create Reading Offer')
                                }
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </DialogContent>
    );
}

export default CreateReading;

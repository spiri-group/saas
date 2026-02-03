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
import { useCreateReadingOffer } from "./hooks/UseCreateReadingOffer";
import { Label } from "@/components/ui/label";
import ThumbnailBuilder from "@/components/ux/ThumbnailBuilder";
import QuestionBuilder from "@/components/ux/QuestionBuilder";
import VisuallyHidden from "@/components/ux/VisuallyHidden";
import TargetTimezoneSelector from "@/components/scheduling/TargetTimezoneSelector";
import TimezoneImpactMap from "@/components/scheduling/TimezoneImpactMap";
import SmartSchedulingRecommendations from "@/components/scheduling/SmartSchedulingRecommendations";

type BLProps = {
    merchantId: string;
}

const useBL = (props: BLProps) => {
    const router = useRouter();
    const params = useParams();
    const merchant_slug = params.merchant_slug as string;
    const { form, mutation } = useCreateReadingOffer(props.merchantId);
    const [currentStep, setCurrentStep] = useState(1);

    const serviceId = form.watch('id');

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
        const values = form.getValues();
        if (currentStep === 1) {
            return values.name && values.description && values.price;
        }
        if (currentStep === 2) {
            // Details step - no required fields, just optional details
            return true;
        }
        if (currentStep === 3) {
            return values.thumbnail?.image?.media;
        }
        // Step 4 (questions) is optional
        return true;
    };

    const handleNext = () => {
        console.log('handleNext called', { currentStep, canProceed: canProceedToNextStep() });
        if (currentStep < 4 && canProceedToNextStep()) {
            console.log('Moving to step', currentStep + 1);
            setCurrentStep(currentStep + 1);
        } else {
            console.log('Cannot proceed - either at step 4 or validation failed');
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
        currentStep,
        handleNext,
        handlePrevious,
        canProceedToNextStep,
        mockUploadCoverPhoto,
        mockUploadVideo,
        mockUploadCollageImage,
        submit: async (values: any) => {
            console.log('Form submitted', { currentStep, values });
            await mutation.mutateAsync(values);
            escape_key();
            router.push(`/m/${merchant_slug}/manage/services`);
        }
    };
}

type Props = BLProps & {}

const CreateReading: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <DialogContent className="w-[1000px] max-w-[95vw] h-[800px] flex flex-col overflow-hidden">
            <VisuallyHidden>
                <DialogTitle>Create Your Reading Offer</DialogTitle>
                <DialogDescription>Fill in the form to create a new reading service.</DialogDescription>
            </VisuallyHidden>

            {/* Progress indicator with close button */}
            <div className="flex items-center justify-between mb-4 px-4 pt-2">
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-6 rounded-full transition-colors ${
                        bl.currentStep >= 1 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Basic Info
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-6 rounded-full transition-colors ${
                        bl.currentStep >= 2 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 2 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Details
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-6 rounded-full transition-colors ${
                        bl.currentStep >= 3 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 3 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Thumbnail
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-6 rounded-full transition-colors ${
                        bl.currentStep >= 4 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 4 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Questions
                    </span>
                </div>
                <Button variant="outline" onClick={() => {
                    const event = new CustomEvent('close-dialog');
                    window.dispatchEvent(event);
                }}>
                    ✕ Close
                </Button>
            </div>

            <Form {...bl.form}>
                <form
                    onSubmit={bl.form.handleSubmit(bl.submit)}
                    onKeyDown={(e) => {
                        // Prevent Enter key from submitting when not on final step
                        if (e.key === 'Enter' && bl.currentStep < 4) {
                            e.preventDefault();
                        }
                    }}
                    className="flex-grow flex flex-col min-h-0">
                    <div className="flex-grow overflow-y-auto px-4 pb-4">
                        {/* Step 1: Basic Info */}
                        {bl.currentStep === 1 && (
                        <div className="space-y-4 mt-4">
                            <FormField
                                name="name"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Name *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., 30-Minute Tarot Reading" data-testid="service-name-input" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="description"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>About this service *</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Describe what clients can expect..."
                                                rows={4}
                                                data-testid="service-description-input"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="readingType"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reading Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                            <FormField
                                name="requiresConsultation"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                data-testid="requires-consultation-checkbox"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="font-medium cursor-pointer">
                                                Requires Live Consultation
                                            </FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Check this if you&apos;ll deliver this service via live session instead of recorded file
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {!bl.form.watch('requiresConsultation') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        name="deliveryFormat"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Delivery Format</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                                <FormLabel>Delivery (days)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
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

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    name="price"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
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
                                            <FormLabel>Currency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                            <div className="space-y-3">
                                <Label>Inclusion Options</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        name="includePullCardSummary"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">Pull-card summary PDF</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name="includeVoiceNote"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">Voice note</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Target Timezone Selector */}
                            <FormField
                                name="targetTimezones"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <TargetTimezoneSelector
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />

                            {/* Show timezone impact visualization when regions are selected */}
                            {(bl.form.watch('targetTimezones')?.length ?? 0) > 0 && (
                                <div className="space-y-4 mt-6 pt-6 border-t">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Global Availability Preview</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            See how your typical business hours (9 AM - 5 PM) appear in your target markets.
                                        </p>

                                        {/* Timezone Impact Map */}
                                        <TimezoneImpactMap
                                            practitionerTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                                            availableHours={{ start: 9, end: 17 }}
                                        />

                                        {/* Smart Recommendations */}
                                        <SmartSchedulingRecommendations
                                            practitionerTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                                            currentAvailableHours={{ start: 9, end: 17 }}
                                            targetTimezones={bl.form.watch('targetTimezones') || []}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Details (conditional based on reading type) */}
                    {bl.currentStep === 2 && (
                        <div className="space-y-6 mt-4">
                            <div className="text-center mb-6">
                                <h2 className="text-lg font-semibold">Service Details</h2>
                                <p className="text-sm text-muted-foreground">
                                    Add specific details based on your reading type
                                </p>
                            </div>

                            {/* Tarot/Oracle specific fields */}
                            {(bl.form.watch('readingType') === 'Tarot' || bl.form.watch('readingType') === 'Oracle') && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-medium flex items-center gap-2">
                                        🃏 {bl.form.watch('readingType')} Details
                                    </h3>
                                    <FormField
                                        name="deckUsed"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deck(s) Used</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g., Rider-Waite, Thoth, Wild Unknown"
                                                        data-testid="deck-used-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">
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
                                                <FormLabel>Available Topics</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g., Love, Career, General Guidance"
                                                        data-testid="available-topics-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">
                                                    Topics clients can choose from (comma separated)
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Astrology specific fields */}
                            {bl.form.watch('readingType') === 'Astrology' && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-medium flex items-center gap-2">
                                        ✨ Astrology Details
                                    </h3>
                                    <FormField
                                        name="astrologyReadingTypes"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reading Types Offered</FormLabel>
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
                                                <FormLabel>House System</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || 'placidus'}>
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
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        data-testid="requires-birth-time-checkbox"
                                                    />
                                                </FormControl>
                                                <div>
                                                    <FormLabel className="font-normal cursor-pointer">
                                                        Requires exact birth time
                                                    </FormLabel>
                                                    <p className="text-xs text-muted-foreground">
                                                        Check if your reading requires the client&apos;s exact birth time
                                                    </p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Psychic/Mediumship specific fields */}
                            {(bl.form.watch('readingType') === 'Psychic' || bl.form.watch('readingType') === 'Mediumship') && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-medium flex items-center gap-2">
                                        🔮 {bl.form.watch('readingType')} Details
                                    </h3>
                                    <FormField
                                        name="focusAreas"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Focus Areas / Specialties</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g., Spirit Communication, Past Lives, Energy Reading"
                                                        data-testid="focus-areas-input"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">
                                                    Your areas of specialty (comma separated)
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Other reading type */}
                            {bl.form.watch('readingType') === 'Other' && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-medium">Additional Details</h3>
                                    <FormField
                                        name="customReadingDetails"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Describe Your Reading Style</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
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
                                <div className="text-center p-8 border rounded-lg border-dashed">
                                    <p className="text-muted-foreground">
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
                                control={bl.form.control}
                                name="thumbnail"
                                onUploadCoverPhoto={bl.mockUploadCoverPhoto}
                                onUploadVideo={bl.mockUploadVideo}
                                onUploadCollageImage={bl.mockUploadCollageImage}
                            />
                        </div>
                    )}

                    {/* Step 4: Pre-Reading Questions (Optional) */}
                    {bl.currentStep === 4 && (
                        <div className="space-y-4">
                            <QuestionBuilder
                                control={bl.form.control}
                                name="preReadingQuestions"
                            />
                        </div>
                    )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between p-4 border-t">
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

                        {bl.currentStep < 4 ? (
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
                                {bl.mutation.isPending ? 'Creating Reading Offer...' : '✨ Create Reading Offer'}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </DialogContent>
    );
}

export default CreateReading;

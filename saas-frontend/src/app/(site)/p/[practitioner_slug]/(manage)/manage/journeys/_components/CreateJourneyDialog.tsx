'use client'

import { useState } from "react";
import { DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, X, Music } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";
import ThumbnailBuilder from "@/components/ux/ThumbnailBuilder";
import VisuallyHidden from "@/components/ux/VisuallyHidden";
import FileUploader from "@/components/ux/FileUploader";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { gql } from "@/lib/services/gql";
import useCreateJourney from "../_hooks/UseCreateJourney";
import { JourneyListItem } from "../_hooks/UseJourneys";
import { media_type } from "@/utils/spiriverse";

type Props = {
    practitionerId: string;
    editingJourney?: JourneyListItem;
    defaultStructure?: string;
    onClose: () => void;
    onCreated?: (journey: JourneyListItem) => void;
};

const MODALITY_OPTIONS = [
    { value: "MEDITATION", label: "Meditation" },
    { value: "BREATHWORK", label: "Breathwork" },
    { value: "SOUND_HEALING", label: "Sound Healing" },
    { value: "CHANNELING", label: "Channeling" },
    { value: "ENERGY_HEALING", label: "Energy Healing" },
    { value: "COACHING", label: "Coaching" },
    { value: "TAROT", label: "Tarot" },
    { value: "ASTROLOGY", label: "Astrology" },
    { value: "REIKI", label: "Reiki" },
    { value: "OTHER", label: "Other" },
];

const DIFFICULTY_OPTIONS = [
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
];

const TOOL_SUGGESTIONS = [
    "Journal", "Candle", "Incense", "Essential Oils", "Crystal",
    "Eye Mask", "Blanket", "Headphones", "Cushion", "Water"
];

type JourneyFormValues = {
    id: string;
    name: string;
    description: string;
    journeyStructure: string;
    intention: string;
    difficulty: string;
    modalities: string[];
    recommendedTools: string[];
    price: string;
    currency: string;
    allowSingleTrackPurchase: boolean;
    singleTrackPrice: string;
    allowRental: boolean;
    rentalPrice: string;
    rentalDurationDays: string;
    thumbnail?: Record<string, unknown>;
};

export default function CreateJourneyDialog({ practitionerId, editingJourney, defaultStructure, onClose, onCreated }: Props) {
    const { createMutation, updateMutation } = useCreateJourney(practitionerId);
    const isEditing = !!editingJourney;

    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const form = useForm<JourneyFormValues>({
        defaultValues: {
            id: editingJourney?.id || uuidv4(),
            name: editingJourney?.name || "",
            description: editingJourney?.description || "",
            journeyStructure: editingJourney?.journeyStructure || defaultStructure || "COLLECTION",
            intention: editingJourney?.intention || "",
            difficulty: editingJourney?.difficulty || "BEGINNER",
            modalities: editingJourney?.modalities || [],
            recommendedTools: editingJourney?.recommendedTools || [],
            price: editingJourney?.pricing?.collectionPrice
                ? (editingJourney.pricing.collectionPrice.amount / 100).toString()
                : "",
            currency: editingJourney?.pricing?.collectionPrice?.currency || "AUD",
            allowSingleTrackPurchase: editingJourney?.pricing?.allowSingleTrackPurchase || false,
            singleTrackPrice: editingJourney?.pricing?.singleTrackPrice
                ? (editingJourney.pricing.singleTrackPrice.amount / 100).toString()
                : "",
            allowRental: editingJourney?.pricing?.allowRental || false,
            rentalPrice: editingJourney?.pricing?.rentalPrice
                ? (editingJourney.pricing.rentalPrice.amount / 100).toString()
                : "",
            rentalDurationDays: editingJourney?.pricing?.rentalDurationDays?.toString() || "30",
            thumbnail: editingJourney?.thumbnail || undefined,
        },
    });

    const journeyId = form.watch('id');
    const [audioFile, setAudioFile] = useState<media_type | null>(null);
    const [creatingTrack, setCreatingTrack] = useState(false);

    const isSingleTrack = form.watch('journeyStructure') === 'SINGLE_TRACK';

    const uploadToAzure = async (file: File, fileType: 'IMAGE' | 'VIDEO') => {
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
        const relative_path = `merchant/${practitionerId}/journey/${journeyId}/thumbnail`;

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

    const handleUploadCoverPhoto = async (file: File) => uploadToAzure(file, 'IMAGE');
    const handleUploadVideo = async (file: File) => uploadToAzure(file, 'VIDEO');
    const handleUploadCollageImage = async (file: File) => uploadToAzure(file, 'IMAGE');

    const toggleArrayValue = (field: 'modalities' | 'recommendedTools', value: string) => {
        const current = form.getValues(field);
        if (current.includes(value)) {
            form.setValue(field, current.filter((v: string) => v !== value));
        } else {
            form.setValue(field, [...current, value]);
        }
    };

    const handleSubmit = async (values: JourneyFormValues) => {
        const priceInCents = values.price ? Math.round(parseFloat(values.price) * 100) : 0;
        const singlePriceInCents = values.allowSingleTrackPurchase && values.singleTrackPrice
            ? Math.round(parseFloat(values.singleTrackPrice) * 100)
            : undefined;
        const rentalPriceInCents = values.allowRental && values.rentalPrice
            ? Math.round(parseFloat(values.rentalPrice) * 100)
            : undefined;

        const input = {
            name: values.name,
            description: values.description,
            thumbnail: values.thumbnail,
            journeyStructure: values.journeyStructure,
            intention: values.intention,
            difficulty: values.difficulty,
            modalities: values.modalities,
            recommendedTools: values.recommendedTools,
            pricing: {
                collectionPrice: { amount: priceInCents, currency: values.currency },
                ...(singlePriceInCents && {
                    singleTrackPrice: { amount: singlePriceInCents, currency: values.currency }
                }),
                allowSingleTrackPurchase: values.allowSingleTrackPurchase,
                allowRental: values.allowRental,
                ...(rentalPriceInCents && {
                    rentalPrice: { amount: rentalPriceInCents, currency: values.currency },
                    rentalDurationDays: parseInt(values.rentalDurationDays) || 30,
                }),
            },
        };

        if (isEditing) {
            await updateMutation.mutateAsync({ ...input, id: editingJourney.id });
            onClose();
        } else {
            const result = await createMutation.mutateAsync(input);
            const createdJourney = result?.journey as JourneyListItem | undefined;

            // For single track, auto-create the track with the uploaded audio
            if (createdJourney && values.journeyStructure === 'SINGLE_TRACK' && audioFile) {
                setCreatingTrack(true);
                try {
                    // Strip fields not in MediaInput (url is output-only, not accepted as input)
                    const { url, ...audioFileInput } = audioFile as media_type & { url?: string };
                    await gql<{ upsert_journey_track: { success: boolean } }>(`
                        mutation UpsertJourneyTrack($vendorId: ID!, $journeyId: ID!, $input: JourneyTrackInput!) {
                            upsert_journey_track(vendorId: $vendorId, journeyId: $journeyId, input: $input) {
                                code success message
                            }
                        }
                    `, {
                        vendorId: practitionerId,
                        journeyId: createdJourney.id,
                        input: {
                            trackNumber: 1,
                            title: values.name,
                            durationSeconds: audioFile.durationSeconds || 0,
                            audioFile: audioFileInput,
                        },
                    });
                } finally {
                    setCreatingTrack(false);
                }
            }

            if (onCreated && createdJourney) {
                onCreated(createdJourney);
            } else {
                onClose();
            }
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending || creatingTrack;

    const canProceed = () => {
        const values = form.getValues();
        if (step === 1) {
            if (!values.name.length) return false;
            if (values.journeyStructure === 'SINGLE_TRACK' && !audioFile) return false;
            return true;
        }
        return true;
    };

    const watchedJourneyStructure = form.watch('journeyStructure');
    const watchedAllowSingle = form.watch('allowSingleTrackPurchase');
    const watchedAllowRental = form.watch('allowRental');
    const watchedModalities = form.watch('modalities');
    const watchedRecommendedTools = form.watch('recommendedTools');

    return (
        <DialogContent className="w-[800px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-4 pt-2">
                <DialogTitle className="text-lg font-semibold text-white">
                    {isEditing ? "Edit Journey" : "Create Guided Journey"}
                </DialogTitle>
                <VisuallyHidden>
                    <DialogDescription>Set up your guided journey experience</DialogDescription>
                </VisuallyHidden>
            </div>

            <div className="flex items-center justify-between mb-4 px-4">
                <StepIndicator
                    dark
                    steps={[
                        { label: 'Basics' },
                        { label: 'Details' },
                        { label: 'Thumbnail' },
                    ]}
                    currentStep={step}
                    onStepClick={setStep}
                />
                <Button variant="outline" onClick={onClose} data-testid="journey-close-btn">
                    <X className="w-4 h-4 mr-2" />
                    Close
                </Button>
            </div>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && step < totalSteps) {
                            e.preventDefault();
                        }
                    }}
                    className="flex-grow flex flex-col min-h-0"
                >
                    <div className="flex-grow overflow-y-auto px-4 pb-4">
                        {/* Step 1: Basics */}
                        {step === 1 && (
                            <div className="space-y-4 mt-4">
                                <FormField
                                    name="name"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel dark>Name *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    dark
                                                    placeholder="e.g. 21-Day Chakra Awakening"
                                                    data-testid="journey-name-input"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    name="description"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel dark>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    dark
                                                    placeholder="Describe what listeners will experience..."
                                                    rows={3}
                                                    data-testid="journey-description-input"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {!defaultStructure && (
                                    <FormField
                                        name="journeyStructure"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Type</FormLabel>
                                                <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="journey-structure-select">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SINGLE_TRACK">Single Track</SelectItem>
                                                        <SelectItem value="COLLECTION">Collection</SelectItem>
                                                        <SelectItem value="SERIES">Series (Drip Release)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        name="price"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Price</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        dark
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="29.99"
                                                        data-testid="journey-price-input"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name="currency"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel dark>Currency</FormLabel>
                                                <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger data-testid="journey-currency-select">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="AUD">AUD</SelectItem>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="GBP">GBP</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    name="difficulty"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel dark>Difficulty</FormLabel>
                                            <Select dark onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger data-testid="journey-difficulty-select">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DIFFICULTY_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />

                                {isSingleTrack && (
                                    <div className="border border-slate-700 rounded-lg p-3">
                                        <FormLabel dark>Audio File *</FormLabel>
                                        <p className="text-xs text-slate-400 mb-2">Upload your audio recording (MP3, WAV, OGG, or FLAC)</p>

                                        {audioFile ? (
                                            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 rounded-lg bg-purple-500/20">
                                                        <Music className="w-4 h-4 text-purple-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-white truncate">{audioFile.name}</p>
                                                        {audioFile.durationSeconds ? (
                                                            <p className="text-xs text-slate-400">
                                                                {Math.floor(audioFile.durationSeconds / 60)}:{String(Math.floor(audioFile.durationSeconds % 60)).padStart(2, '0')}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setAudioFile(null)}
                                                    className="text-slate-400 hover:text-red-400"
                                                    data-testid="remove-audio-btn"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <FileUploader
                                                id={`journey-audio-upload`}
                                                connection={{
                                                    container: 'public',
                                                    relative_path: `merchant/${practitionerId}/journey/${journeyId}/tracks`
                                                }}
                                                acceptOnly={{ type: 'AUDIO' }}
                                                allowMultiple={false}
                                                onDropAsync={() => {}}
                                                onUploadCompleteAsync={(files) => {
                                                    if (files.length > 0) {
                                                        const uploaded = files[0];
                                                        setAudioFile(uploaded);

                                                        if (uploaded.url) {
                                                            const audio = new Audio();
                                                            audio.src = uploaded.url;
                                                            audio.addEventListener('loadedmetadata', () => {
                                                                const duration = Math.round(audio.duration);
                                                                setAudioFile(prev => prev ? { ...prev, durationSeconds: duration } : prev);
                                                            });
                                                        }
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                )}

                                {watchedJourneyStructure !== "SINGLE_TRACK" && (
                                    <div className="border border-slate-700 rounded-lg p-3">
                                        <FormField
                                            name="allowSingleTrackPurchase"
                                            control={form.control}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center gap-2 mb-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            dark
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            data-testid="allow-single-track-checkbox"
                                                        />
                                                    </FormControl>
                                                    <FormLabel dark className="text-sm font-normal cursor-pointer">
                                                        Allow customers to buy individual tracks
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        {watchedAllowSingle && (
                                            <FormField
                                                name="singleTrackPrice"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark className="text-xs text-slate-400">Price per track</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                dark
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="4.99"
                                                                data-testid="single-track-price-input"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="border border-slate-700 rounded-lg p-3">
                                    <FormField
                                        name="allowRental"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-2 mb-2">
                                                <FormControl>
                                                    <Checkbox
                                                        dark
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        data-testid="allow-rental-checkbox"
                                                    />
                                                </FormControl>
                                                <FormLabel dark className="text-sm font-normal cursor-pointer">
                                                    Offer time-limited rental access
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    {watchedAllowRental && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                name="rentalPrice"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark className="text-xs text-slate-400">Rental price</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                dark
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="9.99"
                                                                data-testid="rental-price-input"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                name="rentalDurationDays"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel dark className="text-xs text-slate-400">Duration (days)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                dark
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                placeholder="30"
                                                                data-testid="rental-duration-input"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <div className="space-y-4 mt-4">
                                <FormField
                                    name="intention"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel dark>Intention / Affirmation</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    dark
                                                    placeholder="e.g. I open myself to deep healing and transformation..."
                                                    rows={2}
                                                    data-testid="journey-intention-input"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div>
                                    <FormLabel dark>Modalities</FormLabel>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {MODALITY_OPTIONS.map(opt => (
                                            <Badge
                                                key={opt.value}
                                                variant={watchedModalities.includes(opt.value) ? "default" : "outline"}
                                                className={`cursor-pointer transition-colors ${
                                                    watchedModalities.includes(opt.value)
                                                        ? "bg-purple-500/30 text-purple-300 border-purple-500/50"
                                                        : "border-slate-600 text-slate-400 hover:border-purple-500/30"
                                                }`}
                                                onClick={() => toggleArrayValue('modalities', opt.value)}
                                                data-testid={`modality-${opt.value}`}
                                            >
                                                {opt.label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <FormLabel dark>Recommended Tools</FormLabel>
                                    <p className="text-xs text-slate-500 mb-2">What should your listeners prepare?</p>
                                    <div className="flex flex-wrap gap-2">
                                        {TOOL_SUGGESTIONS.map(tool => (
                                            <Badge
                                                key={tool}
                                                variant={watchedRecommendedTools.includes(tool) ? "default" : "outline"}
                                                className={`cursor-pointer transition-colors ${
                                                    watchedRecommendedTools.includes(tool)
                                                        ? "bg-emerald-500/30 text-emerald-300 border-emerald-500/50"
                                                        : "border-slate-600 text-slate-400 hover:border-emerald-500/30"
                                                }`}
                                                onClick={() => toggleArrayValue('recommendedTools', tool)}
                                                data-testid={`tool-${tool.toLowerCase()}`}
                                            >
                                                {tool}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Thumbnail */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <ThumbnailBuilder
                                    dark
                                    control={form.control}
                                    name="thumbnail"
                                    onUploadCoverPhoto={handleUploadCoverPhoto}
                                    onUploadVideo={handleUploadVideo}
                                    onUploadCollageImage={handleUploadCollageImage}
                                />
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between p-4 border-t border-slate-700">
                        {step > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(step - 1)}
                                data-testid="journey-back-btn"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                data-testid="journey-cancel-btn"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        )}

                        {step < totalSteps ? (
                            <Button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed()}
                                data-testid="journey-next-btn"
                            >
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={async () => {
                                    const valid = await form.trigger();
                                    if (!valid) return;
                                    await handleSubmit(form.getValues());
                                }}
                                disabled={isPending || !canProceed()}
                                data-testid="journey-submit-btn"
                            >
                                {isPending
                                    ? (isEditing ? "Saving..." : "Creating...")
                                    : (isEditing ? "Save Journey" : "Create Journey")
                                }
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </DialogContent>
    );
}

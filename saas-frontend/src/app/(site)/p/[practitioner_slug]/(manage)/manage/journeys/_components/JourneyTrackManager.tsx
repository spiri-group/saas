'use client'

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    ArrowLeft, GripVertical, Music, Play, Pause, Pencil,
    Plus, Trash2, Upload, X, Clock, ChevronDown, ChevronUp, Save, Loader2, Headphones,
    ArrowUp, ArrowDown, Files
} from "lucide-react";
import { useJourneyTracks, useUpsertTrack, useDeleteTrack, useReorderTracks, type JourneyTrack } from "../_hooks/UseJourneyTracks";
import { JourneyListItem } from "../_hooks/UseJourneys";
import FileUploader from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { gql } from "@/lib/services/gql";
import { ShoppingCart, Package } from "lucide-react";
import FeatureGate from "@/components/subscription/FeatureGate";
import { useTierFeatures } from "@/hooks/UseTierFeatures";

type Props = {
    practitionerId: string;
    journey: JourneyListItem;
    onBack: () => void;
};

function formatDuration(seconds: number): string {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioPlayer({ src, testId }: { src: string; testId?: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const toggle = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-2" data-testid={testId}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggle}
                className="w-8 h-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
            >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 accent-purple-500"
            />
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
                {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
        </div>
    );
}

const CRYSTAL_SUGGESTIONS = [
    "Clear Quartz", "Amethyst", "Rose Quartz", "Black Tourmaline",
    "Selenite", "Citrine", "Labradorite", "Lapis Lazuli",
    "Tiger's Eye", "Obsidian"
];

type CatalogueProduct = {
    id: string;
    name: string;
    vendorId: string;
    thumbnail?: { image?: { media?: { url?: string } } };
    skus?: { id: string; price: { amount: number; currency: string }; qty: string }[];
};

function useProductSearch(vendorId: string) {
    const [results, setResults] = useState<CatalogueProduct[]>([]);
    const [searching, setSearching] = useState(false);

    const search = async (query: string) => {
        if (!query.trim() || !vendorId) {
            setResults([]);
            return;
        }
        setSearching(true);
        try {
            const response = await gql<{
                catalogue: { listings: CatalogueProduct[] };
            }>(`
                query SearchProducts($vendorId: ID, $search: String, $types: [String], $limit: Int) {
                    catalogue(vendorId: $vendorId, search: $search, types: $types, limit: $limit) {
                        listings {
                            id
                            name
                            vendorId
                            thumbnail { image { media { url } } }
                            skus { id price { amount currency } qty }
                        }
                    }
                }
            `, { vendorId, search: query, types: ['PRODUCT'], limit: 10 });
            setResults(response.catalogue?.listings || []);
        } catch {
            setResults([]);
        } finally {
            setSearching(false);
        }
    };

    return { results, searching, search, setResults };
}

function AddTrackDialog({
    practitionerId,
    journeyId,
    nextTrackNumber,
    editingTrack,
    onClose,
    canCrossSell,
    currentTier,
}: {
    practitionerId: string;
    journeyId: string;
    nextTrackNumber: number;
    editingTrack?: JourneyTrack;
    onClose: () => void;
    canCrossSell: boolean;
    currentTier?: string;
}) {
    const upsertTrack = useUpsertTrack(practitionerId, journeyId);
    const isEditing = !!editingTrack;

    const [title, setTitle] = useState(editingTrack?.title || "");
    const [description, setDescription] = useState(editingTrack?.description || "");
    const [intention, setIntention] = useState(editingTrack?.intention || "");
    const [integrationPrompts, setIntegrationPrompts] = useState<string[]>(editingTrack?.integrationPrompts || []);
    const [newPrompt, setNewPrompt] = useState("");
    const [recommendedCrystals, setRecommendedCrystals] = useState<string[]>(editingTrack?.recommendedCrystals || []);
    const [linkedProductIds, setLinkedProductIds] = useState<string[]>(editingTrack?.linkedProductIds || []);
    const [linkedProductDetails, setLinkedProductDetails] = useState<CatalogueProduct[]>(
        (editingTrack?.linkedProducts as CatalogueProduct[]) || []
    );
    const [productSearchQuery, setProductSearchQuery] = useState("");
    const productSearch = useProductSearch(practitionerId);
    const [audioFile, setAudioFile] = useState<media_type | null>(editingTrack?.audioFile as media_type || null);
    const [previewDurationSeconds, setPreviewDurationSeconds] = useState(editingTrack?.previewDurationSeconds || 30);

    const addPrompt = () => {
        if (newPrompt.trim()) {
            setIntegrationPrompts(prev => [...prev, newPrompt.trim()]);
            setNewPrompt("");
        }
    };

    const removePrompt = (index: number) => {
        setIntegrationPrompts(prev => prev.filter((_, i) => i !== index));
    };

    const toggleCrystal = (crystal: string) => {
        setRecommendedCrystals(prev =>
            prev.includes(crystal)
                ? prev.filter(c => c !== crystal)
                : [...prev, crystal]
        );
    };

    const addLinkedProduct = (product: CatalogueProduct) => {
        if (linkedProductIds.includes(product.id)) return;
        setLinkedProductIds(prev => [...prev, product.id]);
        setLinkedProductDetails(prev => [...prev, product]);
        setProductSearchQuery("");
        productSearch.setResults([]);
    };

    const removeLinkedProduct = (productId: string) => {
        setLinkedProductIds(prev => prev.filter(id => id !== productId));
        setLinkedProductDetails(prev => prev.filter(p => p.id !== productId));
    };

    const handleSave = async () => {
        if (!title.trim() || !audioFile) return;

        await upsertTrack.mutateAsync({
            ...(editingTrack && { id: editingTrack.id }),
            trackNumber: editingTrack?.trackNumber || nextTrackNumber,
            title: title.trim(),
            description: description.trim() || undefined,
            intention: intention.trim() || undefined,
            durationSeconds: audioFile.durationSeconds || 0,
            audioFile,
            previewDurationSeconds,
            integrationPrompts: integrationPrompts.length > 0 ? integrationPrompts : undefined,
            recommendedCrystals: recommendedCrystals.length > 0 ? recommendedCrystals : undefined,
            linkedProductIds: linkedProductIds.length > 0 ? linkedProductIds : undefined,
        });

        onClose();
    };

    const canSave = title.trim().length > 0 && audioFile !== null;

    return (
        <DialogContent className="w-[700px] max-w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-purple-400" />
                    {isEditing ? "Edit Track" : `Add Track ${nextTrackNumber}`}
                </DialogTitle>
                <DialogDescription>
                    {isEditing
                        ? "Update the track details and audio file"
                        : "Upload an audio file and add details for this track"
                    }
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
                {/* Audio Upload */}
                <div>
                    <Label className="text-white">Audio File *</Label>
                    <p className="text-xs text-slate-400 mb-2">MP3, WAV, OGG, or FLAC</p>

                    {audioFile ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-purple-500/20">
                                        <Music className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">{audioFile.name}</p>
                                        {audioFile.durationSeconds && (
                                            <p className="text-xs text-slate-400">{formatDuration(audioFile.durationSeconds)}</p>
                                        )}
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
                            {audioFile.url && (
                                <AudioPlayer src={audioFile.url} testId="track-audio-preview" />
                            )}
                        </div>
                    ) : (
                        <FileUploader
                            id={`track-audio-upload-${nextTrackNumber}`}
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

                                    // Detect audio duration using the browser Audio API
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

                {/* Title */}
                <div>
                    <Label className="text-white">Title *</Label>
                    <Input
                        dark
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Root Chakra Grounding"
                        className="mt-1"
                        data-testid="track-title-input"
                    />
                </div>

                {/* Description */}
                <div>
                    <Label className="text-white">Description</Label>
                    <Textarea
                        dark
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What will the listener experience in this track?"
                        className="mt-1"
                        rows={2}
                        data-testid="track-description-input"
                    />
                </div>

                {/* Intention */}
                <div>
                    <Label className="text-white">Track Intention</Label>
                    <Textarea
                        dark
                        value={intention}
                        onChange={(e) => setIntention(e.target.value)}
                        placeholder="e.g. I am grounded, safe, and deeply connected to the earth..."
                        className="mt-1"
                        rows={2}
                        data-testid="track-intention-input"
                    />
                </div>

                {/* Preview Duration */}
                <div>
                    <Label className="text-white">Free Preview Duration</Label>
                    <p className="text-xs text-slate-400 mb-1">How many seconds can non-purchasers preview?</p>
                    <Input
                        dark
                        type="number"
                        min={0}
                        max={120}
                        value={previewDurationSeconds}
                        onChange={(e) => setPreviewDurationSeconds(parseInt(e.target.value) || 0)}
                        className="w-32"
                        data-testid="track-preview-duration-input"
                    />
                </div>

                {/* Integration Prompts */}
                <div>
                    <Label className="text-white">Integration Prompts</Label>
                    <p className="text-xs text-slate-400 mb-2">Journal prompts or reflection questions shown after this track</p>
                    <div className="space-y-2">
                        {integrationPrompts.map((prompt, i) => (
                            <div key={i} className="flex items-start gap-2 bg-slate-800/50 border border-slate-700 rounded-lg p-2">
                                <span className="text-sm text-slate-300 flex-1">{prompt}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePrompt(i)}
                                    className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Input
                                dark
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                placeholder="e.g. What sensations did you notice in your body?"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addPrompt();
                                    }
                                }}
                                data-testid="track-prompt-input"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addPrompt}
                                disabled={!newPrompt.trim()}
                                data-testid="add-prompt-btn"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Recommended Crystals */}
                <div>
                    <Label className="text-white">Recommended Crystals</Label>
                    <p className="text-xs text-slate-400 mb-2">Crystals to enhance this track&apos;s experience</p>
                    <div className="flex flex-wrap gap-2">
                        {CRYSTAL_SUGGESTIONS.map(crystal => (
                            <Badge
                                key={crystal}
                                variant={recommendedCrystals.includes(crystal) ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${
                                    recommendedCrystals.includes(crystal)
                                        ? "bg-violet-500/30 text-violet-300 border-violet-500/50"
                                        : "border-slate-600 text-slate-400 hover:border-violet-500/30"
                                }`}
                                onClick={() => toggleCrystal(crystal)}
                                data-testid={`crystal-${crystal.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                {crystal}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Linked Products (Cross-sell) */}
                <FeatureGate
                    allowed={canCrossSell}
                    feature="Journey cross-sell"
                    requiredTier="Manifest"
                    currentTier={currentTier}
                >
                <div>
                    <Label className="text-white flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-400" />
                        Linked Products
                    </Label>
                    <p className="text-xs text-slate-400 mb-2">
                        Link products from your catalogue that pair well with this track. Customers can add them to cart while listening.
                    </p>

                    {/* Linked products list */}
                    {linkedProductDetails.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {linkedProductDetails.map(product => (
                                <div key={product.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg p-2">
                                    <div className="w-10 h-10 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                                        {product.thumbnail?.image?.media?.url ? (
                                            <img src={product.thumbnail.image.media.url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-4 h-4 text-slate-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{product.name}</p>
                                        {product.skus?.[0]?.price && (
                                            <CurrencySpan value={product.skus[0].price} className="text-xs text-slate-400" />
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeLinkedProduct(product.id)}
                                        className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                                        data-testid={`remove-linked-product-${product.id}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Product search */}
                    <div className="relative">
                        <Input
                            dark
                            value={productSearchQuery}
                            onChange={(e) => {
                                setProductSearchQuery(e.target.value);
                                productSearch.search(e.target.value);
                            }}
                            placeholder="Search your products..."
                            data-testid="linked-product-search"
                        />
                        {productSearch.searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                        )}

                        {/* Search results dropdown */}
                        {productSearch.results.length > 0 && productSearchQuery.trim() && (
                            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {productSearch.results
                                    .filter(p => !linkedProductIds.includes(p.id))
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => addLinkedProduct(product)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-slate-700/50 transition-colors text-left"
                                            data-testid={`product-result-${product.id}`}
                                        >
                                            <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                                                {product.thumbnail?.image?.media?.url ? (
                                                    <img src={product.thumbnail.image.media.url} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{product.name}</p>
                                                {product.skus?.[0]?.price && (
                                                    <CurrencySpan value={product.skus[0].price} className="text-xs text-slate-400" />
                                                )}
                                            </div>
                                            <Plus className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
                </FeatureGate>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || upsertTrack.isPending}
                    data-testid="save-track-btn"
                >
                    {upsertTrack.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {isEditing ? "Update Track" : "Add Track"}
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function JourneyTrackManager({ practitionerId, journey, onBack }: Props) {
    const tracks = useJourneyTracks(journey.id, practitionerId);
    const deleteTrack = useDeleteTrack(practitionerId, journey.id);
    const reorderTracks = useReorderTracks(practitionerId, journey.id);
    const upsertTrack = useUpsertTrack(practitionerId, journey.id);
    const { features, tier } = useTierFeatures(practitionerId);
    const canCrossSell = (features.maxProducts ?? 0) > 0;
    const [showAddTrack, setShowAddTrack] = useState(false);
    const [editingTrack, setEditingTrack] = useState<JourneyTrack | null>(null);
    const [deletingTrack, setDeletingTrack] = useState<JourneyTrack | null>(null);
    const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
    const [bulkUploading, setBulkUploading] = useState(false);
    const bulkInputRef = useRef<HTMLInputElement>(null);

    const trackList = tracks.data || [];
    const nextTrackNumber = trackList.length > 0
        ? Math.max(...trackList.map(t => t.trackNumber)) + 1
        : 1;

    const totalDuration = trackList.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);

    const handleDeleteTrack = async () => {
        if (!deletingTrack) return;
        await deleteTrack.mutateAsync(deletingTrack.id);
        setDeletingTrack(null);
    };

    const handleMoveTrack = (trackId: string, direction: 'up' | 'down') => {
        const sorted = [...trackList].sort((a, b) => a.trackNumber - b.trackNumber);
        const idx = sorted.findIndex(t => t.id === trackId);
        if (direction === 'up' && idx <= 0) return;
        if (direction === 'down' && idx >= sorted.length - 1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const newOrder = sorted.map(t => t.id);
        [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
        reorderTracks.mutate(newOrder);
    };

    const handleBulkUpload = async (files: FileList) => {
        setBulkUploading(true);
        try {
            const audioFiles = Array.from(files).filter(f => {
                const ext = f.name.split('.').pop()?.toLowerCase() || '';
                return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'webm'].includes(ext);
            });

            for (let i = 0; i < audioFiles.length; i++) {
                const file = audioFiles[i];
                const formData = new FormData();
                formData.append('files', file);

                let finalFilename = file.name.split('.')[0].replace(/%20/g, '-').replace(/ /g, '-');
                const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
                finalFilename = `${finalFilename}.${ext}`;

                const container = 'public';
                const relative_path = `merchant/${practitionerId}/journey/${journey.id}/tracks`;

                await fetch('/api/azure_upload', {
                    method: 'POST',
                    body: formData,
                    headers: { 'container': container, 'relative_path': relative_path }
                });

                const url = `https://${process.env.NEXT_PUBLIC_STORAGE_ACCOUNT}.blob.core.windows.net/${container}/${relative_path}/${encodeURIComponent(finalFilename)}`;
                const urlRelative = `${container}/${relative_path}/${finalFilename}`;

                // Detect duration
                let duration = 0;
                try {
                    duration = await new Promise<number>((resolve) => {
                        const audio = new Audio();
                        audio.src = url;
                        audio.addEventListener('loadedmetadata', () => resolve(Math.round(audio.duration)));
                        audio.addEventListener('error', () => resolve(0));
                        setTimeout(() => resolve(0), 10000);
                    });
                } catch { /* fallback to 0 */ }

                // Create track from filename
                const trackTitle = file.name.split('.').slice(0, -1).join('.')
                    .replace(/[-_]/g, ' ')
                    .replace(/^\d+\s*/, '') // strip leading numbers like "01 "
                    .replace(/\b\w/g, c => c.toUpperCase()); // title case

                await upsertTrack.mutateAsync({
                    trackNumber: nextTrackNumber + i,
                    title: trackTitle || `Track ${nextTrackNumber + i}`,
                    durationSeconds: duration,
                    audioFile: {
                        code: Math.random().toString(36).substring(7),
                        name: finalFilename,
                        url,
                        urlRelative,
                        type: 'AUDIO',
                        size: 'RECTANGLE_HORIZONTAL',
                        sizeBytes: file.size,
                        durationSeconds: duration,
                    },
                });
            }
        } finally {
            setBulkUploading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="text-slate-400 hover:text-white mb-3 -ml-2"
                    data-testid="track-manager-back-btn"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Journeys
                </Button>

                {/* Journey Summary Card */}
                <div className="flex gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-6">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700/50 flex-shrink-0">
                        {journey.thumbnail?.image?.media?.url ? (
                            <img
                                src={journey.thumbnail.image.media.url}
                                alt={journey.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <Headphones className="w-8 h-8" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-xl font-bold text-white truncate">{journey.name}</h1>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                                {journey.journeyStructure === 'SINGLE_TRACK' ? 'Single Track'
                                    : journey.journeyStructure === 'SERIES' ? 'Series'
                                    : 'Collection'}
                            </Badge>
                            {journey.isLive ? (
                                <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex-shrink-0">Published</Badge>
                            ) : (
                                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 flex-shrink-0">Draft</Badge>
                            )}
                        </div>
                        {journey.description && (
                            <p className="text-sm text-slate-400 mb-2 line-clamp-1">{journey.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                                <Music className="w-3.5 h-3.5" />
                                {trackList.length} track{trackList.length !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(totalDuration)} total
                            </span>
                            {journey.pricing?.collectionPrice && (
                                <span className="flex items-center gap-1">
                                    {journey.pricing.collectionPrice.amount === 0
                                        ? 'Free'
                                        : <CurrencySpan value={journey.pricing.collectionPrice} />
                                    }
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        {journey.journeyStructure === 'SINGLE_TRACK' ? 'Track' : 'Tracks'}
                    </h2>
                    {!(journey.journeyStructure === 'SINGLE_TRACK' && trackList.length >= 1) && (
                        <div className="flex items-center gap-2">
                            {journey.journeyStructure !== 'SINGLE_TRACK' && (
                                <>
                                    <input
                                        ref={bulkInputRef}
                                        type="file"
                                        multiple
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleBulkUpload(e.target.files);
                                                e.target.value = '';
                                            }
                                        }}
                                        data-testid="bulk-upload-input"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => bulkInputRef.current?.click()}
                                        disabled={bulkUploading}
                                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                                        data-testid="bulk-upload-btn"
                                    >
                                        {bulkUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Files className="w-4 h-4 mr-2" />
                                                Bulk Upload
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                            <Button
                                type="button"
                                onClick={() => setShowAddTrack(true)}
                                className="bg-purple-600 hover:bg-purple-700"
                                data-testid="add-track-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Track
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Track List */}
            {tracks.isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-slate-800/30 rounded-lg animate-pulse border border-slate-700/50" />
                    ))}
                </div>
            ) : trackList.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-700">
                    <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-lg text-slate-300 font-medium mb-2">No tracks yet</p>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">
                        Upload your audio recordings to build your guided journey.
                        Each track can have its own intention, journal prompts, and crystal recommendations.
                    </p>
                    <Button
                        type="button"
                        onClick={() => setShowAddTrack(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="add-first-track-btn"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Upload Your First Track
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {trackList
                        .sort((a, b) => a.trackNumber - b.trackNumber)
                        .map((track) => {
                            const isExpanded = expandedTrack === track.id;
                            return (
                                <div
                                    key={track.id}
                                    className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
                                    data-testid={`track-row-${track.id}`}
                                >
                                    {/* Track Row */}
                                    <div className="flex items-center gap-3 p-3">
                                        <div className="text-slate-600 cursor-grab">
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-semibold text-purple-400">{track.trackNumber}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{track.title}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(track.durationSeconds)}
                                                </span>
                                                {track.intention && (
                                                    <span className="truncate max-w-[200px]">{track.intention}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleMoveTrack(track.id, 'up')}
                                                disabled={track.trackNumber <= 1 || reorderTracks.isPending}
                                                className="text-slate-400 hover:text-white h-8 w-8 p-0 disabled:opacity-30"
                                                data-testid={`move-up-track-${track.id}`}
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleMoveTrack(track.id, 'down')}
                                                disabled={track.trackNumber >= trackList.length || reorderTracks.isPending}
                                                className="text-slate-400 hover:text-white h-8 w-8 p-0 disabled:opacity-30"
                                                data-testid={`move-down-track-${track.id}`}
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                                                className="text-slate-400 hover:text-white h-8 w-8 p-0"
                                                data-testid={`expand-track-${track.id}`}
                                            >
                                                {isExpanded
                                                    ? <ChevronUp className="w-4 h-4" />
                                                    : <ChevronDown className="w-4 h-4" />
                                                }
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingTrack(track)}
                                                className="text-slate-400 hover:text-white h-8 w-8 p-0"
                                                data-testid={`edit-track-${track.id}`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeletingTrack(track)}
                                                className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                                                data-testid={`delete-track-${track.id}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 space-y-3">
                                            {/* Audio Player */}
                                            {track.audioFile?.url && (
                                                <AudioPlayer
                                                    src={track.audioFile.url}
                                                    testId={`track-player-${track.id}`}
                                                />
                                            )}

                                            {track.description && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Description</p>
                                                    <p className="text-sm text-slate-300">{track.description}</p>
                                                </div>
                                            )}

                                            {track.intention && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Intention</p>
                                                    <p className="text-sm text-slate-300 italic">&ldquo;{track.intention}&rdquo;</p>
                                                </div>
                                            )}

                                            {track.integrationPrompts && track.integrationPrompts.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Integration Prompts</p>
                                                    <ul className="space-y-1">
                                                        {track.integrationPrompts.map((prompt, i) => (
                                                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                                <span className="text-purple-400 mt-0.5">&#x2022;</span>
                                                                {prompt}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {track.recommendedCrystals && track.recommendedCrystals.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Recommended Crystals</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {track.recommendedCrystals.map(crystal => (
                                                            <Badge
                                                                key={crystal}
                                                                variant="outline"
                                                                className="text-xs border-violet-500/30 text-violet-300"
                                                            >
                                                                {crystal}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {track.linkedProducts && track.linkedProducts.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Linked Products</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {track.linkedProducts.map(product => (
                                                            <div key={product.id} className="flex items-center gap-2 bg-slate-800/50 border border-emerald-500/20 rounded-lg px-2 py-1">
                                                                <ShoppingCart className="w-3 h-3 text-emerald-400" />
                                                                <span className="text-xs text-slate-300">{product.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Add Track Dialog */}
            <Dialog open={showAddTrack} onOpenChange={setShowAddTrack}>
                {showAddTrack && (
                    <AddTrackDialog
                        practitionerId={practitionerId}
                        journeyId={journey.id}
                        nextTrackNumber={nextTrackNumber}
                        onClose={() => setShowAddTrack(false)}
                        canCrossSell={canCrossSell}
                        currentTier={tier}
                    />
                )}
            </Dialog>

            {/* Edit Track Dialog */}
            {editingTrack && (
                <Dialog open onOpenChange={(open) => { if (!open) setEditingTrack(null); }}>
                    <AddTrackDialog
                        practitionerId={practitionerId}
                        journeyId={journey.id}
                        nextTrackNumber={editingTrack.trackNumber}
                        editingTrack={editingTrack}
                        onClose={() => setEditingTrack(null)}
                        canCrossSell={canCrossSell}
                        currentTier={tier}
                    />
                </Dialog>
            )}

            {/* Delete Track Confirmation */}
            {deletingTrack && (
                <Dialog open onOpenChange={(open) => { if (!open) setDeletingTrack(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete Track</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete &quot;{deletingTrack.title}&quot;?
                                The audio file will be removed. Existing purchasers who have already downloaded this track will not be affected.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDeletingTrack(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteTrack}
                                disabled={deleteTrack.isPending}
                                data-testid="confirm-delete-track-btn"
                            >
                                {deleteTrack.isPending ? "Deleting..." : "Delete Track"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

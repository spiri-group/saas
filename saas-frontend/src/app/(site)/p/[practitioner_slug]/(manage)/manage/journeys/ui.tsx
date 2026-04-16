'use client'

import { useState } from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, Plus, Trash2, Pencil, Clock, Music, Eye, EyeOff, ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useJourneys, { JourneyListItem } from "./_hooks/UseJourneys";
import useCreateJourney from "./_hooks/UseCreateJourney";
import CurrencySpan from "@/components/ux/CurrencySpan";
import CreateJourneyDialog from "./_components/CreateJourneyDialog";
import JourneyTrackManager from "./_components/JourneyTrackManager";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

function formatDuration(totalSeconds: number): string {
    if (!totalSeconds) return "0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

const getStructureLabel = (structure?: string) => {
    switch (structure) {
        case 'SINGLE_TRACK': return 'Single Track';
        case 'COLLECTION': return 'Collection';
        case 'SERIES': return 'Series';
        default: return structure;
    }
};

function JourneyCard({
    journey,
    onEdit,
    onDelete,
    onTogglePublish,
    onManageTracks,
    isDeleting,
    isPublishing,
}: {
    journey: JourneyListItem;
    onEdit: () => void;
    onDelete: () => void;
    onTogglePublish: () => void;
    onManageTracks: () => void;
    isDeleting: boolean;
    isPublishing: boolean;
}) {
    const price = journey.pricing?.collectionPrice;

    return (
        <div
            className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
            onClick={onManageTracks}
            data-testid={`journey-card-${journey.id}`}
        >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700/50 flex-shrink-0">
                {journey.thumbnail?.image?.media?.url ? (
                    <img
                        src={journey.thumbnail.image.media.url}
                        alt={journey.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Headphones className="w-6 h-6" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium truncate">{journey.name}</h3>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                        {getStructureLabel(journey.journeyStructure)}
                    </Badge>
                    {journey.isLive ? (
                        <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Published
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                            Draft
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                    {price && (
                        <CurrencySpan value={price} />
                    )}
                    <span className="flex items-center gap-1">
                        <ListMusic className="w-3 h-3" />
                        {journey.trackCount || 0} track{(journey.trackCount || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(journey.totalDurationSeconds)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onTogglePublish}
                    disabled={isPublishing}
                    className="text-slate-400 hover:text-white"
                    title={journey.isLive ? "Unpublish" : "Publish"}
                    data-testid={`toggle-publish-journey-${journey.id}`}
                >
                    {journey.isLive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="text-slate-400 hover:text-white"
                    data-testid={`edit-journey-${journey.id}`}
                >
                    <Pencil className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="text-slate-400 hover:text-red-400"
                    data-testid={`delete-journey-${journey.id}`}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

export default function PractitionerJourneysUI({ session, practitionerId, slug }: Props) {
    const journeys = useJourneys(practitionerId);
    const { updateMutation } = useCreateJourney(practitionerId);
    const [createWithStructure, setCreateWithStructure] = useState<string | null>(null);
    const [editingJourney, setEditingJourney] = useState<JourneyListItem | null>(null);
    const [deletingJourney, setDeletingJourney] = useState<JourneyListItem | null>(null);
    const [managingJourney, setManagingJourney] = useState<JourneyListItem | null>(null);

    const handleDelete = async () => {
        if (!deletingJourney) return;
        // Reuse the generic delete_listing mutation
        const { gql } = await import('@/lib/services/gql');
        await gql(`
            mutation DeleteJourney($id: String!, $vendorId: String!) {
                delete_listing(id: $id, vendorId: $vendorId) {
                    code
                    success
                    message
                }
            }
        `, { id: deletingJourney.id, vendorId: practitionerId });
        setDeletingJourney(null);
        journeys.refetch();
    };

    const handleTogglePublish = (journey: JourneyListItem) => {
        if (!journey.isLive && (journey.trackCount || 0) === 0) {
            alert("Add at least one track before publishing your journey.");
            return;
        }
        updateMutation.mutate({
            id: journey.id,
            name: journey.name,
            description: journey.description || "",
            journeyStructure: journey.journeyStructure,
            pricing: journey.pricing,
            isLive: !journey.isLive,
        });
    };

    return (
        <>
            <div className="p-4 md:p-6">
                <div className="w-full">
                    {managingJourney ? (
                        <JourneyTrackManager
                            practitionerId={practitionerId}
                            journey={managingJourney}
                            onBack={() => setManagingJourney(null)}
                        />
                    ) : (
                    <>
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Headphones className="w-6 h-6 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Guided Journeys</h1>
                        </div>
                        <p className="text-slate-400">
                            Create and sell meditation recordings, guided audio journeys, and spiritual audio collections
                        </p>
                    </div>

                    {/* Create New */}
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card
                                className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                                onClick={() => setCreateWithStructure("SINGLE_TRACK")}
                                data-testid="create-journey-card"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                            <Music className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">Single Track</CardTitle>
                                            <CardDescription className="text-slate-400">A standalone meditation or recording</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                        data-testid="create-single-track-btn"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Track
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card
                                className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                                onClick={() => setCreateWithStructure("COLLECTION")}
                                data-testid="create-collection-card"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                            <ListMusic className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">Collection</CardTitle>
                                            <CardDescription className="text-slate-400">A multi-track guided journey</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                        data-testid="create-collection-btn"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Collection
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card
                                className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                                onClick={() => setCreateWithStructure("SERIES")}
                                data-testid="create-series-card"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                            <Headphones className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">Series</CardTitle>
                                            <CardDescription className="text-slate-400">Drip-released tracks over time</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                        data-testid="create-series-btn"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Series
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Journey List */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Your Journeys</h2>

                        {journeys.isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-slate-800/30 rounded-lg animate-pulse border border-slate-700/50" />
                                ))}
                            </div>
                        ) : journeys.data && journeys.data.length > 0 ? (
                            <div className="space-y-3">
                                {journeys.data.map((journey) => (
                                    <JourneyCard
                                        key={journey.id}
                                        journey={journey}
                                        onEdit={() => setEditingJourney(journey)}
                                        onDelete={() => setDeletingJourney(journey)}
                                        onTogglePublish={() => handleTogglePublish(journey)}
                                        onManageTracks={() => setManagingJourney(journey)}
                                        isDeleting={false}
                                        isPublishing={updateMutation.isPending}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <Headphones className="w-12 h-12 text-slate-600 mb-4" />
                                    <p className="text-slate-400 mb-2">No journeys created yet</p>
                                    <p className="text-slate-500 text-sm">
                                        Create your first guided audio journey to start selling meditation recordings
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    </>
                    )}
                </div>
            </div>

            {/* Create Journey Dialog */}
            {createWithStructure && (
                <Dialog open onOpenChange={(open) => { if (!open) setCreateWithStructure(null); }}>
                    <CreateJourneyDialog
                        practitionerId={practitionerId}
                        defaultStructure={createWithStructure}
                        onClose={() => setCreateWithStructure(null)}
                        onCreated={(journey) => {
                            setCreateWithStructure(null);
                            journeys.refetch().then(() => {
                                setManagingJourney(journey);
                            });
                        }}
                    />
                </Dialog>
            )}

            {/* Edit Journey Dialog */}
            {editingJourney && (
                <Dialog open onOpenChange={(open) => { if (!open) setEditingJourney(null); }}>
                    <CreateJourneyDialog
                        practitionerId={practitionerId}
                        editingJourney={editingJourney}
                        onClose={() => setEditingJourney(null)}
                    />
                </Dialog>
            )}

            {/* Delete Confirmation */}
            {deletingJourney && (
                <Dialog open onOpenChange={(open) => { if (!open) setDeletingJourney(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete Journey</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete &quot;{deletingJourney.name}&quot;? This will remove all tracks. Existing purchases will not be affected.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeletingJourney(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                data-testid="confirm-delete-journey-btn"
                            >
                                Delete Journey
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

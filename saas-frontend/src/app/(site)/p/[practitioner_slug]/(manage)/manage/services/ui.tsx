'use client'

import React, { useState } from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Heart, MessageCircle, Plus, Trash2, Pencil, Clock, DollarSign, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import usePractitionerServices, { PractitionerService } from "./_hooks/UsePractitionerServices";
import useDeleteService from "./_hooks/UseDeleteService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import { decodeAmountFromSmallestUnit } from "@/lib/functions";
import CreateReading from "./_components/CreateReading";
import CreateHealing from "./_components/CreateHealing";
import CreateCoaching from "./_components/CreateCoaching";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

const CreateServiceButton: React.FC<{
    label: string;
    description: string;
    icon: React.ReactNode;
    dialogId: string;
}> = ({ label, description, icon, dialogId }) => {
    const handleClick = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: [label],
                action: {
                    type: "dialog",
                    dialog: dialogId
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Card
            className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
            onClick={handleClick}
            data-testid={`create-service-${label.toLowerCase()}-card`}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                        {icon}
                    </div>
                    <div>
                        <CardTitle className="text-white text-lg">{label}</CardTitle>
                        <CardDescription className="text-slate-400">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button
                    variant="outline"
                    className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                    data-testid={`create-service-${label.toLowerCase()}-btn`}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create {label}
                </Button>
            </CardContent>
        </Card>
    );
};

const getCategoryIcon = (category?: string) => {
    switch (category) {
        case 'READING': return <Sparkles className="w-4 h-4" />;
        case 'HEALING': return <Heart className="w-4 h-4" />;
        case 'COACHING': return <MessageCircle className="w-4 h-4" />;
        default: return <BookOpen className="w-4 h-4" />;
    }
};

const getCategoryLabel = (category?: string) => {
    switch (category) {
        case 'READING': return 'Reading';
        case 'HEALING': return 'Healing';
        case 'COACHING': return 'Coaching';
        default: return 'Service';
    }
};

const getDeliveryLabel = (mode?: string) => {
    switch (mode) {
        case 'ASYNC': return 'Async delivery';
        case 'SYNC': return 'Live session';
        default: return mode;
    }
};

function ServiceCard({
    service,
    onEdit,
    onDelete,
    isDeleting,
}: {
    service: PractitionerService;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting: boolean;
}) {
    const price = service.pricing?.fixedPrice;

    return (
        <div
            className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors"
            data-testid={`service-card-${service.id}`}
        >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700/50 flex-shrink-0">
                {service.thumbnail?.image?.media?.url ? (
                    <img
                        src={service.thumbnail.image.media.url}
                        alt={service.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        {getCategoryIcon(service.category)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-medium truncate">{service.name}</h3>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 flex-shrink-0">
                        {getCategoryIcon(service.category)}
                        <span className="ml-1">{getCategoryLabel(service.category)}</span>
                    </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                    {price && (
                        <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${decodeAmountFromSmallestUnit(price.amount, price.currency)} {price.currency}
                        </span>
                    )}
                    {service.turnaroundDays && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {service.turnaroundDays}d turnaround
                        </span>
                    )}
                    {service.deliveryMode && (
                        <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {getDeliveryLabel(service.deliveryMode)}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="text-slate-400 hover:text-white"
                    data-testid={`edit-service-${service.id}`}
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
                    data-testid={`delete-service-${service.id}`}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function DeleteConfirmDialog({
    service,
    open,
    onOpenChange,
    onConfirm,
    isDeleting,
}: {
    service: PractitionerService;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isDeleting: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete Service</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete &quot;{service.name}&quot;? This action cannot be undone. Existing orders will not be affected.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        data-testid="confirm-delete-service-btn"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Service'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function getEditDialogClassName(category?: string) {
    if (category === 'READING') return "w-[1000px] max-w-[95vw] h-[800px]";
    return "w-[870px] max-w-[95vw] h-[700px]";
}

export default function PractitionerServicesUI({ session, practitionerId, slug }: Props) {
    const services = usePractitionerServices(practitionerId);
    const deleteMutation = useDeleteService(practitionerId);
    const { features } = useTierFeatures(practitionerId);
    const [editingService, setEditingService] = useState<PractitionerService | null>(null);
    const [deletingService, setDeletingService] = useState<PractitionerService | null>(null);

    const handleDelete = () => {
        if (deletingService) {
            deleteMutation.mutate(deletingService.id, {
                onSuccess: () => setDeletingService(null),
            });
        }
    };

    const handleCloseEdit = () => setEditingService(null);

    return (
        <div className="flex min-h-full">
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            <div className="flex-1 md:ml-[200px] p-4 md:p-6">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <BookOpen className="w-6 h-6 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white" data-testid="services-page-title">My Services</h1>
                        </div>
                        <p className="text-slate-400">
                            Create and manage your service offerings
                        </p>
                    </div>

                    {/* Create New Service Section */}
                    {features.canSellServices && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-white mb-4">Create New Service</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CreateServiceButton
                                    label="Reading"
                                    description="Tarot, oracle, or psychic readings"
                                    icon={<Sparkles className="w-5 h-5" />}
                                    dialogId="Create Reading"
                                />
                                <CreateServiceButton
                                    label="Healing"
                                    description="Reiki, energy healing, or sound therapy"
                                    icon={<Heart className="w-5 h-5" />}
                                    dialogId="Create Healing"
                                />
                                <CreateServiceButton
                                    label="Coaching"
                                    description="Spiritual or life coaching sessions"
                                    icon={<MessageCircle className="w-5 h-5" />}
                                    dialogId="Create Coaching"
                                />
                            </div>
                        </div>
                    )}

                    {/* Active Services List */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Your Active Services</h2>

                        {services.isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-slate-800/30 rounded-lg animate-pulse border border-slate-700/50" />
                                ))}
                            </div>
                        ) : services.data && services.data.length > 0 ? (
                            <div className="space-y-3">
                                {services.data.map((service) => (
                                    <ServiceCard
                                        key={service.id}
                                        service={service}
                                        onEdit={() => setEditingService(service)}
                                        onDelete={() => setDeletingService(service)}
                                        isDeleting={deleteMutation.isPending && deletingService?.id === service.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                                    <p className="text-slate-400 mb-2">No services created yet</p>
                                    <p className="text-slate-500 text-sm">
                                        Create your first service offering to start receiving bookings
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Service Dialog - uses the full create/edit dialog based on category */}
            {editingService && editingService.category === 'READING' && (
                <Dialog open onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
                    <CreateReading
                        merchantId={practitionerId}
                        editingService={editingService}
                        onClose={handleCloseEdit}
                    />
                </Dialog>
            )}
            {editingService && (editingService.category === 'HEALING' || editingService.category === 'COACHING') && (
                <Dialog open onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
                    <DialogContent className="w-[870px] max-w-[95vw] h-[700px] max-h-[90vh] overflow-y-auto">
                        {editingService.category === 'HEALING' && (
                            <CreateHealing
                                merchantId={practitionerId}
                                editingService={editingService}
                                onClose={handleCloseEdit}
                            />
                        )}
                        {editingService.category === 'COACHING' && (
                            <CreateCoaching
                                merchantId={practitionerId}
                                editingService={editingService}
                                onClose={handleCloseEdit}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            {deletingService && (
                <DeleteConfirmDialog
                    service={deletingService}
                    open={!!deletingService}
                    onOpenChange={(open) => { if (!open) setDeletingService(null); }}
                    onConfirm={handleDelete}
                    isDeleting={deleteMutation.isPending}
                />
            )}
        </div>
    );
}

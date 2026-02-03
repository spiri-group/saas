'use client'

import React, { useState } from "react";
import { Session } from "next-auth";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import { usePractitionerTestimonials, useCreateTestimonialRequest, useDeleteTestimonial, usePinTestimonials } from "./_hooks/UseTestimonials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Quote, Plus, Copy, Check, Trash2, Star, Pin, LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

type Testimonial = {
    id: string;
    practitionerId: string;
    clientName: string;
    clientEmail?: string;
    rating: number;
    headline: string;
    text: string;
    relationship?: string;
    createdAt: string;
};

export default function PractitionerTestimonialsUI({ session, practitionerId, slug }: Props) {
    const { data: testimonials = [], isLoading: loadingTestimonials } = usePractitionerTestimonials(practitionerId);
    const createRequestMutation = useCreateTestimonialRequest();
    const deleteTestimonialMutation = useDeleteTestimonial();
    const pinTestimonialsMutation = usePinTestimonials();

    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    const handleCreateRequest = async () => {
        try {
            const result = await createRequestMutation.mutateAsync({
                practitionerId,
                clientEmail: clientEmail || undefined,
                clientName: clientName || undefined
            });
            setGeneratedLink(result.submissionUrl);
            toast.success('Testimonial request link created!');
        } catch {
            toast.error('Failed to create testimonial request');
        }
    };

    const handleCopyLink = async () => {
        if (generatedLink) {
            await navigator.clipboard.writeText(generatedLink);
            setCopiedLink(true);
            toast.success('Link copied to clipboard!');
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    const handleCloseDialog = () => {
        setIsRequestDialogOpen(false);
        setClientName('');
        setClientEmail('');
        setGeneratedLink(null);
        setCopiedLink(false);
    };

    const handleDeleteTestimonial = async (testimonialId: string) => {
        try {
            await deleteTestimonialMutation.mutateAsync({ practitionerId, testimonialId });
            toast.success('Testimonial deleted');
        } catch {
            toast.error('Failed to delete testimonial');
        }
    };

    const togglePin = (testimonialId: string) => {
        setPinnedIds(current => {
            if (current.includes(testimonialId)) {
                return current.filter(id => id !== testimonialId);
            }
            if (current.length < 3) {
                return [...current, testimonialId];
            }
            toast.error('Maximum 3 testimonials can be pinned');
            return current;
        });
    };

    const handleSavePins = async () => {
        try {
            await pinTestimonialsMutation.mutateAsync({ practitionerId, pinnedTestimonialIds: pinnedIds });
            toast.success('Pinned testimonials updated');
        } catch {
            toast.error('Failed to update pinned testimonials');
        }
    };

    return (
        <div className="flex min-h-full">
            {/* Sidebar */}
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            {/* Main Content */}
            <div className="flex-1 md:ml-[200px] p-8">
                <div className="w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Quote className="w-6 h-6 text-amber-400" />
                                Testimonials
                            </h1>
                            <p className="text-slate-400 mt-1">
                                Request testimonials from past clients to showcase on your profile
                            </p>
                        </div>

                        <Dialog open={isRequestDialogOpen} onOpenChange={(open) => open ? setIsRequestDialogOpen(true) : handleCloseDialog()}>
                            <DialogTrigger asChild>
                                <Button data-testid="request-testimonial-btn" className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Request Testimonial
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]" data-testid="request-testimonial-dialog">
                                <DialogHeader>
                                    <DialogTitle>Request a Testimonial</DialogTitle>
                                    <DialogDescription>
                                        Generate a unique link to send to a past client. They can use it to write a testimonial about their experience with you.
                                    </DialogDescription>
                                </DialogHeader>

                                {!generatedLink ? (
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="clientName">Client Name (optional)</Label>
                                            <Input
                                                id="clientName"
                                                placeholder="e.g. Jane Smith"
                                                value={clientName}
                                                onChange={(e) => setClientName(e.target.value)}
                                                data-testid="client-name-input"
                                            />
                                            <p className="text-xs text-slate-500">Pre-fill their name on the form</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="clientEmail">Client Email (optional)</Label>
                                            <Input
                                                id="clientEmail"
                                                type="email"
                                                placeholder="e.g. jane@example.com"
                                                value={clientEmail}
                                                onChange={(e) => setClientEmail(e.target.value)}
                                                data-testid="client-email-input"
                                            />
                                            <p className="text-xs text-slate-500">For your records only - not visible to client</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4 space-y-4">
                                        <div className="bg-slate-100 rounded-lg p-4">
                                            <Label className="text-slate-700 mb-2 block">Your Testimonial Request Link</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={generatedLink}
                                                    readOnly
                                                    className="bg-white font-mono text-sm"
                                                    data-testid="generated-link-input"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={handleCopyLink}
                                                    data-testid="copy-link-btn"
                                                >
                                                    {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                This link expires in 30 days. Share it with your client to collect their testimonial.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <DialogFooter>
                                    {!generatedLink ? (
                                        <Button
                                            onClick={handleCreateRequest}
                                            disabled={createRequestMutation.isPending}
                                            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
                                            data-testid="generate-link-btn"
                                        >
                                            {createRequestMutation.isPending ? 'Generating...' : 'Generate Link'}
                                            <LinkIcon className="w-4 h-4 ml-2" />
                                        </Button>
                                    ) : (
                                        <Button onClick={handleCloseDialog} data-testid="done-btn">
                                            Done
                                        </Button>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Received Testimonials */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Received Testimonials</h2>
                            {pinnedIds.length > 0 && (
                                <Button
                                    size="sm"
                                    onClick={handleSavePins}
                                    disabled={pinTestimonialsMutation.isPending}
                                    className="bg-purple-500 hover:bg-purple-600"
                                    data-testid="save-pins-btn"
                                >
                                    <Pin className="w-4 h-4 mr-2" />
                                    Save Pinned ({pinnedIds.length}/3)
                                </Button>
                            )}
                        </div>

                        {loadingTestimonials ? (
                            <div className="text-center py-12 text-slate-400">Loading testimonials...</div>
                        ) : testimonials.length === 0 ? (
                            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                                <Quote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No testimonials yet</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Send testimonial request links to your past clients
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {testimonials.map((testimonial: Testimonial) => {
                                    const isPinned = pinnedIds.includes(testimonial.id);
                                    return (
                                        <div
                                            key={testimonial.id}
                                            className={cn(
                                                "bg-slate-800 rounded-lg p-5 border-2 transition-all",
                                                isPinned ? "border-purple-500" : "border-slate-700"
                                            )}
                                            data-testid={`testimonial-${testimonial.id}`}
                                        >
                                            {/* Rating */}
                                            <div className="flex items-center gap-1 mb-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            "w-4 h-4",
                                                            star <= testimonial.rating
                                                                ? "text-amber-500 fill-amber-500"
                                                                : "text-slate-600"
                                                        )}
                                                    />
                                                ))}
                                            </div>

                                            {/* Headline */}
                                            <h3 className="text-white font-semibold mb-2">{testimonial.headline}</h3>

                                            {/* Text */}
                                            <p className="text-slate-300 text-sm leading-relaxed mb-4">{testimonial.text}</p>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                                                <div>
                                                    <p className="text-white font-medium text-sm">{testimonial.clientName}</p>
                                                    {testimonial.relationship && (
                                                        <p className="text-slate-500 text-xs">{testimonial.relationship}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => togglePin(testimonial.id)}
                                                        className={cn(
                                                            isPinned ? "text-purple-400 hover:text-purple-300" : "text-slate-500 hover:text-white"
                                                        )}
                                                        data-testid={`pin-testimonial-${testimonial.id}`}
                                                    >
                                                        <Pin className={cn("w-4 h-4", isPinned && "fill-current")} />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-slate-500 hover:text-red-400"
                                                                data-testid={`delete-testimonial-${testimonial.id}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. The testimonial from {testimonial.clientName} will be permanently deleted.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDeleteTestimonial(testimonial.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    data-testid="confirm-delete-testimonial"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client'

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTestimonialRequestInfo, useSubmitTestimonial } from "../../p/[practitioner_slug]/(manage)/manage/testimonials/_hooks/UseTestimonials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Quote, Star, CheckCircle2, AlertCircle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

export default function TestimonialSubmitUI() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const { data: requestInfo, isLoading, error } = useTestimonialRequestInfo(token);
    const submitMutation = useSubmitTestimonial();

    const [clientName, setClientName] = useState('');
    const [rating, setRating] = useState(0);
    const [headline, setHeadline] = useState('');
    const [text, setText] = useState('');
    const [relationship, setRelationship] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Pre-fill client name from request
    React.useEffect(() => {
        if (requestInfo?.clientName) {
            setClientName(requestInfo.clientName);
        }
    }, [requestInfo?.clientName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        if (!headline.trim()) {
            toast.error('Please enter a headline');
            return;
        }

        if (!text.trim()) {
            toast.error('Please write your testimonial');
            return;
        }

        try {
            await submitMutation.mutateAsync({
                token,
                clientName: clientName.trim(),
                rating,
                headline: headline.trim(),
                text: text.trim(),
                relationship: relationship.trim() || undefined
            });
            setIsSubmitted(true);
            toast.success('Thank you for your testimonial!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to submit testimonial');
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
                    <p className="text-slate-400">
                        This testimonial link is invalid. Please check the URL and try again.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (error || !requestInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Link Not Found</h1>
                    <p className="text-slate-400">
                        This testimonial link may have expired or is invalid.
                    </p>
                </div>
            </div>
        );
    }

    if (requestInfo.requestStatus === 'SUBMITTED') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Already Submitted</h1>
                    <p className="text-slate-400">
                        A testimonial has already been submitted using this link.
                    </p>
                </div>
            </div>
        );
    }

    if (requestInfo.requestStatus === 'EXPIRED') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
                    <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Link Expired</h1>
                    <p className="text-slate-400">
                        This testimonial request has expired. Please contact {requestInfo.practitionerName} for a new link.
                    </p>
                </div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-slate-700">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
                    <p className="text-slate-400 mb-6">
                        Your testimonial has been submitted to {requestInfo.practitionerName}.
                    </p>
                    <a
                        href={`/p/${requestInfo.practitionerSlug}`}
                        className="text-purple-400 hover:text-purple-300 underline"
                    >
                        Visit {requestInfo.practitionerName}&apos;s profile
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <Quote className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Share Your Experience</h1>
                    <p className="text-slate-400">
                        {requestInfo.practitionerName} has requested a testimonial from you
                    </p>
                </div>

                {/* Practitioner Info */}
                <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700 flex items-center gap-4">
                    {requestInfo.practitionerThumbnail ? (
                        <Image
                            src={requestInfo.practitionerThumbnail}
                            alt={requestInfo.practitionerName}
                            width={64}
                            height={64}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-8 h-8 text-slate-500" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-semibold text-white">{requestInfo.practitionerName}</h2>
                        <a
                            href={`/p/${requestInfo.practitionerSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                            View Profile
                        </a>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {/* Rating */}
                    <div className="mb-6">
                        <Label className="text-white block mb-3">Your Rating *</Label>
                        <div className="flex items-center gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="p-1 transition-transform hover:scale-110"
                                    data-testid={`rating-star-${star}`}
                                >
                                    <Star
                                        className={cn(
                                            "w-10 h-10 transition-colors",
                                            (hoverRating || rating) >= star
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-slate-600"
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="mb-4">
                        <Label htmlFor="clientName" className="text-white">Your Name *</Label>
                        <Input
                            id="clientName"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Jane Smith"
                            required
                            className="mt-2 bg-slate-700 border-slate-600 text-white"
                            data-testid="testimonial-name-input"
                        />
                    </div>

                    {/* Relationship */}
                    <div className="mb-4">
                        <Label htmlFor="relationship" className="text-white">Your Relationship (optional)</Label>
                        <Input
                            id="relationship"
                            value={relationship}
                            onChange={(e) => setRelationship(e.target.value)}
                            placeholder="e.g. Client for 2 years, First-time client"
                            className="mt-2 bg-slate-700 border-slate-600 text-white"
                            data-testid="testimonial-relationship-input"
                        />
                    </div>

                    {/* Headline */}
                    <div className="mb-4">
                        <Label htmlFor="headline" className="text-white">Headline *</Label>
                        <Input
                            id="headline"
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            placeholder="A brief summary of your experience"
                            required
                            maxLength={100}
                            className="mt-2 bg-slate-700 border-slate-600 text-white"
                            data-testid="testimonial-headline-input"
                        />
                        <p className="text-xs text-slate-500 mt-1">{headline.length}/100 characters</p>
                    </div>

                    {/* Testimonial Text */}
                    <div className="mb-6">
                        <Label htmlFor="text" className="text-white">Your Testimonial *</Label>
                        <Textarea
                            id="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Share your experience working with this practitioner..."
                            required
                            rows={5}
                            className="mt-2 bg-slate-700 border-slate-600 text-white resize-none"
                            data-testid="testimonial-text-input"
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={submitMutation.isPending || rating === 0}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3"
                        data-testid="submit-testimonial-btn"
                    >
                        {submitMutation.isPending ? 'Submitting...' : 'Submit Testimonial'}
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Your testimonial will be visible on {requestInfo.practitionerName}&apos;s profile.
                </p>
            </div>
        </div>
    );
}

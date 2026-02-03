import useFormStatus from "@/components/utils/UseFormStatus"
import useEditPractitionerPinnedTestimonials, { UpdatePinnedTestimonialsFormSchema, PractitionerReview } from "./_hooks/UseEditPractitionerPinnedTestimonials"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Pin, Star, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type BLProps = {
    practitionerId: string
}

type Props = BLProps & {}

const useBL = ({ practitionerId }: BLProps) => {
    const status = useFormStatus();
    const { form, mutation, hasLoaded, reviews, currentPinnedIds } = useEditPractitionerPinnedTestimonials(practitionerId)

    const togglePinned = (reviewId: string) => {
        const current = form.getValues('pinnedReviewIds');
        const isCurrentlyPinned = current.includes(reviewId);

        if (isCurrentlyPinned) {
            // Remove from pinned
            form.setValue('pinnedReviewIds', current.filter(id => id !== reviewId), { shouldDirty: true });
        } else {
            // Add to pinned (max 3)
            if (current.length < 3) {
                form.setValue('pinnedReviewIds', [...current, reviewId], { shouldDirty: true });
            }
        }
    };

    return {
        form,
        status,
        hasLoaded,
        reviews,
        currentPinnedIds,
        togglePinned,
        finish: async (values: UpdatePinnedTestimonialsFormSchema) =>
            status.submit(
                mutation.mutateAsync,
                values,
                escape_key
            )
    }
}

const ReviewCard: React.FC<{
    review: PractitionerReview;
    isPinned: boolean;
    canPin: boolean;
    onToggle: () => void;
}> = ({ review, isPinned, canPin, onToggle }) => {
    return (
        <div
            className={cn(
                "relative p-4 rounded-lg border-2 transition-all cursor-pointer",
                isPinned
                    ? "border-purple-500 bg-purple-50"
                    : canPin
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            )}
            onClick={() => canPin || isPinned ? onToggle() : null}
            data-testid={`pinnable-review-${review.id}`}
        >
            {/* Pinned indicator */}
            {isPinned && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            "w-4 h-4",
                            star <= review.rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-slate-300"
                        )}
                    />
                ))}
            </div>

            {/* Headline */}
            {review.headline && (
                <h4 className="font-medium text-slate-800 text-sm mb-1">{review.headline}</h4>
            )}

            {/* Text preview */}
            <p className="text-slate-600 text-sm line-clamp-2">{review.text}</p>

            {/* Reviewer name */}
            <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    {review.userName || 'Anonymous'}
                </span>
                <span className="text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                </span>
            </div>
        </div>
    );
};

const EditPractitionerPinnedTestimonials: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    const pinnedCount = bl.currentPinnedIds.length;
    const canPinMore = pinnedCount < 3;

    return (
        <DialogContent
            className="w-[700px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
            data-testid="edit-practitioner-pinned-testimonials-dialog"
        >
            <DialogHeader>
                <div className="flex items-center space-x-2">
                    <Pin className="h-5 w-5 text-purple-500" />
                    <span>Pinned Reviews</span>
                </div>
            </DialogHeader>
            <DialogDescription>
                Select up to 3 reviews to highlight on your profile. Pinned reviews appear at the top of your reviews section.
            </DialogDescription>
            <Form {...bl.form}>
                <form className="mt-4" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                            {pinnedCount} of 3 reviews selected
                        </span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-3 h-3 rounded-full",
                                        i <= pinnedCount ? "bg-purple-500" : "bg-slate-200"
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {bl.reviews.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-lg">
                            <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500">No reviews yet</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Once clients leave reviews for your services or readings, you can pin them here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
                            {bl.reviews.map((review) => {
                                const isPinned = bl.currentPinnedIds.includes(review.id);
                                return (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        isPinned={isPinned}
                                        canPin={canPinMore}
                                        onToggle={() => bl.togglePinned(review.id)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            disabled={!bl.form.formState.isDirty}
                            data-testid="save-pinned-testimonials-btn"
                        >
                            {bl.status.formState === "idle" ? (
                                <>
                                    <Pin className="h-4 w-4 mr-2" />
                                    Save Selection
                                </>
                            ) : bl.status.button.title}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditPractitionerPinnedTestimonials

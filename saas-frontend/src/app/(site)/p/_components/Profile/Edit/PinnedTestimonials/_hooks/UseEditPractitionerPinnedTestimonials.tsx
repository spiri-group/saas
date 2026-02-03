import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql } from "@/lib/services/gql";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vendor_type } from "@/utils/spiriverse";

const PinnedTestimonialsFormSchema = z.object({
    id: z.string(),
    pinnedReviewIds: z.array(z.string()).max(3)
});

export type UpdatePinnedTestimonialsFormSchema = z.infer<typeof PinnedTestimonialsFormSchema>;

export type PractitionerReview = {
    id: string;
    rating: number;
    headline: string;
    text: string;
    createdAt: string;
    userName?: string;
};

const useEditPractitionerPinnedTestimonials = (practitionerId: string) => {
    const queryClient = useQueryClient();

    // Fetch current pinned review IDs
    const profileQuery = useQuery({
        queryKey: ['practitioner-pinned-reviews', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                vendor: vendor_type
            }>(`
                query get_practitioner_pinned_reviews($practitionerId: String!) {
                    vendor(id: $practitionerId) {
                        id
                        practitioner {
                            pinnedReviewIds
                        }
                    }
                }
            `, { practitionerId });
            return response.vendor;
        },
        enabled: !!practitionerId
    });

    // Fetch all reviews for this practitioner
    const reviewsQuery = useQuery({
        queryKey: ['practitioner-reviews-for-pinning', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                practitionerReviews: PractitionerReview[]
            }>(`
                query GetPractitionerReviewsForPinning($practitionerId: ID!) {
                    practitionerReviews(practitionerId: $practitionerId) {
                        id
                        rating
                        headline
                        text
                        createdAt
                        userName
                    }
                }
            `, { practitionerId });
            return response.practitionerReviews || [];
        },
        enabled: !!practitionerId
    });

    const form = useForm<UpdatePinnedTestimonialsFormSchema>({
        resolver: zodResolver(PinnedTestimonialsFormSchema),
        defaultValues: {
            id: practitionerId,
            pinnedReviewIds: []
        },
        values: profileQuery.data ? {
            id: practitionerId,
            pinnedReviewIds: profileQuery.data.practitioner?.pinnedReviewIds || []
        } : undefined
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdatePinnedTestimonialsFormSchema) => {
            const response = await gql<{
                update_practitioner_pinned_reviews: { practitioner: vendor_type };
            }>(`
                mutation update_practitioner_pinned_reviews($practitionerId: ID!, $pinnedReviewIds: [ID!]!) {
                    update_practitioner_pinned_reviews(practitionerId: $practitionerId, pinnedReviewIds: $pinnedReviewIds) {
                        code
                        success
                        message
                        practitioner {
                            id
                            practitioner {
                                pinnedReviewIds
                            }
                        }
                    }
                }
            `, {
                practitionerId: values.id,
                pinnedReviewIds: values.pinnedReviewIds
            });
            return response.update_practitioner_pinned_reviews.practitioner;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-pinned-reviews', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
        }
    });

    return {
        form,
        mutation,
        hasLoaded: !profileQuery.isLoading && !reviewsQuery.isLoading,
        reviews: reviewsQuery.data || [],
        currentPinnedIds: form.watch('pinnedReviewIds')
    };
};

export default useEditPractitionerPinnedTestimonials;

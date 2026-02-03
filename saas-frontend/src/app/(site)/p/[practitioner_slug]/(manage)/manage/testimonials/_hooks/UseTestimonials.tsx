import { gql } from "@/lib/services/gql";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Testimonial = {
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

export type TestimonialRequest = {
    id: string;
    practitionerId: string;
    token: string;
    clientEmail?: string;
    clientName?: string;
    requestStatus: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
    createdAt: string;
    expiresAt: string;
    submittedAt?: string;
};

// Fetch all testimonials for a practitioner
export const usePractitionerTestimonials = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-testimonials', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                practitionerTestimonials: Testimonial[]
            }>(`
                query GetPractitionerTestimonials($practitionerId: ID!) {
                    practitionerTestimonials(practitionerId: $practitionerId) {
                        id
                        practitionerId
                        clientName
                        clientEmail
                        rating
                        headline
                        text
                        relationship
                        createdAt
                    }
                }
            `, { practitionerId });
            return response.practitionerTestimonials || [];
        },
        enabled: !!practitionerId
    });
};

// Create a testimonial request
export const useCreateTestimonialRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { practitionerId: string; clientEmail?: string; clientName?: string }) => {
            const response = await gql<{
                create_testimonial_request: {
                    code: string;
                    success: boolean;
                    message: string;
                    request: TestimonialRequest;
                    submissionUrl: string;
                }
            }>(`
                mutation CreateTestimonialRequest($practitionerId: ID!, $clientEmail: String, $clientName: String) {
                    create_testimonial_request(practitionerId: $practitionerId, clientEmail: $clientEmail, clientName: $clientName) {
                        code
                        success
                        message
                        request {
                            id
                            practitionerId
                            token
                            clientEmail
                            clientName
                            requestStatus
                            createdAt
                            expiresAt
                        }
                        submissionUrl
                    }
                }
            `, input);

            if (!response.create_testimonial_request.success) {
                throw new Error(response.create_testimonial_request.message);
            }

            return response.create_testimonial_request;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-testimonials', variables.practitionerId] });
        }
    });
};

// Delete a testimonial
export const useDeleteTestimonial = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { practitionerId: string; testimonialId: string }) => {
            const response = await gql<{
                delete_testimonial: {
                    code: string;
                    success: boolean;
                    message: string;
                }
            }>(`
                mutation DeleteTestimonial($practitionerId: ID!, $testimonialId: ID!) {
                    delete_testimonial(practitionerId: $practitionerId, testimonialId: $testimonialId) {
                        code
                        success
                        message
                    }
                }
            `, input);

            if (!response.delete_testimonial.success) {
                throw new Error(response.delete_testimonial.message);
            }

            return response.delete_testimonial;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-testimonials', variables.practitionerId] });
        }
    });
};

// Update pinned testimonials
export const usePinTestimonials = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { practitionerId: string; pinnedTestimonialIds: string[] }) => {
            const response = await gql<{
                update_practitioner_pinned_testimonials: {
                    code: string;
                    success: boolean;
                    message: string;
                }
            }>(`
                mutation UpdatePinnedTestimonials($practitionerId: ID!, $pinnedTestimonialIds: [ID!]!) {
                    update_practitioner_pinned_testimonials(practitionerId: $practitionerId, pinnedTestimonialIds: $pinnedTestimonialIds) {
                        code
                        success
                        message
                    }
                }
            `, input);

            if (!response.update_practitioner_pinned_testimonials.success) {
                throw new Error(response.update_practitioner_pinned_testimonials.message);
            }

            return response.update_practitioner_pinned_testimonials;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-testimonials', variables.practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', variables.practitionerId] });
        }
    });
};

// Fetch testimonial request info by token (for public submission page)
export const useTestimonialRequestInfo = (token: string) => {
    return useQuery({
        queryKey: ['testimonial-request', token],
        queryFn: async () => {
            const response = await gql<{
                testimonialRequest: {
                    practitionerId: string;
                    practitionerName: string;
                    practitionerSlug: string;
                    practitionerThumbnail?: string;
                    clientName?: string;
                    requestStatus: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
                    expiresAt: string;
                }
            }>(`
                query GetTestimonialRequest($token: String!) {
                    testimonialRequest(token: $token) {
                        practitionerId
                        practitionerName
                        practitionerSlug
                        practitionerThumbnail
                        clientName
                        requestStatus
                        expiresAt
                    }
                }
            `, { token });
            return response.testimonialRequest;
        },
        enabled: !!token
    });
};

// Submit a testimonial (public)
export const useSubmitTestimonial = () => {
    return useMutation({
        mutationFn: async (input: { token: string; clientName: string; rating: number; headline: string; text: string; relationship?: string }) => {
            const response = await gql<{
                submit_testimonial: {
                    code: string;
                    success: boolean;
                    message: string;
                    testimonial: Testimonial;
                }
            }>(`
                mutation SubmitTestimonial($token: String!, $input: SubmitTestimonialInput!) {
                    submit_testimonial(token: $token, input: $input) {
                        code
                        success
                        message
                        testimonial {
                            id
                            practitionerId
                            clientName
                            rating
                            headline
                            text
                            relationship
                            createdAt
                        }
                    }
                }
            `, {
                token: input.token,
                input: {
                    clientName: input.clientName,
                    rating: input.rating,
                    headline: input.headline,
                    text: input.text,
                    relationship: input.relationship
                }
            });

            if (!response.submit_testimonial.success) {
                throw new Error(response.submit_testimonial.message);
            }

            return response.submit_testimonial;
        }
    });
};

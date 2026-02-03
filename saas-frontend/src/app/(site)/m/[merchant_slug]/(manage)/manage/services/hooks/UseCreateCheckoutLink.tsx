'use client';

import { gql } from "@/lib/services/gql";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type QuestionResponse = {
    questionId: string;
    question: string;
    answer: string;
};

type CreateCheckoutLinkInput = {
    vendorId: string;
    serviceId: string;
    customerEmail: string;
    questionnaireResponses?: QuestionResponse[];
    selectedAddOns?: string[];
    expiresInHours?: number;
};

const UseCreateCheckoutLink = () => {
    return useMutation({
        mutationFn: async (input: CreateCheckoutLinkInput) => {
            const response = await gql<{
                create_service_checkout_link: {
                    code: string;
                    success: boolean;
                    message: string;
                    checkoutUrl?: string;
                    orderId?: string;
                    expiresAt?: string;
                };
            }>(`
                mutation CreateServiceCheckoutLink($vendorId: ID!, $input: CreateCheckoutLinkInput!) {
                    create_service_checkout_link(vendorId: $vendorId, input: $input) {
                        code
                        success
                        message
                        checkoutUrl
                        orderId
                        expiresAt
                    }
                }
            `, {
                vendorId: input.vendorId,
                input: {
                    serviceId: input.serviceId,
                    customerEmail: input.customerEmail,
                    questionnaireResponses: input.questionnaireResponses || null,
                    selectedAddOns: input.selectedAddOns || null,
                    expiresInHours: input.expiresInHours || 24
                }
            });

            return response.create_service_checkout_link;
        },
        onSuccess: (data) => {
            if (data.success && data.checkoutUrl) {
                // Copy to clipboard
                navigator.clipboard.writeText(data.checkoutUrl);

                toast.success("Checkout link created", {
                    description: "Link copied to clipboard. Send it to your customer to complete payment."
                });
            }
        },
        onError: (error: Error) => {
            toast.error("Error", {
                description: error.message || "Failed to create checkout link"
            });
        }
    });
};

export default UseCreateCheckoutLink;

'use client';

import { gql } from "@/lib/services/gql";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type OrderLineInput = {
    id: string;
    merchantId?: string;
    forObject?: {
        id: string;
        partition: string[];
        container: string;
    };
    variantId?: string;
    descriptor: string;
    quantity: number;
    price: {
        amount: number;
        currency: string;
        quantity: number;
    };
};

type CreateOrderCheckoutLinkInput = {
    merchantId: string;
    customerEmail: string;
    lines: OrderLineInput[];
    target: string;
    expiresInHours?: number;
};

const UseCreateOrderCheckoutLink = () => {
    return useMutation({
        mutationFn: async (input: CreateOrderCheckoutLinkInput) => {
            const response = await gql<{
                create_order_checkout_link: {
                    code: string;
                    success: boolean;
                    message: string;
                    checkoutUrl?: string;
                    orderId?: string;
                    expiresAt?: string;
                };
            }>(`
                mutation CreateOrderCheckoutLink($merchantId: ID!, $input: CreateOrderCheckoutLinkInput!) {
                    create_order_checkout_link(merchantId: $merchantId, input: $input) {
                        code
                        success
                        message
                        checkoutUrl
                        orderId
                        expiresAt
                    }
                }
            `, {
                merchantId: input.merchantId,
                input: {
                    customerEmail: input.customerEmail,
                    lines: input.lines,
                    target: input.target,
                    expiresInHours: input.expiresInHours || 24
                }
            });

            return response.create_order_checkout_link;
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

export default UseCreateOrderCheckoutLink;
export type { CreateOrderCheckoutLinkInput, OrderLineInput };

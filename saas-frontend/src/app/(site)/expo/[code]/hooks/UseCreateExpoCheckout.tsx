'use client';

import { useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type CreateExpoCheckoutInput = {
    expoId: string;
    items: { itemId: string; quantity: number }[];
    customerName?: string;
    customerEmail?: string;
};

type CreateExpoCheckoutResponse = {
    code: string;
    success: boolean;
    message: string;
    sale: {
        id: string;
        saleNumber: number;
        items: { itemId: string; itemName: string; quantity: number; lineTotal: { amount: number; currency: string } }[];
        subtotal: { amount: number; currency: string };
        saleStatus: string;
    };
    clientSecret: string;
};

export const useCreateExpoCheckout = () => {
    return useMutation({
        mutationFn: async (input: CreateExpoCheckoutInput) => {
            const response = await gql<{
                createExpoCheckout: CreateExpoCheckoutResponse;
            }>(`
                mutation CreateExpoCheckout($input: CreateExpoCheckoutInput!) {
                    createExpoCheckout(input: $input) {
                        code
                        success
                        message
                        sale {
                            id
                            saleNumber
                            items {
                                itemId
                                itemName
                                quantity
                                lineTotal {
                                    amount
                                    currency
                                }
                            }
                            subtotal {
                                amount
                                currency
                            }
                            saleStatus
                        }
                        clientSecret
                    }
                }
            `, { input });
            return response.createExpoCheckout;
        },
    });
};

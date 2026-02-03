'use client';

import { useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface CreateCardSetupIntentResponse {
    success: boolean;
    message: string;
    clientSecret: string | null;
}

export const useCreateCardSetupIntent = () => {
    return useMutation({
        mutationFn: async (merchantId: string): Promise<CreateCardSetupIntentResponse> => {
            const response = await gql<{ create_card_setup_intent: CreateCardSetupIntentResponse }>(`
                mutation CreateCardSetupIntent($merchantId: ID!) {
                    create_card_setup_intent(merchantId: $merchantId) {
                        success
                        message
                        clientSecret
                    }
                }
            `, { merchantId });

            return response.create_card_setup_intent;
        },
        onError: (error) => {
            console.error('Create card setup intent error:', error);
        }
    });
};

export default useCreateCardSetupIntent;

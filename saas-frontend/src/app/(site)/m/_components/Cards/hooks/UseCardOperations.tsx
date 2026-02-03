'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { toast } from 'sonner';

interface AddCardInput {
    merchantId: string;
    paymentMethodId: string;
    name?: string;
    setAsDefault?: boolean;
}

interface DeleteCardInput {
    merchantId: string;
    cardId: string;
}

interface SetDefaultCardInput {
    merchantId: string;
    cardId: string;
}

interface CardOperationResponse {
    success: boolean;
    message: string;
    card?: {
        id: string;
        last4: string;
        brand: string;
        exp_month: number;
        exp_year: number;
        isDefault: boolean;
        name?: string;
    };
}

export const useAddCard = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (input: AddCardInput): Promise<CardOperationResponse> => {
            const response = await gql<{ addMerchantCard: CardOperationResponse }>(`
                mutation AddMerchantCard($input: AddCardInput!) {
                    addMerchantCard(input: $input) {
                        success
                        message
                        card {
                            id
                            last4
                            brand
                            exp_month
                            exp_year
                            isDefault
                            name
                        }
                    }
                }
            `, { input });
            
            return response.addMerchantCard;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({ 
                    queryKey: ['merchant-cards', variables.merchantId] 
                });
                toast.success('Card added successfully');
            } else {
                toast.error(data.message || 'Failed to add card');
            }
        },
        onError: (error) => {
            console.error('Add card error:', error);
            toast.error('Failed to add card. Please try again.');
        }
    });
};

export const useDeleteCard = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (input: DeleteCardInput): Promise<CardOperationResponse> => {
            const response = await gql<{ deleteMerchantCard: CardOperationResponse }>(`
                mutation DeleteMerchantCard($input: DeleteCardInput!) {
                    deleteMerchantCard(input: $input) {
                        success
                        message
                    }
                }
            `, { input });
            
            return response.deleteMerchantCard;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({ 
                    queryKey: ['merchant-cards', variables.merchantId] 
                });
                toast.success('Card deleted successfully');
            } else {
                toast.error(data.message || 'Failed to delete card');
            }
        },
        onError: (error) => {
            console.error('Delete card error:', error);
            toast.error('Failed to delete card. Please try again.');
        }
    });
};

export const useSetDefaultCard = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (input: SetDefaultCardInput): Promise<CardOperationResponse> => {
            const response = await gql<{ setDefaultMerchantCard: CardOperationResponse }>(`
                mutation SetDefaultMerchantCard($input: SetDefaultCardInput!) {
                    setDefaultMerchantCard(input: $input) {
                        success
                        message
                    }
                }
            `, { input });
            
            return response.setDefaultMerchantCard;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({ 
                    queryKey: ['merchant-cards', variables.merchantId] 
                });
                toast.success('Default card updated');
            } else {
                toast.error(data.message || 'Failed to set default card');
            }
        },
        onError: (error) => {
            console.error('Set default card error:', error);
            toast.error('Failed to set default card. Please try again.');
        }
    });
};
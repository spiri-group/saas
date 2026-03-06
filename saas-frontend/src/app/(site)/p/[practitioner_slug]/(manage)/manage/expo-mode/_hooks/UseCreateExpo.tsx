'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ExpoData } from './UseExpos';

type CreateExpoInput = {
    vendorId: string;
    expoName: string;
};

type CreateExpoResponse = {
    code: string;
    success: boolean;
    message: string;
    expo: ExpoData;
    shareUrl: string;
};

export const useCreateExpo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateExpoInput) => {
            const response = await gql<{
                createExpo: CreateExpoResponse;
            }>(`
                mutation CreateExpo($input: CreateExpoInput!) {
                    createExpo(input: $input) {
                        code
                        success
                        message
                        expo {
                            id
                            vendorId
                            code
                            expoName
                            expoStatus
                            totalSales
                            totalRevenue
                            totalItemsSold
                            totalCustomers
                            createdAt
                            goLiveAt
                            pausedAt
                            endedAt
                        }
                        shareUrl
                    }
                }
            `, { input });
            return response.createExpo;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['expos', data.expo.vendorId] });
        },
    });
};

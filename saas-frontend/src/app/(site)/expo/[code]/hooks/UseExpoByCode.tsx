'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type ExpoPublicData = {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorLogo: string | null;
    code: string;
    expoName: string;
    expoStatus: string;
};

export const useExpoByCode = (code: string) => {
    return useQuery({
        queryKey: ['expo-by-code', code],
        queryFn: async () => {
            const response = await gql<{
                expoByCode: ExpoPublicData | null;
            }>(`
                query ExpoByCode($code: String!) {
                    expoByCode(code: $code) {
                        id
                        vendorId
                        vendorName
                        vendorLogo
                        code
                        expoName
                        expoStatus
                    }
                }
            `, { code });
            return response.expoByCode;
        },
        enabled: !!code,
    });
};

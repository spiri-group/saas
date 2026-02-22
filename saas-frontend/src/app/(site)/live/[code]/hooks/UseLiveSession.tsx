'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type LiveSessionPublicData = {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorLogo: string | null;
    code: string;
    sessionTitle: string | null;
    sessionStatus: string;
    pricingMode: string;
    price: {
        amount: number;
        currency: string;
    };
    serviceName: string | null;
    queueCount: number;
};

export const useLiveSession = (code: string) => {
    return useQuery({
        queryKey: ['live-session-public', code],
        queryFn: async () => {
            const response = await gql<{
                liveSessionByCode: LiveSessionPublicData | null;
            }>(`
                query LiveSessionByCode($code: String!) {
                    liveSessionByCode(code: $code) {
                        id
                        vendorId
                        vendorName
                        vendorLogo
                        code
                        sessionTitle
                        sessionStatus
                        pricingMode
                        price {
                            amount
                            currency
                        }
                        serviceName
                        queueCount
                    }
                }
            `, { code });
            return response.liveSessionByCode;
        },
        enabled: !!code,
        retry: false,
    });
};

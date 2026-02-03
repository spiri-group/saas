'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface MerchantCard {
    id: string;
    paymentMethodId: string;
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
    funding: string;
    country?: string;
}

interface VendorResponse {
    vendor: {
        cards: MerchantCard[];
    };
}

const useMerchantCards = (merchantId: string) => {
    return useQuery({
        queryKey: ['merchant-cards', merchantId],
        queryFn: async (): Promise<MerchantCard[]> => {
            const response = await gql<VendorResponse>(`
                query GetVendorCards($id: String!) {
                    vendor(id: $id) {
                        cards {
                            id
                            paymentMethodId
                            last4
                            brand
                            exp_month
                            exp_year
                            funding
                            country
                        }
                    }
                }
            `, { id: merchantId });

            return response.vendor?.cards || [];
        },
        enabled: !!merchantId,
    });
};

export default useMerchantCards;
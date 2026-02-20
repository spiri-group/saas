'use client';

import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';

export type ExpoItemData = {
    id: string;
    expoId: string;
    vendorId: string;
    itemSource: string;
    serviceId: string | null;
    serviceName: string | null;
    itemName: string;
    itemDescription: string | null;
    itemImage: string | null;
    price: { amount: number; currency: string };
    trackInventory: boolean;
    quantityBrought: number | null;
    quantitySold: number;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
};

export const useExpoItems = (expoId: string) => {
    return useRealTimeQueryList<ExpoItemData>({
        queryKey: ['expo-items', expoId],
        queryFn: async () => {
            const response = await gql<{
                expoItems: ExpoItemData[];
            }>(`
                query ExpoItems($expoId: ID!) {
                    expoItems(expoId: $expoId) {
                        id
                        expoId
                        vendorId
                        itemSource
                        serviceId
                        serviceName
                        itemName
                        itemDescription
                        itemImage
                        price {
                            amount
                            currency
                        }
                        trackInventory
                        quantityBrought
                        quantitySold
                        sortOrder
                        isActive
                        createdAt
                    }
                }
            `, { expoId });
            return response.expoItems;
        },
        realtimeEvent: "expoItem",
        selectId: (item) => item.id,
        signalRGroup: `expo-${expoId}`,
        enabled: !!expoId,
    });
};

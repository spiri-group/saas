'use client';

import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';

export type ExpoPublicItemData = {
    id: string;
    itemName: string;
    itemDescription: string | null;
    itemImage: string | null;
    price: { amount: number; currency: string };
    trackInventory: boolean;
    quantityAvailable: number | null;
    sortOrder: number;
};

export const useExpoPublicItems = (expoId: string | undefined) => {
    return useRealTimeQueryList<ExpoPublicItemData>({
        queryKey: ['expo-public-items', expoId || ''],
        queryFn: async () => {
            if (!expoId) return [];
            const response = await gql<{
                expoPublicItems: ExpoPublicItemData[];
            }>(`
                query ExpoPublicItems($expoId: ID!) {
                    expoPublicItems(expoId: $expoId) {
                        id
                        itemName
                        itemDescription
                        itemImage
                        price {
                            amount
                            currency
                        }
                        trackInventory
                        quantityAvailable
                        sortOrder
                    }
                }
            `, { expoId });
            return response.expoPublicItems;
        },
        realtimeEvent: "expoItem",
        selectId: (item) => item.id,
        signalRGroup: expoId ? `expo-${expoId}` : undefined,
        enabled: !!expoId,
    });
};

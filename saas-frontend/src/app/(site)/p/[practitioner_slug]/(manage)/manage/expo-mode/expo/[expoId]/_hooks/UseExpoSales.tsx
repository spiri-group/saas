'use client';

import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';

export type ExpoSaleData = {
    id: string;
    expoId: string;
    vendorId: string;
    customerName: string | null;
    customerEmail: string | null;
    saleChannel: string;
    paymentMethod: string;
    items: {
        itemId: string;
        itemName: string;
        quantity: number;
        unitPrice: { amount: number; currency: string };
        lineTotal: { amount: number; currency: string };
    }[];
    subtotal: { amount: number; currency: string };
    saleStatus: string;
    saleNumber: number;
    createdAt: string;
    paidAt: string | null;
};

export const useExpoSales = (expoId: string) => {
    return useRealTimeQueryList<ExpoSaleData>({
        queryKey: ['expo-sales', expoId],
        queryFn: async () => {
            const response = await gql<{
                expoSales: ExpoSaleData[];
            }>(`
                query ExpoSales($expoId: ID!) {
                    expoSales(expoId: $expoId) {
                        id
                        expoId
                        vendorId
                        customerName
                        customerEmail
                        saleChannel
                        paymentMethod
                        items {
                            itemId
                            itemName
                            quantity
                            unitPrice {
                                amount
                                currency
                            }
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
                        saleNumber
                        createdAt
                        paidAt
                    }
                }
            `, { expoId });
            return response.expoSales;
        },
        realtimeEvent: "expoSale",
        selectId: (sale) => sale.id,
        signalRGroup: `expo-${expoId}`,
        enabled: !!expoId,
    });
};

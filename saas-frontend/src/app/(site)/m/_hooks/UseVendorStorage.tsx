import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

interface VendorStorageData {
    id: string;
    storage: {
        usedBytes: number;
    };
}

const useVendorStorage = (merchantId: string) => {
    return useQuery({
        queryKey: ['vendorStorage', merchantId],
        queryFn: async () => {
            const response = await gql<{
                vendor: VendorStorageData;
            }>(`
                query GetVendorStorage($vendorId: String!) {
                    vendor(id: $vendorId) {
                        id
                        storage {
                            usedBytes
                        }
                    }
                }
            `, {
                vendorId: merchantId
            });
            
            return response.vendor;
        },
        enabled: !!merchantId,
    });
};

export default useVendorStorage;
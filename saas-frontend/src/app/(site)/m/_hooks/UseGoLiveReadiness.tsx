import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type GoLiveReadiness = {
    isReady: boolean;
    hasPaymentCard: boolean;
    hasStripeOnboarding: boolean;
    missingRequirements: string[];
};

const useGoLiveReadiness = (merchantId: string) => {
    return useQuery({
        queryKey: ['go-live-readiness', merchantId],
        queryFn: async () => {
            const response = await gql<{
                vendor: {
                    isPublished: boolean;
                    goLiveReadiness: GoLiveReadiness;
                };
            }>(`
                query GetGoLiveReadiness($vendorId: String!) {
                    vendor(id: $vendorId) {
                        isPublished
                        goLiveReadiness {
                            isReady
                            hasPaymentCard
                            hasStripeOnboarding
                            missingRequirements
                        }
                    }
                }
            `, { vendorId: merchantId });
            return response.vendor;
        },
        enabled: !!merchantId && merchantId.length > 0,
    });
};

export default useGoLiveReadiness;

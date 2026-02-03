import { gql } from "@/lib/services/gql";

import { useQuery } from "@tanstack/react-query";

const key = 'details-for-service-for-merchant';

const queryFn = async (merchantId?: string, serviceId?: string) => {
    if (merchantId == null || serviceId == null) return null;

    const serviceQuery = await gql<any>(
        `query get_service($merchantId: ID!, $serviceId: ID!) {
                service(id: $serviceId, vendorId: $merchantId) {
                    id,
                    name,
                    description,
                    duration {
                        amount,
                        unit
                    }
                    availableUntil {
                        intoTheFuture {
                            amount,
                            unit   
                        }
                        range {
                            from
                            to
                        }
                        type
                    }
                }
            }
        `,
    {
        merchantId: merchantId,
        serviceId: serviceId
    })
    
    return serviceQuery.service;
}

const UseMerchantService = (merchantId?: string, serviceId?: string) => {
    return useQuery({
        queryKey: [key, merchantId, serviceId],
        queryFn: () => queryFn(merchantId, serviceId)
    });
}

export default UseMerchantService
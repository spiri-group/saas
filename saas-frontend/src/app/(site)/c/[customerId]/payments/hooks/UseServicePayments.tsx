import { gql } from "@/lib/services/gql";

import { servicePayment_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'servicePayment';

const queryFn = async () => {
    
    const resp = await gql<{
    servicePayments: servicePayment_type[]
    }>(`query service_payment {
            servicePayments {
                type,
                createdDate,
                service {
                    name
                }
                ref {
                    id
                    partition
                }
                stripe {
                    invoiceStatus
                    invoiceNumber
                    paymentIntentId
                    paymentIntentSecret
                    amountDue,
                    amountCharged,
                    totalDue,
                    totalRefunded,
                    totalPaid
                }
            }
        }`,
        {
            
        }
    )
    return resp.servicePayments
}

const UseServicePayment = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseServicePayment
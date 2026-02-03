import { gql } from "@/lib/services/gql";

import { casePayment_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'casePayments';

const queryFn = async () => {
    
    const resp = await gql<{
    casePayments: casePayment_type[]
    }>(`query case_payments {
            casePayments{
                type
                createdDate
                case {
                    formattedAddress
                }   
                merchant {
                    name
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
    return resp.casePayments
}

const UseCasePayment = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseCasePayment
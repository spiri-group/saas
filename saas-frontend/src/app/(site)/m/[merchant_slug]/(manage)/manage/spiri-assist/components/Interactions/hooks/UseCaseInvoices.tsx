import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'invoices-for-case'

const queryFn = async (caseId: string, outstanding: boolean = false) => {

    const resp = await gql<{
        case: {
            invoices: order_type[]
        }
    }>( 
        `query get_case_invoices($caseId: String!, $outstanding: Boolean ) {
            case(caseId:$caseId) {
                id,
                invoices(outstanding: $outstanding) {
                    id
                    customerEmail
                    no
                    lines {
                        price {
                            amount
                            currency
                        }
                        quantity
                        target
                        description
                        merchantId
                    }
                    balanceDue {
                        subtotal {
                            amount
                            currency
                        }
                        fees {
                            amount
                            currency
                        }
                        total {
                            amount
                            currency
                        }
                        discount {
                            amount
                            currency 
                        }
                    }
                    discount {
                        amount
                        currency 
                    }
                    stripe {
                        accountId
                        setupIntentId
                        setupIntentSecret
                    }
                    paid_status
                }
                stripe {
                    accountId
                    setupIntentId
                    setupIntentSecret
                }
            }
        }`,
        { 
            caseId,
            outstanding 
        }
    )
    return resp.case.invoices
}    

const UseCaseInvoices = (caseId: string, outstanding?: boolean) => {
    return useQuery({
        queryKey: [key, caseId, outstanding],
        queryFn: () => queryFn(caseId, outstanding)
    });
}

export default UseCaseInvoices
import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'order';

const queryFn = async (id: string, customerEmail: string) => {

    const resp = await gql<{
        order: order_type
    }>(  
        `query get_order($id: ID!, $customerEmail: String!) {
            order(id: $id, customerEmail: $customerEmail) {
                id,
                customerEmail,
                ref {
                    id
                    partition
                    container
                }
                customer {
                    name
                }
                code,
                forObject {
                    id
                    partition
                    container
                },
                lines {
                    id
                    price {
                        amount
                        currency
                    }
                    quantity
                    subtotal {
                        amount
                        currency
                    }
                    tax {
                        amount
                        currency
                    }
                    refunded {
                        amount
                        currency
                    }
                    descriptor
                    merchantId
                }
                paymentSummary {
                    currency
                    charged {
                        paid
                        fees
                        tax
                    }
                    payout {
                        fees
                        tax
                        subtotal
                        recieves
                        refunded
                    }
                }
                createdDate
            }
        }
        `,
        {
            id,
            customerEmail
        }
    )
    return resp.order;
}

const UseOrder = (id: string, customerEmail: string) => {
    return useQuery({
        queryKey: [key, id, customerEmail],
        queryFn: () => queryFn(id, customerEmail)
    });
}

export default UseOrder
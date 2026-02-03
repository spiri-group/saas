import { gql } from "@/lib/services/gql";
import { order_type, recordref_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'orders'

export const query_fields = `
    id,
    createdDate
    customerEmail
    code
    forObject {
        id
        partition
        container
    }
    ref {
        id
        partition
        container
    }
    lines {
        id
        forObject {
            id
            partition
            container
        }
        variantId
        image {
            url
        }
        price_log {
            price {
                amount
                currency
            }
        }
        price {
            amount
            currency
        }
        quantity
        descriptor
        merchantId
    }
    stripe {
        accountId
        setupIntentId
        setupIntentSecret
    }
    paid_status
`

const queryFn = async (customerEmail?: string, customerId?:string, forObject?: recordref_type, merchantId?: string) => {
    const resp = await gql<{
        orders: order_type[]
    }>(`query get_orders($customerEmail: String, $customerId: String, $forObject: RecordRefInput, $merchantId: ID) {
            orders(customerEmail: $customerEmail, customerId: $customerId, forObject: $forObject, vendorId: $merchantId) {
                ${query_fields}
            }
        }`,
        {
            customerId,
            customerEmail,
            forObject,
            merchantId
        }
    )
    return resp.orders
}

const UseOrders = (customerEmail?: string, customerId?: string, forObject?: recordref_type, merchantId?: string) => {
    return useQuery({
        queryKey: [key, customerEmail, customerId, forObject, merchantId],
        queryFn: () => queryFn(customerEmail, customerId, forObject, merchantId)
    })
}

export default UseOrders
import { gql } from "@/lib/services/gql"
import { product_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

const key = "subscription-plans-for-merchant"

const queryFn = async (currency: string) => {
    const resp = await gql<{
        products: product_type[]
    }>(`
            query get_products($currency: String!) {
                products(vendor: "SpiriGroup", family: "Vendor_Plan", currency: $currency) {
                    name, 
                    id,
                    description
                    defaultVariant {
                        id
                        name
                        defaultPrice {
                            id
                            amount
                            currency
                            recurring {
                                interval
                                interval_count
                            }
                        }
                        otherPrices {
                            id
                            amount
                            currency
                            recurring {
                                interval
                                interval_count
                            }
                        }
                    }
                }
            }
        `, {
            currency
        }
    )
    return resp.products
}

const UseMerchantSubscriptionPlans = (currency: string) => {
    return useQuery({
        queryKey: [key, currency],
        queryFn: () => queryFn(currency)
    })
}

export default UseMerchantSubscriptionPlans
import { gql } from "@/lib/services/gql"
import { product_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

const key = "case-urgency-fees"

const queryFn = async (currency: string) => {
    const resp = await gql<{
        products: product_type[]
    }>(`
            query get_products($currency: String!) {
                products(vendor: "SpiriGroup", family: "Case_Urgency_Fee", currency: $currency) {
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
                        }
                        otherPrices {
                            id
                            amount
                            currency
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

const UseCaseUrgencyFeeOptions = (currency: string) => {
    return useQuery({
        queryKey: [key, currency],
        queryFn: () => queryFn(currency)
    })
}

export default UseCaseUrgencyFeeOptions
'use client'; 

import { gql } from "@/lib/services/gql";
import { product_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "details-for-product";

export const queryFn = async (merchantId: string, productId: string) => {

    const resp = await gql<{
        product: product_type
    }>(
        `query get_product($id: String!, $vendorId: String!){
            product(id: $id, vendorId: $vendorId) {
                id,
                name,
                slug,
                productType,
                typeData {
                    crystal {
                        crystalRefId
                        crystalRef {
                            id
                            name
                            description
                            chakras
                            elements
                            zodiacSigns
                            thumbnail
                        }
                        crystalForm
                        crystalGrade
                        crystalLocality
                        crystalColor
                    }
                }
                vendor {
                    id
                    name
                    slug
                }
                ref {
                    id
                    partition
                    container
                }
                variants {
                    id
                    name
                    code
                    description
                    dimensions {
                        height
                        width
                        depth
                        uom
                    }
                    weight {
                        amount
                        uom
                    }
                    images {
                        url
                        title
                    }
                    defaultPrice {
                        amount
                        currency
                    }
                }
            }
        }`,
        {
            id: productId,
            vendorId: merchantId
        }
    )
    return resp.product;
}

const UseProductDetails = (merchantId: string, productId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, productId],
        queryFn: () => queryFn(merchantId, productId)
    });
}

export default UseProductDetails;
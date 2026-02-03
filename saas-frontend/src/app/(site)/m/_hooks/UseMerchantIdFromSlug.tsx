import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export const merchantIdFromSlug = async (merchant_slug: string, requiresEncoding?: boolean) => {
    const resp = await gql<{
        vendorIdFromSlug: {
            merchantId: string;
            slug: string;
            available: boolean;
        }
    }>( `query get_vendorFromSlug($slug: String!, $requiresEncoding: Boolean) {
            vendorIdFromSlug(slug: $slug, requiresEncoding: $requiresEncoding) {
                merchantId
                slug
                available
            }
        }`,
        {
            slug: merchant_slug,
            requiresEncoding: requiresEncoding
        }
    )
    return resp.vendorIdFromSlug;
}

const UseMerchantIdFromSlug = (merchant_slug: string, requiresEncoding?: boolean) => {
    return useQuery({
        queryKey: ["merchant", merchant_slug, requiresEncoding],
        queryFn: () => merchantIdFromSlug(merchant_slug, requiresEncoding)
    });
}

export default UseMerchantIdFromSlug
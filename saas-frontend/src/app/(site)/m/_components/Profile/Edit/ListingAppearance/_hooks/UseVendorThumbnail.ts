import { gql } from "@/lib/services/gql";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const key = 'thumbnail-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                name
                ref {
                    id
                    partition
                    container
                }
                thumbnail {
                    image {
                        media {
                            name
                            url
                            urlRelative
                            size
                            type
                        }
                        zoom
                    }
                    title {
                        content
                        panel {
                            bgColor
                            textColor
                            bgOpacity
                        }
                    }
                    bgColor
                }
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )

    return resp.vendor;
}

const UseVendorThumbnail = (merchantId: string) => {
    const queryClient = useQueryClient();
    const queryKey = [key, merchantId]
    return {
        query: useQuery({
            queryKey: queryKey,
            queryFn: () => queryFn(merchantId),
            enabled: !!merchantId && merchantId.length > 0
        }),
        upsert: (thumbnail: ThumbnailSchema) => {
            queryClient.setQueryData(queryKey, (oldData: any) => {
                return {
                    ...oldData,
                    thumbnail
                }
            })
        },
        key: queryKey
    }
}

export default UseVendorThumbnail
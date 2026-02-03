import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { product_type } from '@/utils/spiriverse';

export const useProduct = (merchantId: string, productId?: string) => {
  return useQuery({
    queryKey: ['product', merchantId, productId],
    queryFn: async () => {
      const response = await gql<{
        listing: product_type;
      }>(`
        query GetProduct($id: String!, $vendorId: String!) {
          listing(id: $id, vendorId: $vendorId) {
            id
            name
            category
            description
            soldFromLocationId
            refundPolicyId
            noRefunds
            thumbnail {
              image {
                media {
                  url
                  urlRelative
                  name
                  code
                  size
                  type
                  sizeBytes
                }
                zoom
                objectFit
              }
              dynamicMode {
                type
                video {
                  media {
                    url
                    urlRelative
                    name
                    code
                    size
                    type
                    sizeBytes
                    durationSeconds
                  }
                  autoplay
                  muted
                }
                collage {
                  images {
                    url
                    urlRelative
                    name
                    code
                    size
                    type
                    sizeBytes
                  }
                  transitionDuration
                  crossFade
                }
              }
              panelTone
              bgColor
              stamp {
                text
                enabled
                bgColor
                textColor
              }
              title {
                content
              }
              moreInfo {
                content
              }
            }
            properties
            pricingStrategy
            variants {
              id
              isDefault
              name
              code
              description
              countryOfOrigin
              countryOfManufacture
              harmonizedTarrifCode {
                hsCode
                formattedHsCode
                description
              }
              requireReturnShipping
              properties {
                key
                value
                enabled
                sortOrder
              }
              tone
              defaultPrice {
                amount
                currency
              }
              landedCost {
                amount
                currency
              }
              otherPrices {
                amount
                currency
              }
              images {
                name
                url
                urlRelative
                code
                size
                type
                sizeBytes
              }
              qty_soh
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
            }
            refundRules {
              allowAutoReturns
              maxShippingCost {
                amount
                currency
              }
              productCost {
                amount
                currency
              }
              refundWithoutReturn
              useDefaultAddress
              customAddress {
                street
                city
                state
                postcode
                country
              }
              requirePhoto
              refundTiming
            }
          }
        }
      `, {
        id: productId!,
        vendorId: merchantId
      });

      return response.listing;
    },
    enabled: !!productId && !!merchantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'vendorInformation';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                    id,
                    name,
                    website,
                    intro,
                    address,
                    isPublished,
                    hasRole(role: "ADMIN")
                    contact {
                        public {
                            email
                            phoneNumber {
                                displayAs
                                value
                            }
                        }
                        internal {
                            email
                            phoneNumber {
                                displayAs
                                value
                            }
                        }
                    },
                    onStart,
                    logo {
                        name
                        url
                        urlRelative
                        size
                        type
                    }
                    banner {
                        name
                        url
                        urlRelative
                        size
                        type
                    }
                    videos {
                        media {
                            name
                            url
                            urlRelative
                            size
                            type
                            description
                        }
                        coverPhoto {
                            name
                            url
                            urlRelative
                            size
                            type
                        }
                    }
                    videoSettings {
                        autoplay
                        autoplayDelay
                    }
                    descriptions {
                        id
                        title,
                        body
                        supporting_images {
                            title
                            url
                        }
                    }
                    social {
                       style
                       platforms {
                            id
                            url
                            platform
                            handle
                       }
                    }
                    locations {
                        id
                        title
                        address {
                            formattedAddress
                            point {
                                type
                                coordinates {
                                    lat
                                    lng
                                }
                            }
                        }
                        services
                    }
                    bannerConfig {
                        backgroundType
                        backgroundColor
                        gradientStart
                        gradientEnd
                        gradientDirection
                        backgroundImage {
                            name
                            url
                            urlRelative
                            size
                            type
                        }
                        promiseText
                        textColor
                        textAlignment
                        textSize
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

const UseVendorInformation = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorInformation
import { gql } from "@/lib/services/gql";
import { textFormat_type, vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'branding-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                mode
                selectedTheme
                selectedScheme
                logo {
                    name
                    url
                    urlRelative
                    size
                    type
                    title
                    description
                    hashtags
                }
                font {
                    brand {
                        family
                        color
                    }
                    headings {
                        family
                        color
                    }
                    default {
                        family
                        color
                    }
                    accent {
                        family
                        color
                    }
                }
                colors {
                    primary {
                        background
                        foreground
                    },
                    links
                }
                background {
                    color
                    image {
                        name
                        url
                        urlRelative
                        size
                        type
                        title
                        description
                        hashtags
                    }
                }
                panels {
                    background {
                        color
                        transparency
                    }
                    primary {
                        family
                        color
                    }
                    accent {
                        family
                        color
                    }
                }
                social {
                    style
                }
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )

    // we need to set some defaults but we don't want to return a new reference
    // so we'll just set them here
    const vendor = resp.vendor
    vendor.font = vendor.font || {
        brand: { family: "clean", color:"#000000" } as textFormat_type,
        headings: { family: "clean", color: "#000000" } as textFormat_type,
        default: { family: "clean", color: "#000000" } as textFormat_type,
        accent: { family: "clean", color: "#000000" } as textFormat_type
    }
    vendor.colors = vendor.colors || {
        primary: {
            background: "#439bcc",
            foreground: "#FFFFFF"
        },
        links: "#439bcc"
    }
    vendor.background = vendor.background || {
        color: "#EEEEEE"
    }
    vendor.panels = vendor.panels || {
        background: {
            color: "#FFFFFF",
            transparency: 1
        },
        primary: {
            family: "clean",
            color: "#000000"
        } as textFormat_type,
        accent: {
            family: "clean",
            color: "#000000"
        } as textFormat_type
    }
    vendor.social = vendor.social || {
        style: 'solid'
    }

    return resp
}

const UseVendorBranding = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorBranding
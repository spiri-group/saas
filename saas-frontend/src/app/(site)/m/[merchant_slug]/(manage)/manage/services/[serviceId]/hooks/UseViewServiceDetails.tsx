'use client'; 

import { gql } from "@/lib/services/gql";
import { service_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "details-for-service";

export const queryFn = async (merchantId: string, serviceId: string) => {

    const resp = await gql<{
        service: service_type
    }>( `query get_service($id: ID!, $vendorId: ID!){
            service(id: $id, vendorId: $vendorId) {
                id,
                name,
                description,
                terms,
                faq {
                    id
                    title
                    description
                },
                thumbnail {
                    image {
                        url,
                        size
                    }
                    title {
                        content
                        format {
                            font,
                            size,
                            color,
                            backgroundColor,
                            bold,
                            italic,
                            alignment,
                            decoration,
                            case,
                            margin {
                                top,
                                bottom,
                                left,
                                right
                            },
                            padding {
                                top,
                                bottom,
                                left,
                                right
                            },
                            withQuotes,
                            borderRadius {
                                topLeft,
                                topRight,
                                bottomLeft,
                                bottomRight
                            }     
                        }
                    }
                  }
            }
        }`,
        { 
            id: serviceId,
            vendorId: merchantId
        }
    )    
    return resp.service;
}

const UseViewServiceDetails = (merchantId: string, serviceId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, serviceId ],
        queryFn: () => queryFn(merchantId, serviceId)
    });
}

export default UseViewServiceDetails;
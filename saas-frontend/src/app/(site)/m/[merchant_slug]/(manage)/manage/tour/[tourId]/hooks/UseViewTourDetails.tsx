'use client'; 

import { gql } from "@/lib/services/gql";

import { tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "details-for-tour";

export const queryFn = async (merchantId: string, tourId: string) => {

    const resp = await gql<{
        tour: tour_type
    }>(
        `query get_tour($id: ID!, $vendorId: ID!){
            tour(id: $id, vendorId: $vendorId) {
                id,
                name,
                terms,
                faq {
                    id
                    title
                    description
                }
                country,
                description,
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
                  ticketVariants {
                      id
                      name
                      description
                      price {
                          amount
                          currency
                      }
                      peopleCount
                      inventory {
                          qty_on_hand
                          qty_committed
                          qty_available
                          track_inventory
                          low_stock_threshold
                          allow_backorder
                          max_backorders
                      }
                  }
            }
        }`,
        { 
            id: tourId,
            vendorId: merchantId
        }
    )    
    return resp.tour;
}

const UseViewTourDetails = (merchantId: string, tourId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, tourId],
        queryFn: () => queryFn(merchantId, tourId)
    });
}

export default UseViewTourDetails;
'use client';

import { gql } from "@/lib/services/gql"
import { useQuery } from "@tanstack/react-query"

const key = 'deliveryInstructions';

const queryFn = async (userId: string, addressId: string) => {
    const resp = await gql<{
        userAddress: {
            deliveryInstructions: any
        }
    }>(`query get_deliveryInstructions($userId: ID!, $addressId: ID!) {
            userAddress(userId: $userId, addressId: $addressId) {
                address {
                    deliveryInstructions {
                        propertyType
                        dropOffPackage
                        onFederalHolidays
                        openSaturday
                        openSunday
                        haveDog
                        securityCode
                        callBox
                        details
                    }
                }
            }
        }`, 
        {
            userId: userId,
            addressId: addressId
        }
    )
    return resp.userAddress.deliveryInstructions
}

const UseDeliveryInstructions = (userId: string, addressId: string) => {
    return useQuery({
        queryKey: [key, userId, addressId],
        queryFn: () => queryFn(userId, addressId)
    })
}

export default UseDeliveryInstructions;
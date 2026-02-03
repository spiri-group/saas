'use client';

import { gql } from "@/lib/services/gql"
import { user_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query"

const key = 'user-profile';

const queryFn = async (userId: string) => {
    const resp = await gql<{
        user: user_type
    }>( `query get_user($id: String, $email: String) {
            user(id: $id, email: $email) {
                id,
                firstname,
                lastname,
                email,
                phoneNumber {
                    raw
                    displayAs
                    value
                },
                religion {
                    id
                    name
                },
                openToOtherExperiences,
                requiresInput,
                primarySpiritualInterest,
                secondarySpiritualInterests,
                securityQuestions {
                    id
                    question
                    answer
                }
                addresses { 
                    id
                    isDefault
                    firstname
                    lastname
                        phoneNumber {
                        raw
                        displayAs
                        value
                    },
                    address {
                        id,
                        formattedAddress,
                        point {
                            type,
                            coordinates {
                                lat
                                lng
                            }
                        }
                    }
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
          }
        `,
        {
            id: userId
        }
    )
    return resp.user
}

const UseUserProfile = (userId: string) => {
    return useQuery({
        queryKey: [key, userId],
        queryFn: () => queryFn(userId),
        enabled: !!userId && userId.length > 0
    })
}

export default UseUserProfile;
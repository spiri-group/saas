import { isNullOrWhitespace } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { user_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'addresses-for-user';

const queryFn = async (userId: string) => {
    if (isNullOrWhitespace(userId)) {
        return [];
    }

    const resp = await gql<{
        user: user_type
    }>( `query get_user_addresses($userId: String!) {
              user(id:$userId)  {
                id
                addresses {
                    id
                    isDefault
                    address {
                        formattedAddress
                        components {
                            city
                            country
                            line1
                            line2
                            postal_code
                            state
                        }
                    }
                }
              }
          }
        `,
        {
            userId
        }
    )

    return resp.user.addresses;
}

const UseUserAddresses = (userId: string) => {
    return useQuery({
        queryKey: [key, userId],
        queryFn: () => queryFn(userId),
        enabled: !!userId && userId.length > 0
    });
}

export default UseUserAddresses
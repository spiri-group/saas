import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'vendors';

const queryFn = async (search: string) => {
    const resp = await gql<{
        vendors: vendor_type[]
    }>( `query get_vendors($search: String!) {
              vendors(search:$search)  {
                id
                name
                slug
              }
          }
        `,
        {
            search
        }
    )

    return resp.vendors;
}

const UseVendors = (search: string) => {
    return useQuery({
        queryKey: [key, search],
        queryFn: () => queryFn(search)
    });
}

export default UseVendors
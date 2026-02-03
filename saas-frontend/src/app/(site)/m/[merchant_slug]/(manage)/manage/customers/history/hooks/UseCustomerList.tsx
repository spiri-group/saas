import { gql } from "@/lib/services/gql";
import { customer_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
 
const key = "get-customers-by-merchant";

const queryFn = async (merchantId: string) => {

    const resp = await gql<{
        vendor: {
            customers: customer_type[]
        }
    }>( `query get_customers_by_merchant($vendorId:String!) {
            vendor(id:$vendorId) {
                customers {
                    id
                    firstname
                    email
                    ref {
                        id,
                        partition,
                        container
                    }
                }
            }
        }
        `,
        {
          vendorId: merchantId
        }
    )
  
    return resp.vendor.customers;
}
  

const UseCustomerLists = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId)
    });
}

export default UseCustomerLists;
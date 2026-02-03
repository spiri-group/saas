import { isNullOrUndefined } from "@/lib/functions"
import { gql } from "@/lib/services/gql"
import { order_type } from "@/utils/spiriverse"
import { useEffect, useState } from "react"
import { InvoiceUI } from "./render"

type BLProps = {
    customerEmail: string
    orderId: string
}

type Props = BLProps & {

}

export const tax_invoice_query = async (props: BLProps) => {
    return await gql<{
        order: order_type
    }>(
        `query tax_invoice($customerEmail: String!, $orderId: ID!) {
            order(id: $orderId, customerEmail: $customerEmail) {
                code
                createdDate
                delivery {
                    name
                    address
                    addressComponents {
                        line1
                        line2
                        postal_code
                        state
                        city
                    }
                }
                billing {
                    name
                    addressComponents {
                        line1
                        line2
                        postal_code
                        state
                        city
                    }
                }
                lines {
                    id
                    merchant {
                        name
                    }
                    soldFrom {
                        state
                        country    
                    }
                    item_description
                    quantity
                    price {
                        amount
                        currency 
                    }
                    total {
                        amount
                        currency
                    }
                }
                payments {
                    code
                    method_description
                    date
                    currency
                    charge {
                        paid
                    }
                }
                paymentSummary {
                    currency
                    charged {
                        subtotal,
                        fees,
                        tax,
                        paid
                    }
                }
            }
        }`,
        {
            customerEmail: props.customerEmail,
            orderId: props.orderId
        }
    )
}

const useBL = (props: BLProps) => {
    const [order, setOrder] = useState<order_type | null>(null);

    useEffect(() => {
        tax_invoice_query(props).then((data) => {
            setOrder(data.order);
        })
    }, [props.customerEmail, props.orderId])

    return {
        ready: !isNullOrUndefined(order),
        order
    }
}

const TaxInvoicePDF = (props: Props) => {
    const { ready, order } = useBL(props);

    if (!ready) {
        return <div>Loading...</div>
    }

    return <InvoiceUI order={order as order_type} />
}

export default TaxInvoicePDF;
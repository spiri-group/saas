import { Button } from "../ui/button"
import { gql } from "@/lib/services/gql"
import { useMutation } from "@tanstack/react-query"

import { stripe_invoice_type } from "@/utils/spiriverse"

type BLProps = {
    invoiceId: string,
    onComplete: (status: stripe_invoice_type) => void
}

const useBL = (props: BLProps) => {

    const mutation = useMutation({
        mutationFn: async (invoiceId: string) => {
          const resp = await gql<{
            mark_invoice_void: {
                code: string,
                invoice: stripe_invoice_type
            }
        }>(
            `mutation mark_invoice_void($invoiceId: String!) {
                mark_invoice_void(id: $invoiceId) {
                        code
                        invoice {
                            id, 
                            status
                        }
                    }   
                }
            `, 
            {
                invoiceId
            })
  
          return resp.mark_invoice_void.invoice
        },
        onSuccess: async (data : stripe_invoice_type) => {
            props.onComplete({
                ...data
            })
        }
    })

    return {
        submit: async () => {
            await mutation.mutateAsync(props.invoiceId)
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        }
    }
}

type Props = BLProps & {
    
}

const MarkVoidButton : React.FC<Props> = (props) => {
    const bl =  useBL(props);

    return (
        <>
            <Button variant="ghost" type="button" onClick={bl.submit}> Cancel Request </Button>
        </>
    )
}

export default MarkVoidButton;
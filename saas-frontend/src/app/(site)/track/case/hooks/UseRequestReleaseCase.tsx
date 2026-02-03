import { gql } from "@/lib/services/gql";
import { case_type, caseOffer_type, recordref_type } from "@/utils/spiriverse";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import useRealTimeObjectState from "@/components/utils/useRealTimeObjectState";

const required_attributes = `
    id
    merchantId
    caseId
    case {
        id
        code
    }
    code
    type
    clientRequested
    merchantResponded
    ref {
        id
        partition
        container
    }
    order {
        id,
        lines {
            id,
            price {
                amount
                currency
            }
        }
        balanceDue {
            subtotal {
                amount
                currency
            }
            fees {
                amount
                currency
            }
            total {
                amount
                currency
            }
            discount {
                amount
                currency 
            }
        }
    }
    description,
    stripe {
        setupIntentId
        setupIntentSecret
    }
`

const UseRequestReleaseCase = (caseId?: string, caseOffer?: caseOffer_type) => {
    const queryClient = useQueryClient()

    const request = useRealTimeObjectState<caseOffer_type>({
        typeName: "caseOffer",
        initialData: caseOffer as any,
        getRecord: async () => {
            const resp = await gql<{ caseOffer: caseOffer_type }>(
                `query get_caseOffer($ref: RecordRefInput!) {
                    caseOffer(ref: $ref) {
                        ${required_attributes}
                    }
                }`,
                {
                    ref: caseOffer?.ref
                }
            )
            return resp.caseOffer
        },
        group: `caseOffer-${caseId}`
    })

    const mutation = useMutation({
        mutationFn: async (ref: recordref_type) => {
            const resp = await gql<{ 
                request_release_case: { offer: caseOffer_type } 
            }>(
                `mutation request_release_case($ref: RecordRefInput!) {
                    request_release_case(ref: $ref) {
                        offer {
                            ${required_attributes}
                        }
                    }
                }`,
                {
                    ref
                }
            )
            return resp.request_release_case.offer
        },
        onSuccess: async (data: caseOffer_type) => {
            queryClient.setQueryData(["details-for-case", caseId], (old: case_type) => {
                const tmp = { ...old }
                tmp.releaseOffer = data
                if (!caseOffer) {
                    (tmp.releaseOffer as any).showDialog = true
                }
                return tmp
            })
        }
    })

    return {
        request,
        mutation,
    }
}

export default UseRequestReleaseCase
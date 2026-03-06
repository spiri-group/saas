import { gql } from "@/lib/services/gql";
import { case_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'details-for-case';

export const required_attributes = `
    id,
    release_status
`

const queryFn = async (caseId: string, trackingCode?: string) => {
    if (caseId == null && trackingCode == null) return null;

    const resp = await gql<{
        case: case_type
    }>( `query get_caseDetail($caseId: String, $trackingCode: ID)  {
            case(caseId: $caseId, trackingCode: $trackingCode) {
                id
                caseStatus
                code
                trackingCode
                balance {
                    amount
                    currency
                }
                ref {
                    id
                    partition
                    container
                }
                contact {
                    name
                    email
                    phoneNumber {
                        value
                        raw
                        displayAs
                    }
                }
                category {
                    id
                    defaultLabel
                }
                religion {
                    id
                    defaultLabel
                }
                affectedPeople {
                    id
                    name
                    evidence {
                        url
                        urlRelative
                    }
                }
                affectedAreas {
                    id
                    name
                    evidence {
                        url
                        urlRelative
                    }
                }
                location {
                    id
                    formattedAddress
                    point {
                        type
                        coordinates {
                            lat
                            lng
                        }
                    }
                }
                merchants {
                    id
                    name
                }
                description
                startedFrom {
                    descriptor
                    amount
                    unit {
                        id
                        defaultLabel
                    }
                }
                release_status
                releaseOffer {
                    id
                    merchantId
                    caseId
                    type
                    merchant { 
                        name
                    }
                    description
                    code
                    clientRequested
                    merchantResponded
                    order {
                        id
                        lines {
                            id
                            price {
                                amount
                                currency
                            }
                        }
                    }
                    ref {
                        id
                        partition
                        container
                    }
                    stripe {
                        setupIntentId
                        setupIntentSecret
                    }
                }
                closeOffer {
                    id
                    merchantId
                    caseId
                    type
                    merchant {
                        name
                    }
                    description
                    code
                    order {
                        id
                        lines {
                            id
                            price {
                                amount
                                currency
                            }
                        }
                    }
                    ref {
                        id
                        partition
                        container
                    }
                    stripe {
                        setupIntentId
                        setupIntentSecret
                    }
                }
            }
        }
        `,
        {
            caseId: caseId || undefined,
            trackingCode: trackingCode || undefined
        }
    )
    return resp.case;
}

const UseCaseDetails = (caseId: string, trackingCode?: string) => {
    return useQuery({
        queryKey: [key, caseId || trackingCode],
        queryFn: () => queryFn(caseId, trackingCode)
    });
}

export default UseCaseDetails
import { gql } from "@/lib/services/gql";
import { case_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'details-for-case';

export const required_attributes = `
    id,
    release_status
`

const queryFn = async (caseId: string) => {
    if (caseId == null) return null;

    const resp = await gql<{
        case: case_type
    }>( `query get_caseDetail($caseId: String)  {
            case(caseId: $caseId) {
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
            caseId
        }
    )
    return resp.case;
}

const UseCaseDetails = (caseId: string) => {
    return useQuery({
        queryKey: [key, caseId],
        queryFn: () => queryFn(caseId)
    });
}

export default UseCaseDetails
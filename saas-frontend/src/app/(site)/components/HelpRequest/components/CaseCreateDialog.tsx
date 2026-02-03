import { DialogProps } from "@radix-ui/react-dialog"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { gql } from "@/lib/services/gql"
import Spinner from "@/components/ui/spinner"
import useRealTimeObjectState from "@/components/utils/useRealTimeObjectState"
import { isNullOrUndefined } from "@/lib/functions"

type BLProps = {
    trackingCode: string
}

type Props = BLProps & DialogProps & {
    close_dialog: () => void
}

const useBL = (props) => {
    const caseStatus = useRealTimeObjectState<{ id: string, status: string | null, contact: { email: string } }>({
        typeName: "status",
        initialData: {
            id: props.trackingCode,
            status: "CREATED",
            contact: {
                email: ""
            }
        },
        group: `case-${props.trackingCode}`
    })
    
    useEffect(() => {
        const process = async () => {
            const tracking_code = props.trackingCode

            const resp = await gql<{
                case: {
                    caseStatus: string,
                    contact: {
                        email: string
                    }
                }
            }>( `query get_caseStatus($tracking_code: ID) {
                    case(trackingCode: $tracking_code) {
                        id,
                        caseStatus,
                        contact { 
                            email
                        }
                    }
                }
                `,
                {
                    tracking_code
                }
            )

            caseStatus.set({
                id: tracking_code,
                status: resp.case.caseStatus,
                contact: resp.case.contact
            })
        }

        process();
    }, [])

    return {
        ready: caseStatus.get != null,
        case: caseStatus.get,
    }
    
}

const CaseCreateDialog : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (copied) {
            setTimeout(() => {
                setCopied(false)
            }, 2000)
        }
    }, [copied])

    if (isNullOrUndefined(bl.case)) return <></>

    return (
        <>
            <Dialog {...props}>
                <DialogContent className="flex flex-col flex-grow">
                    {bl.ready && bl.case.status == "CREATED" && (
                        <>
                            <Spinner />
                        </>
                    )}
                    {bl.ready && bl.case.status == "NEW" && (
                        <>
                            <DialogTitle>Case request submitted.</DialogTitle>
                            <p className="leading-6">
                                Thankyou for submitting your help request. After payment is successful, this will be put in the queue for available cases for one of our investigators to take. At any time you may manage your case by simply logging in to <span className="font-bold">{bl.case.contact.email}</span>. After logging in click your email at the top right and find the SpiriAssist section to view and track your case.
                            </p>
                            <Button 
                                aria-label="button-close-createOffer-dialog" 
                                className="mt-4 w-full" 
                                variant="default" 
                                type="button"
                                onClick={() => props.close_dialog()} > Close </Button>
                        </>
                    )}   
                </DialogContent>
            </Dialog>
        </>
    )
}

export default CaseCreateDialog
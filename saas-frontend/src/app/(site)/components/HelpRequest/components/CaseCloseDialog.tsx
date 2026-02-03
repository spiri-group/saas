import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { DialogProps } from "@radix-ui/react-dialog"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { gql } from "@/lib/services/gql"
import Spinner from "@/components/ui/spinner"
import useRealTimeObjectState from "@/components/utils/useRealTimeObjectState"

type BLProps = {
    trackingCode: string
}

type Props = BLProps & DialogProps & {
    close_dialog: () => void
}

const useBL = (props : BLProps) => {
    const caseStatus = useRealTimeObjectState<{ id: string, status: string | null }>({
        typeName: "status",
        initialData: {
            id: props.trackingCode,
            status: "ACTIVE"
        },
        group: `case-${props.trackingCode}`
    })

    useEffect(() => {
        const process = async () => {
            const tracking_code = props.trackingCode

            const resp = await gql<{
                case: {
                    caseStatus: string
                }
            }>( `query get_caseStatus($tracking_code: ID) {
                    case(trackingCode: $tracking_code) {
                        id,
                        caseStatus,
                        trackingCode
                    }
                }
                `,
                {
                    tracking_code
                }
            )

            caseStatus.set({
                id: tracking_code,
                status: resp.case.caseStatus
            })
        }

        process();
    }, [])

    return {
        ready: caseStatus.get != null,
        caseStatus: caseStatus.get != null ? caseStatus.get.status : undefined
    }
    
}

const CaseCloseDialog : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <>
            <Dialog {...props}>
                <DialogContent className="flex flex-col flex-grow">
                    {bl.ready && bl.caseStatus == "ACTIVE" && (
                        <>
                            <Spinner />
                        </>
                    )}
                    {bl.ready && bl.caseStatus == "CLOSED" && (
                        <>
                            <DialogTitle>Case has succesfully closed.</DialogTitle>
                            <Button 
                                aria-label="button-close-closeOffer-dialog"
                                className="mt-4 w-full" 
                                variant="default" 
                                type="button"
                                onClick={() => props.close_dialog()}> Close </Button>
                        </>
                    )}     
                </DialogContent>
            </Dialog>
           
        </>
    )
}

export default CaseCloseDialog
import UseMerchantTours from "../../../../events-and-tours/hooks/UseMerchantTours"
import { Button } from "@/components/ui/button"

import { recordref_type } from "@/utils/spiriverse"
import { Separator } from "@radix-ui/react-dropdown-menu"
import { useState } from "react"
import ChooseTicketList from "./ChooseTicketList"

type BLProps = {
    merchantId: string
    vendorId: string
}

const useBL = (props: BLProps) => {
    const [selectedTour, setSelectedTour] = useState<recordref_type | null>(null)

    const merchantTours = UseMerchantTours(props.vendorId)
    
    return {
        merchantTours: {
            isLoading: merchantTours.isLoading,
            get: merchantTours.data ?? []
        },
        selectedTour,
        setSelectedTour
    }
}

type Props = BLProps & {

}
const EditTicket : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (   
        <div className="flex flex-row">  
            <div className="flex flex-col">
                <h1 className="font-bold"> Select tour first </h1>
                {bl.merchantTours.isLoading ? (
                <span className="text-xs">Loading...</span>
                ) : (
                    bl.merchantTours.get.length > 0 ? (
                    <ul>
                        {bl.merchantTours.get.map((tour) => (
                            <div key={tour.id} className="text-xs">
                                <span>{tour.name}</span>
                                <Button 
                                type="button"
                                className="ml-auto text-xs"
                                variant="link"
                                onClick={() => {
                                    bl.setSelectedTour(tour.ref)
                                }}
                                disabled={bl.selectedTour === tour.ref}
                                > Select </Button>
                                <Separator />
                            </div>
                        ))}
                    </ul>
                    ) : (
                    <span className="text-xs">No tours found.</span>
                    )
                )}
            </div>
            <div className="flex flex-col">
            {bl.selectedTour && ( 
                <ChooseTicketList merchantId={props.merchantId} tourId={bl.selectedTour.id} />
            )}
            </div>
        </div>
    )
}

export default EditTicket;
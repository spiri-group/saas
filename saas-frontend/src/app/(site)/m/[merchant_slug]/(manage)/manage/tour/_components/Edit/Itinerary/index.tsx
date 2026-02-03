import UseMerchantTours from "../../../../events-and-tours/hooks/UseMerchantTours"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { recordref_type } from "@/utils/spiriverse"
import { useState } from "react"
import ChooseActivityList from "./ChooseActivityList"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    const [selectedTour, setSelectedTour] = useState<recordref_type | null>(null)
    const [selectedActivityList, setSelectedActivityList] = useState<recordref_type | null>(null)

    const merchantTours = UseMerchantTours(props.merchantId)

    return {
        merchantTours: {
            isLoading: merchantTours.isLoading,
            get: merchantTours.data ?? []
        },
        selectedTour,
        setSelectedTour,
        selectedActivityList, 
        setSelectedActivityList
    }
}

const EditItinerary : React.FC<Props> = (props) => {
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
                <ChooseActivityList merchantId={props.merchantId} tourId={bl.selectedTour.id} />
            )}
            {/* {bl.selectedActivityList && (
                <UseEditActivityList />
            )} */}
            </div>
        </div>
    )
}

export default EditItinerary;
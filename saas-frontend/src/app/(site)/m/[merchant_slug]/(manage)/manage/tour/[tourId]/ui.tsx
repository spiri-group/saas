'use client'

import React from "react"

import TourDetails from "./components/TourDetails";
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
import AllReview from "../../../../../../components/Review/Reviews";
import NewReview from "../../../../../../components/Review/Create/NewReview";
import { recordref_type } from "@/utils/spiriverse";
import ListingRatings from "../../../../(site)/listing/components/ListingRatings";


type BLProps = {
    merchantId: string,
    tourId: string,
}

type Props = BLProps & {
}

const useBL = (props: BLProps) => {

    return {
        ref: {
            id: props.tourId,
            partition: props.merchantId
        } as recordref_type
    }
}

const UI : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (   
       <div className="flex flex-col space-y-3 flex-grow md:flex-row space-x-3">
            <TourDetails merchantId={props.merchantId} tourId={props.tourId} />
            <div className="flex flex-col flex-grow space-y-3">
                <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row space-x-3">
                    {/* <BookTour 
                        gql_conn={props.gql_conn} 
                        tourId={props.tourId} 
                        vendorId={props.merchantId} /> */}
                    <ListingRatings 
                        listingId={props.tourId} 
                        merchantId={props.merchantId} />
                </div>
                <Panel id="viewreview" className="flex-grow">
                    <PanelHeader className="flex flex-row">
                        <h1 className="font-bold text-sm md:text-xl">Reviews</h1>
                        <NewReview
                            objectId={props.tourId}
                            objectPartition={props.merchantId}  />
                    </PanelHeader>
                    <PanelContent className="flex flex-col min-h-[300px]">
                        <AllReview
                            objectId={props.tourId}
                            objectPartition={props.merchantId}
                            ref={bl.ref} />
                    </PanelContent>
                </Panel>
            </div>
       </div>
    )
}

export default UI;
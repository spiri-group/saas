'use client'

import React from "react"
import { recordref_type } from "@/utils/spiriverse";
import ServiceDetails from "./components/ServiceDetails";
import ListingRatings from "../../../../(site)/listing/components/ListingRatings";
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
import NewReview from "../../../../../../components/Review/Create/NewReview";
import AllReview from "../../../../../../components/Review/Reviews";
import BookService from "./components/BookService";

type BLProps = {
    merchantId: string,
    serviceId: string,
}

type Props = BLProps & {
}

const useBL = (props: BLProps) => {

    return {
        ref: {
            id: props.serviceId,
            partition: props.merchantId
        } as recordref_type
    }
}

const UI : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (   
       <div className="flex flex-col space-y-3 flex-grow md:flex-row space-y-0">
            <ServiceDetails merchantId={props.merchantId} serviceId={props.serviceId} />
            <div className="flex flex-col flex-grow space-y-3">
                <div className="flex flex-col space-y-3 md:flex-row space-x-3 ">
                    <BookService 
                        serviceId={props.serviceId}
                        vendorId={props.merchantId} />
                    <ListingRatings 
                        listingId={props.serviceId} 
                        merchantId={props.merchantId} />
                </div>
                <Panel id="viewreview" className="flex-grow">
                    <PanelHeader className="flex flex-row">
                        <h1 className="font-bold text-sm md:text-xl">Reviews</h1>
                        <NewReview
                            objectId={props.serviceId}
                            objectPartition={props.merchantId}  />
                    </PanelHeader>
                    <PanelContent className="flex flex-col min-h-[300px]">
                        <AllReview
                            objectId={props.serviceId}
                            objectPartition={props.merchantId}
                            ref={bl.ref} />
                    </PanelContent>
                </Panel>
            </div>
       </div>
    )
}

export default UI;
'use client'

import React from "react"
import UseReviewsAndRatings from "../hooks/UseReviews";
import ReviewComponent from "./components/Review";
import { choice_option_type, comment_type, recordref_type } from "@/utils/spiriverse";
import UseReportReasonsForComments from "../../Comment/hooks/UseReportReasonsForComments";

type BLProps = {
    objectId: string
    objectPartition: string,
    ref: recordref_type,
    comment?: comment_type,
}

type Props = BLProps & {
    useMerchantTheming?: boolean
}

const useBL = (props: BLProps) => {

    const reviews =  UseReviewsAndRatings(props.objectId, props.objectPartition)
    const reportReasons = UseReportReasonsForComments()

    return {
        reviews: {
            get: reviews.data ?? []
        },
        reportReasons: {
            get:reportReasons.data
        }
    }
}

const AllReview : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const noReviewsTextClass = props.useMerchantTheming
        ? "flex flex-grow items-center justify-center text-center text-xs md:text-base text-merchant-default-foreground/70"
        : "flex flex-grow items-center justify-center text-center text-xs md:text-base";

    if (bl.reportReasons.get != undefined && bl.reviews.get.length == 0) {
        return <div className={noReviewsTextClass}>No reviews yet</div>
    }

    return (   
        <div>
            { bl.reportReasons.get != undefined && (
                <ul className="space-y-2">
                    {
                        bl.reviews.get.map(review => {
                            return (
                                <li key={review.base.id} className="flex flex-col">
                                    <ReviewComponent
                                        reportReasons={bl.reportReasons.get as choice_option_type[]}
                                        review={review}
                                        useMerchantTheming={props.useMerchantTheming}
                                    />
                                </li> 
                            )
                        })
                    }
                </ul>  
            )}
        </div>
    )
}

export default AllReview;
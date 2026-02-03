'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import RatingStarVisualizerComponent from "@/components/ui/ratingstar"
import { choice_option_type, review_type } from "@/utils/spiriverse"
import { useState } from "react"
import { DialogTitle } from "@radix-ui/react-dialog"
import { Panel } from "@/components/ux/Panel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CornerDownRightIcon } from "lucide-react"
import { DateTime } from "luxon"
import NewComment from "@/app/(site)/components/Comment/Create/NewComment"
import NewReport from "@/app/(site)/components/Report/Create/NewReport"
import AllComment from "@/app/(site)/components/Comment/Comments"

type BLProps = {
    review: review_type
}
  
type Props = BLProps & {
    reportReasons: choice_option_type[]
    useMerchantTheming?: boolean
}
  
const useBL = (props: BLProps) => {
    const queryClient = useQueryClient()

    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);

    const stats = useQuery({
        queryKey: ['stats-for-comment', props.review.base.ref],
        queryFn: () => {
            return {
                replyCount: props.review.base.replyCount,
                isReported: props.review.base.isReported
            }
        }
    });

    const onReport = () => {
        // update the cache
        queryClient.setQueryData(['stats-for-comment', props.review.base.ref], (data: any) => {
            return {
                ...data,
                isReported: true
            }
        })
    }

    return {
        isReplyOpen,
        setIsReplyOpen,
        isRepliesOpen, 
        setIsRepliesOpen,
        replyCount: stats.data ? stats.data.replyCount ?? 0 : 0,
        isReported: stats.data ? stats.data.isReported : false,
        onReport
    }
}
  
  const ReviewComponent : React.FC<Props> = (props) => {
    const bl = useBL(props)

    // Apply merchant theming classes if enabled
    const panelStyle = props.useMerchantTheming ? {
        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
        color: `rgb(var(--merchant-panel-primary-foreground))`,
        borderColor: `rgb(var(--merchant-primary), 0.2)`,
        boxShadow: `var(--shadow-merchant-lg)`
    } : {};

    const dateTextClass = props.useMerchantTheming
        ? "text-merchant-default-foreground/70"
        : "text-slate-500";

    const nameTextClass = props.useMerchantTheming
        ? "font-bold text-merchant-default-foreground"
        : "font-bold";

    const headlineTextClass = props.useMerchantTheming
        ? "font-bold text-merchant-headings-foreground"
        : "font-bold";

    const reportedTextClass = props.useMerchantTheming
        ? "font-bold text-merchant-default-foreground/70"
        : "font-bold";

        return (
            <Panel style={panelStyle}>
                <div className="flex flex-col">
                    {bl.isReported ? (
                        <span className={reportedTextClass}>{props.review.headline.substring(0,10)} ... has been reported</span>
                    ) : (
                        <>
                            <div className="flex flex-row space-x-2 text-sm mb-2">
                                <span className={dateTextClass}>{DateTime.fromISO(props.review.base.createdDate).toFormat('ccc dd LLL, yyyy')}</span>
                                <span className={nameTextClass}>{props.review.base.posted_by.name}</span>
                            </div>
                            <div className="flex flex-row space-x-2">
                                <RatingStarVisualizerComponent className="mt-1" readOnly={true} value={props.review.rating} />
                                <span className={headlineTextClass}>{props.review.headline}</span>
                            </div>
                            <span className={props.useMerchantTheming ? "text-merchant-default-foreground" : ""}>{props.review.base.text}</span>
                            <div className="flex flex-row space-x-2">
                                {bl.replyCount > 0 && <Button variant="link" onClick={() => bl.setIsRepliesOpen(!bl.isRepliesOpen)}> {bl.replyCount == 1 ? '1 Reply' : `${bl.replyCount} replies`}</Button>}
                                <Button variant="link" onClick={() => bl.setIsReplyOpen(!bl.isReplyOpen)}> Reply </Button>
                                <Button variant="link"> Helpful </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="link"> Report </Button>
                                    </DialogTrigger>
                                    <DialogContent className="flex flex-col w-[500px]">
                                        <DialogHeader>
                                            <DialogTitle>Report <span className="font-bold">{props.review.headline}</span></DialogTitle>
                                        </DialogHeader>
                                        <NewReport 
                                            forObject={props.review.base.ref}
                                            reportReasons={props.reportReasons}
                                            onSuccess={() => bl.onReport()}  />
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="space-y-2">
                                {bl.isReplyOpen && 
                                    <NewComment 
                                        replyTo={props.review.base.ref}
                                        onSuccess={() => {
                                            bl.setIsReplyOpen(false)
                                            bl.setIsRepliesOpen(true)
                                        }} />
                                }
                                {bl.isRepliesOpen && 
                                    <div className="flex flex-row space-x-3">
                                        <CornerDownRightIcon className="w-4 h-4 ml-4" />
                                        <AllComment 
                                            className="pt-2"
                                            replyTo={props.review.base.ref} />
                                    </div>
                                }
                            </div>
                        </>
                    )}
                </div>
            </Panel>
        )
  }
  
  export default ReviewComponent;
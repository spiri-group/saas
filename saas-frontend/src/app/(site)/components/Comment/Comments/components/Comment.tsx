'use client'


import { choice_option_type, comment_type } from "@/utils/spiriverse"
import { useState } from "react"
import AllComment from ".."
import NewComment from "../../Create/NewComment"
import { Button } from "@/components/ui/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CornerDownRightIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import NewReport from "@/app/(site)/components/Report/Create/NewReport"

type BLProps = {
    gql_conn: gql_conn_type
    comment: comment_type
}
  
type Props = BLProps & {
    reportReasons: choice_option_type[]
}
  
const useBL = (props: BLProps) => {
    const queryClient = useQueryClient()

    const [isReplyOpen, setIsReplyOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);

    const stats = useQuery({
        queryKey: ['stats-for-comment', props.comment.ref],
        queryFn: () => {
            return {
                replyCount: props.comment.replyCount,
                isReported: props.comment.isReported
            }
        }
    });

    const onReport = () => {
        // update the cache
        queryClient.setQueryData(['stats-for-comment', props.comment.ref], (data: any) => {
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
  
  const Comment : React.FC<Props> = (props) => {
    const bl = useBL(props)
  
        return (
            <div className="flex flex-col">
            {bl.isReported ? (
                <span className="font-bold">{props.comment.text.substring(0,10)} ... has been reported</span>
            ) : (
                <>
                    <div className="flex flex-col text-sm">
                        <div className="flex flex-col text-sm">
                            <span className="font-bold">
                            {props.comment.posted_by.isOwner ? `(Owner)` : ''} {props.comment.posted_by.name}
                            </span>
                            <span> {props.comment.text} </span>
                        </div>
                        <div className="grid grid-cols-2 text-sm"> 
                            {bl.replyCount > 0 && <Button variant="link" onClick={() => bl.setIsRepliesOpen(!bl.isRepliesOpen)}> {bl.replyCount == 1 ? '1 Reply' : `${bl.replyCount} replies`}</Button>}
                            <Button variant="link" onClick={() => bl.setIsReplyOpen(!bl.isReplyOpen)}> Reply </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="link"> Report </Button>
                                </DialogTrigger>
                                <DialogContent className="flex flex-col w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Report comment</DialogTitle>
                                    </DialogHeader>
                                    <NewReport
                                        forObject={props.comment.ref}
                                        reportReasons={props.reportReasons}
                                        onSuccess={() => bl.onReport()}  />
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="space-y-2">
                            {bl.isReplyOpen && <NewComment replyTo={props.comment.ref} 
                            onSuccess={() => {
                                bl.setIsReplyOpen(false)
                                bl.setIsRepliesOpen(true)
                            }} />}
                            {bl.isRepliesOpen && 
                                <div className="flex flex-row space-x-3">
                                    <CornerDownRightIcon className="w-4 h-4 ml-4" />
                                    <AllComment 
                                        className="pt-2"
                                        replyTo={props.comment.ref} />
                                </div>
                            }
                        </div>
                    </div>
                </>
            )}
            </div>
        )
  }
  
  export default Comment;
  
'use client'

import React from "react"
import UseComments from "../hooks/UseComment";
import { recordref_type } from "@/utils/spiriverse";
import UseReplies from "../hooks/UseReplies";
import { cn } from "@/lib/utils";
import UseReportReasonsForComments from "../hooks/UseReportReasonsForComments";

type BLProps = {
    forObject?: recordref_type,
    replyTo? : recordref_type
}

type Props = BLProps & {
    className?: string
}

const useBL = (props: BLProps) => {
    if (props.forObject == undefined && props.replyTo == undefined) throw 'for object or reply to must be set';

    const comments = props.replyTo != null ? UseReplies(props.replyTo) 
                        : UseComments(props.forObject as recordref_type)
    const reportReasons = UseReportReasonsForComments()

    return {
        comments: {
            get: comments.data ?? []
        },
        reportReasons: {
            get: reportReasons.data
        }
    }
}

const AllComment : React.FC<Props> = (props) => {
    const bl = useBL(props)
    
    return (   
        <div className={cn(props.className)}>
            <ul className="space-x-2">
                {
                   bl.reportReasons.get != undefined && bl.comments.get.map(comment => {
                        return (
                            <li key={comment.id} className="flex flex-col">
                                {/* <Comment 
                                    gql_conn={props.gql_conn} 
                                    comment={comment}
                                    reportReasons={bl.reportReasons.get as choice_option_type[]} /> */}
                            </li> 
                        )
                    })
                }
            </ul>
        </div>
    )
}

export default AllComment;
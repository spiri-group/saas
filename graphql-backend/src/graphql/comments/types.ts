//#region Comments

import { CommentTypes, recordref_type } from "../0_shared/types"
import { user_type } from "../user/types"

export type comment_type = {
    id: string
    posted_by: user_type & {
        isOwner: boolean
    }
    createdDate: string
    text: string
    type: CommentTypes
    docType: "comment"
    status: string
    isReported: boolean
    ref: recordref_type
    replies: comment_type[],
    replyCount: number
}

export type chat_type = {
    posted_by: user_type,
    text: string
}

export type review_type = {
    headline: string
    base: comment_type
    rating: number
}

//#endregion
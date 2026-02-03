//#region Messages

import { CommunicationModeType, media_type, recordref_type } from "../0_shared/types"
import { user_type } from "../user/types"
import { vendor_type } from "../vendor/types"

export type message_type = {
    id: string,
    posted_by: {
        ref: recordref_type,
        name: string
    }
    posted_by_user: user_type,
    posted_by_vendor: vendor_type,
    text: string,
    ref: recordref_type,
    reply_to: message_type,
    deliver_to?: deliverto_type,
    sentAt: string,
    respondedAt: string
    media?: media_type[]
}

export type deliverto_type = {
    userId: string,
    requiresResponse: boolean,
    responseCode: string
    datetime: string,
    mode: CommunicationModeType
}

//#endregion
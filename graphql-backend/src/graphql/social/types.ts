//#region SocialPost

import { media_type, recordref_type, textFormat_type } from "../0_shared/types"

export type socialpost_type = {
    id: string,
    type: "text-only" | "media-only",
    vendorId: string,
    customerId: string,
    title?: string,
    description: string,
    availableAfter: string,
    media?: media_type[],
    hashtags: string[]
    ref: recordref_type,
    content: {
        mainText?: {
            content: string,
            format: textFormat_type
        } | undefined,
        subText?: {
            content: string,
            format: textFormat_type
        } | undefined
    }
}

//#endregion
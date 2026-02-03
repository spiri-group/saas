//#region LiveStream

import { MediaType, media_type } from "../0_shared/types"
import { chat_type } from "../comments/types"
import { questionMode_input_type, questionMode_type } from "../question/types"

export type liveStream_type = {
    id: string,
    name: string,
    type: MediaType,
    topic: string,
    description: string,
    thumbnail: media_type,
    questionMode: questionMode_type,
    chats: chat_type[],
    moderate: moderate_type[]
}

export type livestream_input_type = {
    id: string,
    name: string,
    topic: string,
    type: media_type,
    datetime: string,
    description: string,
    thumbnail: media_type,
    questionMode: questionMode_input_type
}

export type moderate_type = {
    userId: string,
    alias: string,
}

//#endregion
//#region Question 

import { currency_amount_type, QuestionModeEnum } from "../0_shared/types"
import { user_type } from "../user/types"

export type question_type = {
    id: string,
    posted_by: user_type,
    question: string,
    price: currency_amount_type
    position: string
}

export type questionMode_input_type = {
    mode: QuestionModeEnum,
    price: currency_amount_type
}

export type questionMode_type = {
    mode: QuestionModeEnum
    price: currency_amount_type
}

//#endregion
//#region Report 

import { user_type } from "../user/types"

export type report_type = {
    id: string,
    posted_by: user_type,
    description: string,
    docType: "report"
}

//#endregion
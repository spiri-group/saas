//#region Wishlist

import { recordref_type, media_type, VisibilityType } from "../0_shared/types"
import { listing_type } from "../listing/types"
import { user_type } from "../user/types"

export type wishlist_type = {
    id: string,
    name: string,
    ref: recordref_type,
    user: user_type,
    listing: listing_type,
    lines: wishlistLine_type[],
    thumbnail: media_type,
    visible: VisibilityType
}

export type wishlistLine_type = {
    ref: recordref_type,
    productRef: recordref_type,
    listing: listing_type,
    skuId: string,
    sale_price: string,
    quantity: string
}

//#endregion
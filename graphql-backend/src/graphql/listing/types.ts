//#region Listing

import { GroupingsType, currency_amount_type, rating_type, recordref_type, thumbnail_type } from "../0_shared/types"
import { review_type } from "../comments/types"
import { activityList_type, ticketList_type, tour_type } from "../eventandtour/types"
import { vendor_type } from "../vendor/types"

export const enum ListingTypes {
    LIVESTREAM = "LIVESTREAM",
    VIDEO = "VIDEO",
    PODCAST = "PODCAST",
    TOUR = "TOUR",
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE"
}

export type listing_type = {
    id: string,
    ref: recordref_type,
    vendorId: string,
    vendor: vendor_type,
    name: string,
    slug: string,
    type: string,
    url: string,
    displayScore: number,
    rating?: rating_type,
    reviews: review_type[]
    description: string,
    preview: string,
    pricing_descriptor: string,
    dateScheduled?: string,
    thumbnail: thumbnail_type,
    
    thumbnailMode?: string,
    isLive?: boolean,
    advertisment?: {
        discount: {
            rrp: string,
            pct: number,
        },
        price: string,
        message: string,
        keyAction: string
    },
    skus: listing_sku_type[]
}

export type listing_sku_type = {
    id:string
    price: currency_amount_type
    qty:string
}

export type listingGrouping_type = {
    id: string,
    vendorId: string,
    name: string,
    type: GroupingsType
    overall_price: currency_amount_type
    description: string
}

export type listingSchedule_type = {
    id: string,
    listingId: string,
    vendorId: string,
    capacity: number,
    recurrenceRule: string | null,
    dates: string[] | null,
    name: string,
    ticketListId: string,
    activityListId: string,
    ticketList: ticketList_type,
    activityList: activityList_type,
    tour: tour_type
}

//#endregion
//#region Shared

import { choice_option_type } from "../choices/types"

export type searchResponse = {
    results: searchResult[],
    hasMore: boolean,
    hasPrevious: boolean
}

export type searchResult = {
    id: string,
    title: string,
    link: string,
    thumbnail?: thumbnail_type,
    price?: currency_amount_type,
    additionalInfo?: string,
}

export type MutationResponse = {
    code: string
    success: boolean
    message: string
}

export type QuestionMode = {
    mode: QuestionModeEnum
    price: currency_amount_type
    priceId: string
}

export type stripe_details_type = {
    accountId?: string, // used for connected accounts
    invoiceId?: string,
    invoiceNumber?: string,
    invoiceStatus?: string,
    charge?: stripe_charge_type,
    paymentIntent?: {
        id: string,
        account?: string
    },
    paymentIntentSecret?: string,
    setupIntentId?: string,
    setupIntentSecret?: string,
    amount?: currency_amount_type,
    totalDue?: currency_amount_type,
    totalRefunded?: currency_amount_type,
    totalPaid?: currency_amount_type
}

export type stripe_charge_type = {
    id: string,
    account: string,
    amount: currency_amount_type,
    amount_captured: currency_amount_type,
    amount_refunded: currency_amount_type,
    amount_remaining: currency_amount_type 
}

export type stripe_invoice_type = {
    id: string,
    status: string
}

export type PriceRecurringDefinition = {
    interval: string,
    interval_count: string
}

export type recordref_type = {
    id: string,
    partition: string | string[],
    container?: string 
}

export type googleplace_type = {
    id: string,
    formattedAddress: string,
    components: stripeplace_type,
    point: {
        type: "Point",
        coordinates: {
            lat: number,
            lng: number
        }
    }
}

export type stripeplace_type = {
    city: string,
    country: string,
    line1: string,
    line2: string,
    postal_code: string,
    state: string
}

export type media_type = {
    name: string,
    url: string,
    urlRelative: string,
    size: "SQUARE" | "RECTANGLE_HORIZONTAL" | "RECTANGLE_VERTICAL",
    type: MediaType,
    code: string,
    title?: string
    description?: string
    hashtags?: string[]
    sizeBytes?: number
    durationSeconds?: number // For video files
}

export type video_type = {
    media: media_type,
    coverPhoto?: media_type
}

export enum BannerBackgroundType {
    COLOR = 'COLOR',
    GRADIENT = 'GRADIENT',
    IMAGE = 'IMAGE'
}

export enum GradientDirection {
    TO_RIGHT = 'TO_RIGHT',
    TO_LEFT = 'TO_LEFT',
    TO_BOTTOM = 'TO_BOTTOM',
    TO_TOP = 'TO_TOP',
    TO_BOTTOM_RIGHT = 'TO_BOTTOM_RIGHT',
    TO_BOTTOM_LEFT = 'TO_BOTTOM_LEFT',
    TO_TOP_RIGHT = 'TO_TOP_RIGHT',
    TO_TOP_LEFT = 'TO_TOP_LEFT'
}

export enum TextAlignment {
    LEFT = 'LEFT',
    CENTER = 'CENTER',
    RIGHT = 'RIGHT'
}

export enum BannerTextSize {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
    XLARGE = 'XLARGE'
}

export type banner_config_type = {
    backgroundType: BannerBackgroundType,
    backgroundColor?: string,
    gradientStart?: string,
    gradientEnd?: string,
    gradientDirection?: GradientDirection,
    backgroundImage?: media_type,
    promiseText: string,
    textColor: string,
    textAlignment: TextAlignment,
    textSize: BannerTextSize
}
 
export type hastag_type = {
     title: string,
}
 
export type shopfront_type = {
     type: string,
     image: string[]
}

export type textFormat_type = {
    family: string,
    size: 'small' | 'medium' | 'large',
    color: string,
    backgroundColor: string,
    bold: boolean,
    italic: boolean,
    alignment: "left" | "right" | "center",
    decoration: "none" | "underline" | "line-through",
    case: "none" | "upper" | "lower" | "name",
    margin: {
        top: number,
        bottom: number,
        left: number,
        right: number
    },
    padding: {
        top: number,
        bottom: number,
        left: number,
        right: number
    },
    withQuotes: boolean,
    borderRadius: {
        topLeft: number,
        topRight: number,
        bottomLeft: number,
        bottomRight: number
    }
}

export type faq_type = {
    id: string,
    title: string
    description: string
}

export type timeRange_type = {
    start: string,
    end: string,
    duration_ms: number
}

export type rating_type = {
    total_count: number,
    average: number,
    rating1: number,
    rating2: number,
    rating3: number,
    rating4: number,
    rating5: number
}

export type location_type = {
    name: string,
    formattedAddress: string,
    place_id: string
}

export type timespan_type = {
    amount: number,
    unit: choice_option_type,
}

export type thumbnail_type = {
    image: {
        media: media_type,
        zoom: number,
        objectFit: "cover" | "contain" | "fill" | "none" | "scale-down"
    },
    dynamicMode?: {
        type: "VIDEO" | "COLLAGE",
        video?: {
            media: media_type,
            autoplay: boolean,
            muted: boolean
        },
        collage?: {
            images: media_type[],
            transitionDuration: number,
            crossFade: boolean
        }
    },
    title: {
        content: string,
        panel: {
            bgColor: string,
            textColor: string,
            bgOpacity: number
        }
    },
    moreInfo?: {
        content: string
    },
    stamp?: {
        text?: string,
        enabled: boolean,
        bgColor: string,
        textColor: string
    },
    bgColor: string,
    panelTone?: "light" | "dark"
}

//#region Pre-Reading Questions

export type question_option_type = {
    id: string,
    label: string
}

export type pre_reading_question_type = {
    id: string,
    type: "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN" | "DATE" | "NUMBER" | "EMAIL",
    question: string,
    description?: string,
    required: boolean,
    options?: question_option_type[] // For multiple choice, checkboxes, dropdown
}

//#endregion
     
export type currency_amount_type = {
    id?: string,
    amount: number,
    currency: string,
    recurring?: PriceRecurringDefinition
}

export type dateToFrom_type = {
    from: string,
    to: string
}

export type contactNumber_type = {
    raw: string,
    displayAs: string,
    value: string
}

export const enum QuestionModeEnum {
    BID,
    FIXED_PRICE,
    FREE
}

export const enum RecordStatus {
    ACTIVE = "ACTIVE", INACTIVE = "INACTIVE"
}

export const enum VisibleType {
    PUBLIC,
    PRIVATE
}

export const enum GroupingsType {
    CATEGORY,
    PLAYLIST
}

export const enum StatusType {
    COMPLETED,
    UPCOMING,
    ON_GOING,
    CANCELLED,
    SHIPPED,
    AWAITING_PAYMENT,
    AWAITING_CHARGE,
    REFUNDED
}

export const enum VisibilityType {
    PUBLIC,
    PRIVATE
}

export enum Locale {
    EN = "EN", 
    DE = "DE",
    IND = "IND"
}

export enum MediaType {
    AUDIO = "AUDIO",
    VIDEO = "VIDEO",
    IMAGE = "IMAGE"
}

export enum CommunicationModeType {
    SMS = "SMS",
    EMAIL = "EMAIL",
    PLATFORM = "PLATFORM"
}

export enum UnitType {
    HOUR,
    MINUTE,
    SECOND
}

export enum TimeFrameType {
    BEFORE,
    AFTER,
    DURING
}

export const enum CommentTypes {
    COMMENT = "COMMENT",
    REVIEWS_AND_RATING = "REVIEWS_AND_RATING",
    CHAT = "CHAT"
} 

export const enum Day {
    MON = "MON",
    TUE = "TUE",
    WED = "WED",
    THU = "THU",
    FRI = "FRI", 
    SAT = "SAT",
    SUN = "SUN"
}

//#endregion
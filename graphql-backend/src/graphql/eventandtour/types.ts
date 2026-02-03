//#region EventAndTour

import { StatusType, media_type, recordref_type, UnitType, TimeFrameType, stripe_details_type, googleplace_type, timeRange_type, currency_amount_type, faq_type, thumbnail_type } from "../0_shared/types"
import { ListingTypes } from "../listing/types"
import { message_type } from "../messages/types"
import { orderLine_type, order_type } from "../order/types"
import { user_type } from "../user/types"
import { vendor_type } from "../vendor/types"

export type tour_ticket_inventory_type = {
    qty_on_hand: number,
    qty_committed: number,
    qty_available: number,
    track_inventory: boolean,
    low_stock_threshold?: number,
    allow_backorder?: boolean,
    max_backorders?: number
}

export type tour_ticket_transaction_type = {
    id: string,
    datetime: string,
    qty_before: number,
    qty_after: number,
    reason: 'COMMITMENT' | 'SALE' | 'FULFILLMENT' | 'RECEIVED' | 'REFUND' | 'ADJUSTMENT',
    source?: 'ORDER' | 'MANUAL' | 'SHIPMENT' | 'DELIVERY',
    reference_id?: string,
    created_by: string,
    notes?: string
}

export type tour_ticket_variant_type = {
    id: string,
    name: string,
    description?: string,
    price: currency_amount_type,
    peopleCount: number,
    inventory: tour_ticket_inventory_type,
    inventory_transactions?: tour_ticket_transaction_type[]
}

export type tour_type = {
    id: string,
    type: ListingTypes,
    name: string,
    description:string,
    terms: string,
    faq: faq_type[]
    country: string,
    thumbnail: thumbnail_type,
    ticketVariants: tour_ticket_variant_type[],
    activityLists: activityList_type[],
    productReturnPolicyId?: string,
    ref: recordref_type,
    vendor?: vendor_type
}

export type event_type = {
    id: string,
    eventName: string,
    price: currency_amount_type,
    type: string
}

export type session_type = {
    id: string,
    ref: recordref_type,
    sessionTitle: string,
    code: string
    forObject: recordref_type,
    fromSchedule?: recordref_type,
    date: string,
    time: timeRange_type,
    announcements: announcement_type[],
    activityListId: string,
    activityList?: activityList_type,
    capacity: capacity_type,
    bookings: booking_type[]
}

export type booking_ticket_type = {
    id: string,
    variantId: string,
    person: string,
    quantity: number,
    price: currency_amount_type
}

export type reminder_sent_type = {
    datetime: string,
    type: '24H' | '2H'
}

export type booking_type = {
    id: string,
    code: string,
    userId: string,
    customerEmail: string,
    vendorId: string,
    user: user_type,
    sessions: {
        index: number,
        ref: recordref_type,
        tickets: booking_ticket_type[]
    }[],
    ticketStatus: StatusType,
    order?: order_type,
    orderId?: string,
    checkedIn?: checkedInStatus_type,
    paid?: paidStatus_type,
    datetime: string,
    lastMessage?: message_type,
    lastMessageRef?: recordref_type,
    notes?: string,
    ref: recordref_type,
    payment_link?: string,
    stripe?: stripe_details_type,
    totalAmount?: currency_amount_type,
    reminderSent?: reminder_sent_type,
    status_log: {
        datetime: string,
        label: string,
        triggeredBy: string
    }[]
}

export type capacity_type = {
    max: number,
    mode: 'PER_PERSON' | 'PER_TICKET',
    current?: number,
    remaining?: number
}

// Waitlist system types
export type waitlist_ticket_preference_type = {
    variantId: string,
    quantity: number,
    notes?: string
}

export type waitlist_entry_type = {
    id: string,
    sessionRef: recordref_type,
    tourRef: recordref_type,
    customerEmail: string,
    vendorId: string,
    sessionDate: string,
    sessionTime: string,
    tourName: string,
    positionInQueue: number,
    dateJoined: string,
    ticketPreferences: waitlist_ticket_preference_type[],
    notificationStatus: 'PENDING' | 'NOTIFIED' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED',
    notificationAttempts: number,
    lastNotificationAttempt?: string,
    notificationExpiry?: string,
    priority: number,
    // status field is managed by database layer for soft-delete (ACTIVE/INACTIVE/DELETED)
    cancelledAt?: string,
    convertedToBookingId?: string,
    ref: recordref_type
}

export type checkedInStatus_type = {
    datetime: string
}

export type paidStatus_type = {
    datetime: string,
    type: string
}

export type activityList_type = {
    id: string,
    name: string,
    activities: activity_type[]
}

export type activity_type = {
    id: string,
    name: string,
    location: googleplace_type
    time: string
}

export type ticketList_type = {
    id: string,
    name: string, 
    tickets: ticket_type[] | ticketSpec_type[]
}

export type ticket_type = {
    index: number,
    id: string,
    person: string,
    name: string,
    sourcedFromRef: recordref_type,
    ticketId: string,
    ticketListId: string,
    stripeId: string,
    stripeNumber: string,
    stripe?: stripe_details_type,
    orderRef?: recordref_type,
    amountOutstanding?: currency_amount_type,
    price: currency_amount_type & {
        quantity: number
   },
    status_log: {
        datetime: string,
        label: string,
        triggeredBy: string
    }[]
}

export type sessionSpec_type = {
    from: string,
    to: string,
    capacity: number
}

export type activitySpec_type = {
    activityName: string,
    activityTime: string
}

export type ticketSpec_type = {
    id: string,
    currency: string,
    name: string,
    peopleCount: number,
    price: currency_amount_type
}

export type eventdetails_type = {
    id: string,
    name: string,
    operated_by: string,
    thumbnail: thumbnail_type,
    description: string,
    // reviews: review_type[],
    tickets: ticket_type[],
    otherTours: eventdetails_type[]
}

export type eventSession_type = {
    id: string,
    name: string,
    forObject: recordref_type,
    user: user_type,
    activity: activitySpec_type,
    ticket: ticketSpec_type
}

export type announcement_type = {
    id: string,
    message: string,
    time: string,
    unit: UnitType,
    timeFrame: TimeFrameType
} 

export type tour_ticket_variant_input_type = {
    id: string,
    name: string,
    description?: string,
    price: currency_amount_type,
    peopleCount: number,
    qty_on_hand: number,
    track_inventory: boolean,
    low_stock_threshold?: number,
    allow_backorder?: boolean,
    max_backorders?: number
}

export type tour_input_type = {
    id: string,
    name: string,
    description: string,
    terms?: string,
    faq?: faq_type[],
    country: string,
    timezone: string,
    currency: string,
    thumbnail?: thumbnail_type,
    ticketVariants: tour_ticket_variant_input_type[],
    activityList: activityList_type,
    productReturnPolicyId?: string
}

export type session_input_type = session_type & {
    error_message?: string
}

export type activity_input_type = activity_type & {
    error_message?: string
}

export type ticket_input_type = ticket_type & {
    error_message?: string
}

export type bookingPayment_type = {
    tour: tour_type,
    merchant: vendor_type
    stripe: stripe_details_type,
    createdDate: string,
    type: string
}

export type vendor_event_type = {
    id: string,
    type: "VendorEvent",
    docType: "schedule",
    vendorId: string,
    listingId?: string,
    title: string,
    startAt: string,
    endAt: string,
    timezone: string,
    location: {
        type: "physical" | "digital",
        address?: googleplace_type,
        externalUrl?: string
    },
    visibility: "public" | "private",
    status: "scheduled" | "cancelled" | "completed",
    tags: string[],
    description?: string,
    landscapeImage?: thumbnail_type,
    ttl?: number
}

export type vendor_event_input_type = {
    id: string;
    vendorId: string,
    listingId?: string,
    title: string,
    startAt: Date,
    endAt: Date,
    timezone: string,
    location: {
        type: "physical" | "digital",
        address?: googleplace_type,
        externalUrl?: string
    },
    visibility: "public" | "private",
    tags: string[],
    description?: string,
    landscapeImage?: thumbnail_type
}

export type vendor_event_update_type = {
    id: string,
    title?: string,
    startAt?: Date,
    endAt?: Date,
    timezone?: string,
    location: {
        type: "physical" | "digital",
        address?: googleplace_type,
        externalUrl?: string
    },
    visibility?: "public" | "private",
    status?: "scheduled" | "cancelled" | "completed",
    tags?: string[],
    description?: string,
    landscapeImage?: thumbnail_type,
    ttl?: number
}

//#endregion
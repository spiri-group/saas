//#region User

import { contactNumber_type, Day, googleplace_type, media_type, recordref_type } from "../0_shared/types"
import { case_type } from "../case/types"
import { ticket_type } from "../eventandtour/types"
import { order_type } from "../order/types"
import { vendorUser_type, vendor_type } from "../vendor/types"
import { wishlist_type } from "../wishlist/types"

export const enum SpiritualInterest {
    MEDIUMSHIP = "MEDIUMSHIP",
    PARANORMAL = "PARANORMAL",
    CRYSTALS = "CRYSTALS",
    WITCHCRAFT = "WITCHCRAFT",
    ENERGY = "ENERGY",
    HERBALISM = "HERBALISM",
    FAITH = "FAITH"
}

export type user_type = {
    id: string,
    email: string,
    firstname: string,
    lastname: string,
    name: string,
    currency?: string,
    locale?: string,
    requiresSetup: boolean,
    vendorSetup: vendorUser_type,
    vendors: vendor_type[],
    stripe: {
        customerId: string,
    }
    ref: recordref_type,
    pinned: pinned_type[],
    orders(orderStatus: [string]): order_type[],
    tickets(ticketStatus: [string]): ticket_type[],
    feed: feedActivity_type,
    cases: case_type[],
    lastViewed: lastViewed_type,
    wishlists: wishlist_type[],
    requiresInput: boolean,
    addresses: address_type[],
    securityQuestions: securityQuestion_type[],
    cards: card_type[],
    religion?: {
        id: string,
        name: string
    },
    openToOtherExperiences?: boolean,
    primarySpiritualInterest?: SpiritualInterest,
    secondarySpiritualInterests?: SpiritualInterest[],
    phoneNumber?: {
        raw: string,
        displayAs: string,
        value: string
    }
}

export type securityQuestion_type = {
    id: string,
    question: string,
    answer: string
}

export type card_type = {
    id: string,
    brand: string,
    last4: string,
    exp_month: number,
    exp_year: number,
    funding: string,
    country?: string
}

export type address_type = {
    id: string,
    firstname: string,
    lastname: string,
    phoneNumber: contactNumber_type,
    address: googleplace_type,
    isDefault: boolean,
    deliveryInstructions: deliveryInstructions_type
}

export type address_details_type = {
    line1: string,
    city: string,
    state: string,
    postal_code: string,
    country: string
}

export type deliveryInstructions_type = {
    propertyType: PropertyType,
    dropOffPackage: DropOffPackage,
    onDefaultDays: string[],
    onFederalHolidays: boolean,
    openSaturday: boolean,
    openSunday: boolean,
    haveDog: boolean,
    securityCode: string,
    callBox: string,
    details: string
}

export type setup_type = {
    id: string | null,
    path: "MERCHANT" | "CUSTOMER" | null
}

export type my_profile = {
    id: string,
    name: string,
    pinned: pinned_type[],
    lastViewed: lastViewed_type[],
    feed: feedActivity_type[]
}

export type feedActivity_type = {
    id: string,
    user: user_type,
    message: string
    datePosted: string,
    thumbnail: media_type
}

export type lastViewed_type = {
    id: string,
    type: string,
    percentageComplete: string,
    thumbnail: media_type,
}

export type pinned_type = {
    id: string,
    user: user_type,
    thumbnail: media_type
}

export type customer_type = {
    id: string,
    firstname: string,
    lastname: string,
    phoneNumber: contactNumber_type
    address: string,
    country: string,
    postcode: string,
    email: string,
    thumbnail: media_type,
    ref: recordref_type
}

export const enum PropertyType {
    HOUSE = "HOUSE",
    APARTMENT = "APARTMENT",
    BUSINESS = "BUSINESS"
}

export const enum DropOffPackage {
    FRONT_DOOR = "FRONT_DOOR",
    MAIL_ROOM = "MAIL_ROOM",
    PROPERTY_STAFF = "PROPERTY_STAFF",
    BUILDING_RECEPTION = "BUILDING_RECEPTION",
    LEASING_OFFICE = "LEASING_OFFICE",
    LOADING_DOCK = "LOADING_DOCK",
    BACK_DOOR = "BACK_DOOR",
    SIDE_PORCH = "SIDE_PORCH",
    OUTSIDE_GARAGE = "OUTSIDE_GARAGE",
    NO_PREFERENCE = "NO_PREFERENCE"
}

//#endregion
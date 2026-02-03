//#region Case

import { contactNumber_type, currency_amount_type, googleplace_type, media_type, recordref_type, stripe_details_type } from "../0_shared/types"
import { choice_option_type } from "../choices/types"
import { order_type } from "../order/types"
import { variant_type } from "../product/types"
import { user_type } from "../user/types"
import { vendorUser_type, vendor_type } from "../vendor/types"

export type case_type = {
    id: string
    code: string
    userId: string,
    trackingCode: string
    contact: contact_type
    category: choice_option_type
    religion: choice_option_type
    location: googleplace_type
    affectedPeople: affectedPerson_type[]
    affectedAreas: affectedArea_type[]
    managedBy: string[]
    balance: currency_amount_type,
    urgencyFee: variant_type,
    startedFrom: {
        amount: number
        unit: choice_option_type
        descriptor: string
    }
    locatedFromMe: {
        value: number 
        units: string
    }
    caseStatus: string
    description: string
    ref: recordref_type
    participants: vendor_type
    interactions: caseInteraction_type[]
    merchants: vendor_type[]
    invoices: order_type[]
    release_status: string
    stripe: stripe_details_type
    releaseOffer: caseOffer_type
    closeOffer: caseOffer_type
    stripeIntents: {
        create: { id: string, type: string },
        close: { id: string, type: string },
        release: { id: string, type: string }
    }
}

export type caseVendor_type = { 
    id: string
    merchant: vendor_type
}

export type caseOffer_type = {
    id: string 
    merchantId: string
    caseId: string
    case: case_type
    code: string
    description: string
    acceptedOn: string
    rejectedOn: string
    type: string
    order: order_type
    merchant: vendor_type
    ref: recordref_type
    stripe: stripe_details_type
    merchantResponded: boolean
    clientRequested: boolean
}

export type contact_type = {
    email: string
    name: string
    phoneNumber: contactNumber_type
}

export type affectedArea_type = {
    id: string
    name: string
    evidence?: media_type[]
}

export type affectedPerson_type = {
    id: string
    name: string
    mentallyInjured: boolean
    physicallyInjured: boolean
    isChild: boolean
    evidence?: media_type[]
}

export type caseInteraction_type = {
    length: number
    id: string
    code: string
    conductedAtDate: string
    createdDate: string
    posted_by_userId: string
    posted_by_vendorId: string
    posted_by_user: user_type
    posted_by_vendor: vendor_type
    type: string
    details: string
    message: string
    attachedFiles?: media_type[]
    title: string
    comment: string
    fee: string
    ref: recordref_type
    participants: vendorUser_type[]
}

export type casePayment_type = {
    case: case_type
    merchant: vendor_type
    stripe: stripe_details_type
    createdDate: string
    type: string
}

export type caseInvoice_type = {
    id: string
    stripe: stripe_details_type
    interactions: caseInvoiceInteraction_type[]
}

export type caseInvoiceInteraction_type = {
    invoiceId: string
    invoiceDescription: string
    amount: currency_amount_type
}

export const enum CaseOfferType {
    APPLICATION = "APPLICATION",
    RELEASE = "RELEASE",
    CLOSE = "CLOSE"
} 

//#endregion
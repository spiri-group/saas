//#region Journey

import { currency_amount_type, media_type, recordref_type, thumbnail_type } from "../0_shared/types"
import { PractitionerModality } from "../vendor/types"

// Journey structure type
export type JourneyStructure = "SINGLE_TRACK" | "COLLECTION" | "SERIES"

// Difficulty levels
export type JourneyDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

// Journey-specific type data (stored on the listing document in Main-Listing)
export type journey_type = {
    id: string
    vendorId: string
    name: string
    slug: string
    type: "JOURNEY"
    description: string
    thumbnail: thumbnail_type
    ref: recordref_type
    isLive: boolean
    termsDocumentId?: string

    // Journey-specific fields
    journeyStructure: JourneyStructure
    modalities?: PractitionerModality[]
    intention?: string
    totalDurationSeconds: number
    trackCount: number

    // Pricing
    pricing: journey_pricing_type

    // Enrichment
    recommendedCrystals?: string[]
    recommendedTools?: string[]
    difficulty?: JourneyDifficulty
    spiritualInterests?: string[]

    // Preview
    previewTrackId?: string

    // Tracks (resolved from sub-documents with docType = 'journeyTrack')
    tracks?: journey_track_type[]

    // Stripe
    stripeProductId?: string
    stripePriceId?: string
    stripeSingleTrackPriceId?: string
}

export type JourneyAccessType = "PURCHASE" | "RENTAL"

export type journey_pricing_type = {
    collectionPrice: currency_amount_type
    singleTrackPrice?: currency_amount_type
    allowSingleTrackPurchase: boolean
    rentalPrice?: currency_amount_type
    rentalDurationDays?: number
    allowRental: boolean
}

export type journey_track_type = {
    id: string
    journeyId: string
    vendorId: string
    docType: "journeyTrack"

    trackNumber: number
    title: string
    description: string
    intention?: string
    durationSeconds: number

    // Audio file
    audioFile: media_type

    // Preview (seconds of free preview available without purchase)
    previewDurationSeconds?: number

    // Integration prompts (journaling questions / practices after listening)
    integrationPrompts?: string[]

    // Recommended crystals for this specific track
    recommendedCrystals?: string[]

    // Cross-sell: linked product listing IDs from the practitioner's catalogue
    linkedProductIds?: string[]

    // For drip-released series
    releaseDate?: string

    ref?: recordref_type
}

// Progress tracking - stored in Main-PersonalSpace
export type journey_progress_type = {
    id: string // "jp:{journeyId}"
    userId: string
    journeyId: string
    vendorId: string
    docType: "journeyProgress"
    purchaseDate: string

    // Access type - defaults to PURCHASE for backward compat
    accessType: JourneyAccessType
    rentalExpiresAt?: string

    trackProgress: journey_track_progress_type[]

    completedDate?: string
    currentTrackNumber: number
}

export type journey_track_progress_type = {
    trackId: string
    completed: boolean
    lastPositionSeconds: number
    completedDate?: string
    reflection?: string
}

//#endregion

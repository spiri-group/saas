//#region Vendor

import { banner_config_type, contactNumber_type, currency_amount_type, googleplace_type, media_type, recordref_type, textFormat_type, thumbnail_type, video_type } from "../0_shared/types"
import { review_type } from "../comments/types"
import { product_type } from "../product/types"
import { socialpost_type } from "../social/types"
import { customer_type, user_type } from "../user/types"

//#region Practitioner Types

export enum VendorDocType {
    MERCHANT = "MERCHANT",
    PRACTITIONER = "PRACTITIONER"
}

export enum PractitionerModality {
    TAROT = "TAROT",
    ORACLE = "ORACLE",
    ASTROLOGY = "ASTROLOGY",
    NUMEROLOGY = "NUMEROLOGY",
    MEDIUMSHIP = "MEDIUMSHIP",
    CHANNELING = "CHANNELING",
    REIKI = "REIKI",
    ENERGY_HEALING = "ENERGY_HEALING",
    CRYSTAL_HEALING = "CRYSTAL_HEALING",
    AKASHIC_RECORDS = "AKASHIC_RECORDS",
    PAST_LIFE = "PAST_LIFE",
    BREATHWORK = "BREATHWORK",
    SOUND_HEALING = "SOUND_HEALING",
    COACHING = "COACHING",
    COUNSELING = "COUNSELING",
    OTHER = "OTHER"
}

export enum PractitionerSpecialization {
    GRIEF_LOSS = "GRIEF_LOSS",
    RELATIONSHIPS = "RELATIONSHIPS",
    CAREER = "CAREER",
    LIFE_PURPOSE = "LIFE_PURPOSE",
    SPIRITUAL_AWAKENING = "SPIRITUAL_AWAKENING",
    ANCESTRAL_HEALING = "ANCESTRAL_HEALING",
    SHADOW_WORK = "SHADOW_WORK",
    SELF_DISCOVERY = "SELF_DISCOVERY",
    DECISION_MAKING = "DECISION_MAKING",
    HEALTH_WELLNESS = "HEALTH_WELLNESS",
    PAST_LIVES = "PAST_LIVES",
    SPIRIT_COMMUNICATION = "SPIRIT_COMMUNICATION",
    OTHER = "OTHER"
}

export enum PractitionerReadingStyle {
    GENTLE = "GENTLE",
    DIRECT = "DIRECT",
    INTUITIVE = "INTUITIVE",
    STRUCTURED = "STRUCTURED"
}

export enum PractitionerAvailability {
    ACCEPTING_CLIENTS = "ACCEPTING_CLIENTS",
    WAITLIST = "WAITLIST",
    NOT_ACCEPTING = "NOT_ACCEPTING"
}

export enum PractitionerBadge {
    FEATURED = "FEATURED",
    TOP_RATED = "TOP_RATED",
    ESTABLISHED = "ESTABLISHED"
}

export type training_credential_type = {
    id: string,
    title: string,
    institution?: string,
    year?: number,
    description?: string
}

export type practitioner_verification_type = {
    identityVerified: boolean,
    practitionerVerified: boolean,
    verifiedAt?: string,
    badges?: PractitionerBadge[]
}

export type oracle_message_type = {
    id: string,
    audio: media_type,
    message?: string | null,
    postedAt: string,
    expiresAt: string
}

export type video_update_type = {
    id: string,
    media: media_type,
    coverPhoto?: media_type,
    caption?: string | null,
    postedAt: string
}

export type practitioner_profile_type = {
    // Identity
    pronouns?: string,
    headline: string,

    // Personal Story
    bio: string,
    spiritualJourney?: string,

    // Gifts & Modalities
    modalities: PractitionerModality[],
    gifts?: string[],
    tools?: string[],

    // Specializations
    specializations: PractitionerSpecialization[],
    customSpecializations?: string[],

    // Experience & Credentials
    yearsExperience?: number,
    training?: training_credential_type[],

    // Reading Style
    readingStyle?: PractitionerReadingStyle,
    approach?: string,
    whatToExpect?: string,
    clientPrepGuidance?: string,

    // Availability
    availability: PractitionerAvailability,
    acceptingNewClients: boolean,
    responseTime?: string,
    timezone?: string,

    // Verification
    verification: practitioner_verification_type,

    // Audio & Media
    audioIntro?: media_type,
    oracleMessage?: oracle_message_type,

    // Pinned Content
    pinnedReviewIds?: string[],
    pinnedTestimonialIds?: string[],

    // Linked Shopfronts - merchants owned by this practitioner to display on their profile
    linkedShopfronts?: linked_shopfront_type[]
}

// Linked shopfront reference for practitioner profiles
export type linked_shopfront_type = {
    merchantId: string,
    merchantSlug: string,
    merchantName: string,
    merchantLogo?: string,
    displayOrder: number
}

//#endregion

//#region Testimonial Types

export enum TestimonialRequestStatus {
    PENDING = "PENDING",
    SUBMITTED = "SUBMITTED",
    EXPIRED = "EXPIRED"
}

export type testimonial_type = {
    id: string,
    practitionerId: string,
    clientName: string,
    clientEmail?: string,
    rating: number,
    headline: string,
    text: string,
    relationship?: string,
    createdAt: string
}

export type testimonial_request_type = {
    id: string,
    practitionerId: string,
    token: string,
    clientEmail?: string,
    clientName?: string,
    requestStatus: TestimonialRequestStatus,
    createdAt: string,
    expiresAt: string,
    submittedAt?: string,
    // Populated testimonial reference
    testimonialId?: string
}

//#endregion

export type vendor_contact_type = {
    email: string,
    phoneNumber: contactNumber_type
}

export type vendor_type = {
    id: string,
    name: string,
    slug: string,
    docType?: VendorDocType,
    publishedAt?: string,
    practitioner?: practitioner_profile_type,
    onStart?: string,
    mode?: string,
    selectedTheme?: string,
    selectedScheme?: string,
    followerCount: number,
    intro: string,
    contact: {
        internal: vendor_contact_type,
        public: vendor_contact_type
    },
    thumbnail?: thumbnail_type,
    currency: string,
    country: string,
    address: string,
    website: string,
    stripe?: VendorStripeInfo,
    stripe_business: stripe_business_account_type
    reviews: review_type[],
    socialPosts: socialpost_type[]
    ref: recordref_type,
    logo: media_type,
    font?: {
        brand: textFormat_type,
        headings: textFormat_type,
        default: textFormat_type,
        accent: textFormat_type
    },
    colors?: {
        primary: {
            background: string,
            foreground: string
        },
        links: string
    }
    background?: {
        color?: string
        image?: media_type
    }
    panels?: {
        background: {
            color: string,
            transparency: number
        },
        primary: textFormat_type,
        accent: textFormat_type
    },
    banner: media_type,
    bannerConfig?: banner_config_type,
    social: merchant_social,
    locations: merchantLocation_type[],
    teamMembers: teamMember_type[],
    customers: customer_type[],
    descriptions: merchant_description_type[],
    videos?: video_type[],
    videoUpdates?: video_update_type[],
    videoSettings?: {
        autoplay: boolean,
        autoplayDelay: number // in seconds
    },
    subscription: vendorSubscription_type,
    storage?: {
        usedBytes: number
    },
    hasRole?: boolean,
    readingRating?: {
        total_count: number,
        average: number,
        rating1: number,
        rating2: number,
        rating3: number,
        rating4: number,
        rating5: number
    }
}

export type merchant_social = {
    style: string,
    platforms: social_platform_type[]
}

export type social_platform_type = {
    platform: string,
    url: string,
    handle: string,
    id: string
}

export type vendorSubscription_type = {
  // Tier-based subscription fields
  subscriptionTier: subscription_tier,
  billingInterval: billing_interval,
  billingStatus: billing_status,
  cumulativePayouts: number,            // all-time payout total (cents) for this vendor
  subscriptionCostThreshold: number,    // tier monthly price (cents) — triggers first billing
  firstBillingTriggeredAt?: string,     // ISO date when first billing was triggered
  lastBilledAt?: string,               // ISO date of last successful charge
  subscriptionExpiresAt?: string,       // ISO date when current period ends
  stripePaymentMethodId?: string,       // Stripe PaymentMethod ID (replaces saved_payment_method)
  failedPaymentAttempts: number,        // 0-3
  nextRetryAt?: string,                // ISO date for next retry
  lastPaymentAttemptAt?: string,        // ISO date of last attempt (safety check)
  // Downgrade scheduling
  pendingDowngradeTo?: subscription_tier | null,
  downgradeEffectiveAt?: string | null,
  // Kept from legacy
  card_status: merchant_card_status,
  payment_status: merchant_subscription_payment_status,
  billing_history?: billing_record_type[],
  first_payout_received?: boolean,
  payouts_blocked?: boolean,
  // Subscription override fields (set by admin console)
  discountPercent?: number,
  waived?: boolean,
  waivedUntil?: string,
  overrideNotes?: string,
  // Legacy fields (kept for backward compatibility during migration)
  plans?: plan_type[],
  orderId?: string,
  stripeSubscriptionId?: string,
  payment_retry_count?: number,
  last_payment_date?: Date,
  next_billing_date?: string,
  saved_payment_method?: string,
}

export type plan_type =  {
  productId: string
  variantId: string
  priceId?: string
  price: currency_amount_type
  name: string
}

export type subscription_tier = 'awaken' | 'manifest' | 'transcend'

export type billing_status = 'pendingFirstBilling' | 'active' | 'suspended' | 'cancelled'

export type teamMember_type ={
    id: string,
    name: string,
    tagline: string,
    bio: string,
    image: media_type
}

export type merchantLocation_type = {
    id: string,
    title: string,
    address: googleplace_type,
    services: string[]
}

export type vendorUser_type = {
    vendorId: string,
    vendor: vendor_type,
    userId: string,
    user: user_type
}

export type VendorStripeInfo = {
    id: string,
    customerId: string, 
    accountId: string,
    setupIntent?: {
        id: string,
        secret: string
    } 
}

export type merchant_description_type = {
    id: string,
    title: string
    body: string
    supporting_images: media_type[]
}

export type stripe_business_account_type = {
    id: string,
    disabled_reason: string,
    currently_due: string[],
    past_due: string[],
    token?: string,
    onboarding_link: stripe_account_link_type,
    update_link?: stripe_account_link_type
}

export type stripe_account_link_type = {
    created: number,
    expires_at: number,
    url: string
}

export enum merchant_card_status {
    not_saved = "not_saved",
    saved = "saved"
}

export enum merchant_subscription_payment_status {
    not_attempted = "not_attempted",
    pending = "pending",
    success = "success",
    failed = "failed"
}

export enum billing_interval {
    monthly = "monthly",
    annual = "annual"
}

export enum billing_record_status {
    success = "success",
    failed = "failed"
}

export type billing_record_type = {
    id: string,
    date: string,
    amount: number,
    currency: string,
    billingStatus: billing_record_status,
    stripePaymentIntentId?: string,
    error?: string,
    period_start: string,
    period_end: string
}


//#endregion
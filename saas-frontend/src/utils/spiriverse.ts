//#region Shared



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
//#region Case








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
//#region Choice 



// Flat choice types
export type choice_type = {
    id: string,
    options: choice_option_type[]
}

export type choice_option_type = {
    id: string,
    defaultLabel: string,
    localizations: localization_type[],
    status: RecordStatus
}

export type localization_type = {
    locale: Locale,
    value: string
}

// Choice configuration types
export enum ChoiceKind {
    FLAT = 'FLAT',
    HIERARCHICAL = 'HIERARCHICAL'
}

// Schema types for FLAT choices
export type property_type = 'text' | 'number';

export type schema_property_type = {
    id: string,
    name: string,
    type: property_type,
    required: boolean
}

export type flat_choice_schema_type = {
    properties: schema_property_type[]
}

// Metadata schema types for hierarchical choices
export type metadata_field_type = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'PERCENTAGE' | 'CURRENCY';

export type metadata_schema_field_type = {
    id: string,
    name: string,
    type: metadata_field_type,
    required: boolean
}

export type metadata_schema_type = {
    fields: metadata_schema_field_type[]
}

export type node_metadata_type = {
    [fieldId: string]: string | number | boolean | Date
}

export type choice_config_type = {
    docType: 'choice-config',
    id: string, // This IS the backing identifier (e.g., "category", "product-types")
    kind: ChoiceKind,
    label: string,
    ref: recordref_type,
    metadataSchema?: metadata_schema_type,
    createdAt?: string,
    updatedAt: string
}

// Hierarchical choice types
export type choice_node_type = {
    configId: string,
    id: string,
    ref: recordref_type,
    type: string,
    label: string, // Default label (usually English)
    localizations: node_localization_type[],
    parentRef?: recordref_type,
    sortOrder: number,
    ancestors: string[],
    path: string,
    icon?: string,
    level: number,
    childIds: string[],
    status: RecordStatus,
    children: choice_node_type[],
    metadata?: node_metadata_type,
    createdAt?: string,
    updatedAt: string
}

export type node_localization_type = {
    locale: Locale,
    label: string,
    slug?: string
}

export type choice_flat_option_type = {
    id: string,
    label: string,
    path: string,
    slug: string,
    level: number
}

//#endregion
//#region Comments




export type comment_type = {
    id: string
    posted_by: user_type & {
        isOwner: boolean
    }
    createdDate: string
    text: string
    type: CommentTypes
    docType: "comment"
    status: string
    isReported: boolean
    ref: recordref_type
    replies: comment_type[],
    replyCount: number
}

export type chat_type = {
    posted_by: user_type,
    text: string
}

export type review_type = {
    headline: string
    base: comment_type
    rating: number
}

//#endregion


// Crystal Reference Database Types
// Stored in System-SettingTrees with configId = "crystal-reference"

export const CRYSTAL_REFERENCE_CONFIG_ID = "crystal-reference";
export const CRYSTAL_REFERENCE_CONTAINER = "System-SettingTrees";

// Enums for crystal properties
export type crystal_color =
  | "clear"
  | "white"
  | "black"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "brown"
  | "gray"
  | "gold"
  | "silver"
  | "multicolor"
  | "iridescent";

export type crystal_system =
  | "cubic"
  | "tetragonal"
  | "orthorhombic"
  | "hexagonal"
  | "trigonal"
  | "monoclinic"
  | "triclinic"
  | "amorphous";

export type crystal_form =
  | "raw"
  | "tumbled"
  | "point"
  | "cluster"
  | "sphere"
  | "palm_stone"
  | "tower"
  | "wand"
  | "pyramid"
  | "heart"
  | "skull"
  | "cabochon"
  | "faceted"
  | "slice"
  | "geode"
  | "jewelry"
  | "freeform"
  | "cube"
  | "carving"
  | "blade"
  | "fan"
  | "other";

export type chakra_type =
  | "root"
  | "sacral"
  | "solar_plexus"
  | "heart"
  | "throat"
  | "third_eye"
  | "crown"
  | "earth_star"
  | "soul_star";

export type element_type = "earth" | "water" | "fire" | "air" | "spirit";

export type zodiac_sign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type cleansing_method =
  | "moonlight"
  | "sunlight"
  | "smoke"
  | "sound"
  | "water"
  | "salt"
  | "earth"
  | "selenite"
  | "clear_quartz"
  | "breath"
  | "visualization"
  | "reiki"
  | "other";

export type charging_method =
  | "moonlight"
  | "sunlight"
  | "water"
  | "crystal_cluster"
  | "intention"
  | "grid"
  | "meditation"
  | "earth"
  | "other";

// Main Crystal Reference Type
export type crystal_reference_type = {
  // Identity
  id: string; // URL-safe slug, e.g., "amethyst"
  configId: string; // Always "crystal-reference" (partition key)
  docType: "crystal"; // Discriminator

  // Basic Info
  name: string; // Display name, e.g., "Amethyst"
  alternateNames: string[]; // ["Chevron Amethyst", "Brandberg Amethyst"]
  description: string; // Rich text description

  // Physical Properties
  colors: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number; // 1-10 scale
  commonForms: crystal_form[];

  // Metaphysical Properties
  chakras: chakra_type[];
  elements: element_type[];
  zodiacSigns: zodiac_sign[];
  planetaryAssociation?: string; // "Jupiter", "Moon", etc.
  numerology?: number; // 1-9

  // Uses & Meanings
  primaryProperties: string[]; // ["intuition", "calm", "spiritual_awareness"]
  emotionalUses: string[]; // ["anxiety relief", "grief support"]
  spiritualUses: string[]; // ["meditation", "psychic development"]
  physicalAssociations: string[]; // ["headaches", "sleep"] - NOT medical claims

  // Care Instructions
  cleansingMethods: cleansing_method[];
  chargingMethods: charging_method[];
  avoidMethods: string[]; // ["prolonged_sunlight", "salt_water"]
  careNotes?: string; // Additional care instructions

  // Source Information
  localities: string[]; // ["Brazil", "Uruguay", "Madagascar"]

  // Media
  thumbnail?: string; // URL to representative image

  // Metadata
  ref?: recordref_type;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

// Input types for mutations
export type create_crystal_reference_input = {
  id?: string; // Auto-generated from name if not provided
  name: string;
  alternateNames?: string[];
  description: string;
  colors: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number;
  commonForms: crystal_form[];
  chakras: chakra_type[];
  elements: element_type[];
  zodiacSigns: zodiac_sign[];
  planetaryAssociation?: string;
  numerology?: number;
  primaryProperties: string[];
  emotionalUses?: string[];
  spiritualUses?: string[];
  physicalAssociations?: string[];
  cleansingMethods: cleansing_method[];
  chargingMethods: charging_method[];
  avoidMethods?: string[];
  careNotes?: string;
  localities: string[];
  thumbnail?: string;
};

export type update_crystal_reference_input = {
  id: string;
  name?: string;
  alternateNames?: string[];
  description?: string;
  colors?: crystal_color[];
  crystalSystem?: crystal_system;
  mohsHardness?: number;
  commonForms?: crystal_form[];
  chakras?: chakra_type[];
  elements?: element_type[];
  zodiacSigns?: zodiac_sign[];
  planetaryAssociation?: string;
  numerology?: number;
  primaryProperties?: string[];
  emotionalUses?: string[];
  spiritualUses?: string[];
  physicalAssociations?: string[];
  cleansingMethods?: cleansing_method[];
  chargingMethods?: charging_method[];
  avoidMethods?: string[];
  careNotes?: string;
  localities?: string[];
  thumbnail?: string;
};

// Query filter types
export type crystal_reference_filters = {
  search?: string; // Full-text search on name, alternateNames, description
  colors?: crystal_color[];
  chakras?: chakra_type[];
  elements?: element_type[];
  zodiacSigns?: zodiac_sign[];
  properties?: string[]; // Search in primaryProperties
};

// Response types
export type crystal_reference_response = {
  success: boolean;
  message?: string;
  crystal?: crystal_reference_type;
};

export type crystal_reference_list_response = {
  crystals: crystal_reference_type[];
  totalCount: number;
};

export interface EmailTemplate {
  docType: "email-template";
  id: string; // e.g., "refund-approved", "order-confirmation"
  name: string; // Human-readable name
  subject: string; // Email subject line (can include {{variables}})
  html: string; // Full HTML content (can include {{variables}})
  variables: string[]; // e.g., ["customerName", "refundAmount", "orderId"]
  category?: string; // e.g., "order", "refund", "shipping"
  description?: string; // Optional description of when this template is used
  isActive: boolean;
  headerId?: string; // Reference to EmailHeaderFooter with type "header"
  footerId?: string; // Reference to EmailHeaderFooter with type "footer"
  createdAt: string;
  updatedAt: string;
  updatedBy: string; // Staff member who last edited
}

export interface EmailTemplateInput {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables?: string[];
  category?: string;
  description?: string;
  isActive?: boolean;
  headerId?: string;
  footerId?: string;
}

export interface EmailHeaderFooter {
  docType: "email-header-footer";
  id: string; // Auto-generated UUID
  name: string; // Human-readable name
  type: "header" | "footer";
  content: string; // JSON string of EmailStructure
  description?: string; // Optional description
  isDefault: boolean; // Whether this is the default header/footer
  isActive: boolean; // Whether this is available for selection
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EmailHeaderFooterInput {
  id?: string; // If provided, update existing; otherwise create new
  name: string;
  type: "header" | "footer";
  content: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

//#region EventAndTour








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




// Workflow status for featuring requests
// Using requestStatus (NOT status) to avoid Cosmos soft-delete conflict per CLAUDE.md
export enum FeaturingRequestStatus {
    PENDING = "PENDING",        // Merchant sent request, awaiting practitioner response
    ACCEPTED = "ACCEPTED",      // Practitioner accepted, relationship is active
    REJECTED = "REJECTED",      // Practitioner rejected the request
    EXPIRED = "EXPIRED",        // Request timed out (e.g., 7 days)
    TERMINATED = "TERMINATED"   // Either party ended an active relationship
}

export enum FeaturingType {
    FULL_PROFILE = "FULL_PROFILE",          // Feature entire practitioner profile + all services
    SELECTED_SERVICES = "SELECTED_SERVICES"  // Feature only specific services
}

// Schedule types for featuring relationships
export type featuring_schedule_weekday_type = {
    day: number;           // 0=Sunday, 6=Saturday
    dayName: string;
    enabled: boolean;
    timeSlots: { start: string; end: string }[];
}

export type featuring_schedule_type = {
    scheduleMode: "PRACTITIONER_DEFAULT" | "STORE_SPECIFIC";
    timezone: string;
    weekdays?: featuring_schedule_weekday_type[];
    dateOverrides?: {
        date: string;
        type: "BLOCKED" | "CUSTOM";
        timeSlots?: { start: string; end: string }[];
        reason?: string;
    }[];
    bufferMinutes?: number;
    advanceBookingDays?: number;
}

export type featuring_delivery_context_type = {
    inStore: boolean;
    online: boolean;
    storeLocation?: googleplace_type;
}

export type featuring_service_price_override_type = {
    serviceId: string;
    serviceName: string;       // denormalized
    overrideType: "FIXED" | "HOURLY";
    fixedPrice?: currency_amount_type;
    ratePerHour?: currency_amount_type;
}

export type featuring_relationship_type = {
    id: string;                              // Format: "feat_{merchantId}_{practitionerId}"
    docType: "FEATURING_RELATIONSHIP";

    // Parties involved
    merchantId: string;
    practitionerId: string;

    // Denormalized info for efficient display (avoids joins)
    merchantName: string;
    merchantSlug: string;
    merchantLogo?: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerHeadline?: string;
    practitionerAvatar?: string;

    // Featuring configuration
    featuringType: FeaturingType;
    featuredServiceIds?: string[];           // Only populated when type is SELECTED_SERVICES

    // Revenue share stored as basis points for precision
    // Example: 1500 = 15.00%, 500 = 5.00%
    merchantRevenueShareBps: number;         // What merchant gets from referrals
    practitionerRevenueShareBps: number;     // 10000 - merchantRevenueShareBps (auto-calculated)

    // Request workflow - CRITICAL: Using requestStatus, NOT status
    requestStatus: FeaturingRequestStatus;
    requestedAt: string;                     // ISO timestamp
    respondedAt?: string;                    // When practitioner responded
    terminatedAt?: string;                   // When relationship was terminated
    terminatedBy?: "MERCHANT" | "PRACTITIONER";
    terminationReason?: string;

    // Request/response messages
    requestMessage?: string;                 // Merchant's message when requesting
    responseMessage?: string;                // Practitioner's message when responding

    // Store-specific schedule, delivery, and pricing
    storeSchedule?: featuring_schedule_type;
    deliveryContext?: featuring_delivery_context_type;
    servicePriceOverrides?: featuring_service_price_override_type[];

    // Display preferences for shopfront
    displayOrder?: number;                   // Ordering in featured section (lower = higher)
    highlighted?: boolean;                   // Special highlighting on shopfront

    // Timestamps
    createdAt: string;
    updatedAt: string;

    // Cosmos record reference
    ref?: recordref_type;
}

// Input type for creating a featuring request
export type create_featuring_request_input = {
    practitionerId: string;
    featuringType: FeaturingType;
    featuredServiceIds?: string[];           // Required when type is SELECTED_SERVICES
    merchantRevenueShareBps: number;         // Proposed merchant share (e.g., 1500 for 15%)
    requestMessage?: string;
}

// Input type for practitioner responding to a request
export type respond_featuring_request_input = {
    relationshipId: string;
    accept: boolean;
    responseMessage?: string;
}

// Input type for updating an active featuring relationship
export type update_featuring_relationship_input = {
    relationshipId: string;
    featuredServiceIds?: string[];           // Change which services are featured
    merchantRevenueShareBps?: number;        // Renegotiate share (requires mutual agreement)
    displayOrder?: number;
    highlighted?: boolean;
}

// Input type for configuring store schedule
export type configure_featuring_schedule_input = {
    relationshipId: string;
    storeSchedule: featuring_schedule_type;
}

// Input type for configuring store-specific pricing
export type configure_featuring_pricing_input = {
    relationshipId: string;
    servicePriceOverrides: featuring_service_price_override_type[];
}

// Input type for configuring delivery context
export type configure_featuring_delivery_input = {
    relationshipId: string;
    deliveryContext: featuring_delivery_context_type;
}

// Resolved types for frontend queries
export type featured_practitioner_type = {
    relationship: featuring_relationship_type;
    practitioner: vendor_type;
    services: service_type[];                // All or selected services based on featuringType
}

export type featured_service_type = {
    relationship: featuring_relationship_type;
    service: service_type;
    practitioner: vendor_type;
}

// Response type for mutations
export type featuring_request_response = {
    code: string;
    success: boolean;
    message: string;
    relationship?: featuring_relationship_type;
}

// Enriched practitioner with service info for discovery
export type discovered_practitioner_type = {
    practitioner: vendor_type;
    serviceCount: number;
    priceRange?: {
        min: { amount: number; currency: string };
        max: { amount: number; currency: string };
    };
}

// Type for practitioner discovery (browsing available practitioners)
export type practitioner_discovery_response = {
    practitioners: discovered_practitioner_type[];
    totalCount: number;
    hasMore: boolean;
}

// Type to track featuring source on orders (added to order line)
export type featuring_source_type = {
    relationshipId: string;
    merchantId: string;
    merchantName: string;
    merchantSlug: string;
    merchantRevenueShareBps: number;
    practitionerRevenueShareBps: number;
}




export type follow_type = {
    id: string
    targetId: string           // partition key (merchantId for now)
    targetType: "MERCHANT" | "USER"  // future: support user-to-user follows
    followerId: string         // userId of the person following
    followerName: string       // denormalized for marketing lists
    followerEmail?: string     // denormalized for marketing
    followerAvatar?: string    // denormalized for display
    followedAt: string         // ISO timestamp
    status: "ACTIVE" | "INACTIVE"
}

export type follow_result_type = {
    success: boolean
    isFollowing: boolean
    followerCount: number
}

export type following_merchant_type = {
    merchantId: string
    merchantName: string
    merchantSlug: string
    merchantLogo?: string
    followedAt: string
}



// Gallery type aliases
export type gallery_item_type_enum = 'photo' | 'video';
export type gallery_item_layout_enum = 'single' | 'double';

export interface gallery_category_type {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  groupCount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Category';
}

export interface gallery_album_type {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Album';
}

export interface gallery_group_type {
  id: string;
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  // Cosmos DB fields
  _id?: string;
  vendorId: string;
  docType: 'Group';
}

export interface gallery_item_type {
  id: string;
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
  createdAt: string;
  updatedAt: string;
  _id?: string;
  vendorId: string;
  docType: 'Item';
  ref: recordref_type;
}

export interface linked_product_type {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string;
  price?: {
    amount: number;
    currency: string;
  };
}

export interface create_gallery_category_input {
  merchantId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface create_gallery_album_input {
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
}

export interface create_gallery_group_input {
  merchantId: string;
  categoryId: string;
  name: string;
  description?: string;
}

export interface create_gallery_item_input {
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
}

export interface update_gallery_category_input {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

export interface update_gallery_album_input {
  id: string;
  name?: string;
  description?: string;
  coverImageUrl?: string;
}

export interface update_gallery_group_input {
  id: string;
  name?: string;
  description?: string;
}

export interface update_gallery_item_input {
  id: string;
  title?: string;
  description?: string;
  layout?: gallery_item_layout_enum;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  linkedProducts?: linked_product_type[];
  tags?: string[];
}

export interface upsert_gallery_item_input {
  id?: string; // If provided, will update existing item; if not, will create new item
  merchantId: string;
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type: gallery_item_type_enum;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  layout: gallery_item_layout_enum;
  linkedProducts?: linked_product_type[];
  tags?: string[];
  usedBytes?: number;
}

export interface gallery_filters {
  categoryId?: string;
  albumId?: string;
  groupId?: string;
  type?: gallery_item_type_enum;
  layout?: gallery_item_layout_enum;
  tags?: string[];
  unalbumedOnly?: boolean;
}
//#region Listing






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
//#region LiveStream





export type liveStream_type = {
    id: string,
    name: string,
    type: MediaType,
    topic: string,
    description: string,
    thumbnail: media_type,
    questionMode: questionMode_type,
    chats: chat_type[],
    moderate: moderate_type[]
}

export type livestream_input_type = {
    id: string,
    name: string,
    topic: string,
    type: media_type,
    datetime: string,
    description: string,
    thumbnail: media_type,
    questionMode: questionMode_input_type
}

export type moderate_type = {
    userId: string,
    alias: string,
}

//#endregion





export type shipment_type = {
  id: string;
  code: string;

  sendTo: shipment_address_type;
  sendFrom: shipment_address_type;

  carrierOptions?: estimate_record_type[];
  carrierInfo?: carrier_info_type;

  finalizedConfiguration?: {
    boxes: packed_box_type[];
    pricing: {
      tax_amount: currency_amount_type;
      subtotal_amount: currency_amount_type;
    };
    estimated_delivery_date?: string;
    delivery_days?: number;
  };

  suggestedConfiguration?: {
    source?: string;
    boxes: packed_box_type[];
    pricing: {
      tax_amount: currency_amount_type;
      subtotal_amount: currency_amount_type;
    };
    estimated_delivery_date?: string;
    delivery_days?: number;
  };

  carrierSummary?: {
    totalOptions: number;
    cheapestOption: estimate_record_type;
    optionsByCarrier: Record<
      string,
      {
        services: string[];
        minRate: number;
        maxRate: number;
      }
    >;
  };

  packingMetadata?: {
    wasDeviated: boolean;
    deviationType?: string;
    diffReport?: {
      boxCountChanged: boolean;
      dimensionsDiffer: boolean;
      weightDiffered: boolean;
      skusMoved: boolean;
      skusAddedOrMissing: boolean;
    };
  };

  label?: label_info_type;
  isFinalized?: boolean;

  // Resolver-injected
  orderRef?: {
    id: string;
    partition: string;
  };

  // Computed: current status + tracking event log
  trackingStatus?: tracking_event_type

  trackingEvents?: tracking_event_type[];
};

export type tracking_event_type = {
  description?: string; // optional description for better UX

  status_code: string;
  status_description: string;
  occurred_at: string;
  city_locality?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  company_name?: string;
  signer?: string;
  event_code?: string;
  event_description?: string;
  carrier_detail_code?: string;
  latitude?: number;
  longitude?: number;

  location?: string;

  status_source: 'carrier' | 'manual';
  triggered_by?: string;
  reason?: string;
}

export type carrier_info_type = {
    rate_id: string,
    code: string,
    name: string,
    service: {
        code: string,
        name: string,
        delivery_days: number
    }
}

export type shipment_address_type = {
    id: string,
    name: string,
    city: string,
    country: string,
    line1: string,
    line2: string,
    postal_code: string,
    state: string,
    vendorId?: string
    accountId?: string
}

export type estimate_record_type = {
    rate_id: string,
    carrier_id: string,
    shipping_amount: currency_amount_type,
    insurance_amount: currency_amount_type,
    confirmation_amount: currency_amount_type,
    other_amount: currency_amount_type,
    requested_comparison_amount: currency_amount_type,
    rate_details: rate_detail_type[],
    tax_amount: currency_amount_type,
    total_rate: currency_amount_type,
    zone: string,
    package_type: string,
    delivery_days: number,
    guaranteed_service: boolean,
    estimated_delivery_date: string,
    carrier_delivery_days: number,
    ship_date: string,
    negotiated_rate: boolean,
    service_type: string,
    service_code: string,
    trackable: boolean,
    carrier_code: string,
    carrier_nickname: string,
    carrier_friendly_name: string,
    validation_status: string,
    warning_messages: string[],
    error_messages: string[]
}

export type rate_detail_type = {
    rate_detail_type: string
    carrier_description: string,
    carrier_billing_code: string,
    carrier_memo: string,
    amount: currency_amount_type,
    billing_source: string
}

export type packed_box_type = {
  code: string;
  label: string;
  dimensions_cm: { depth: number; width: number; height: number };
  max_weight_kg: number;
  volume: number;
  items: items_with_dimensions[];
  used_volume: number;
  used_weight: number;
}


export type items_with_dimensions = {
  name: string;
  tax_code: string;
  country_of_manufacture: string;
  country_of_origin: string;
  harmonized_tariff_code: { hsCode: string };
  dimensions: { depth: number; width: number; height: number; uom: string };
  weight: { amount: number; uom: string };
} & orderLine_type

export type source_with_boxes_type = {
  [key: string]: packed_box_type[];
}

export interface rate_record_type extends ShipEngineRate {
  total_rate: currency_amount_type;
}

export type carrier_option_type = 
        rate_record_type & {
            boxes: packed_box_type[];
        }

export type label_download_formats_type = {
  pdf?: string;
  png?: string;
  zpl?: string;
};

export type label_package_info_types = {
  package_id: string;
  tracking_number?: string;
  label_download: label_download_formats_type;
  weight?: variant_weight_type;
  dimensions?: variant_dimensions_type;
  sequence?: number;
};

export type label_info_type = {
  label_id: string;
  status?: string;
  tracking_number?: string;
  tracking_status?: string;
  tracking_url?: string;
  shipment_id?: string;
  ship_date?: string; // ISO date string
  created_at?: string; // ISO date string
  is_return_label?: boolean;
  is_international?: boolean;
  carrier_id?: string;
  carrier_code?: string;
  service_code?: string;
  label_format?: string;
  label_layout?: string;
  confirmation?: string;
  shipment_cost?: currency_amount_type;
  insurance_cost?: currency_amount_type;
  rate_details?: rate_detail_type[];
  label_download: label_download_formats_type;
  packages: label_package_info_types[];
  // Auto-refund safety tracking
  paid_at?: string; // ISO timestamp when customer paid for label
  delivered_at?: string; // ISO timestamp when carrier confirmed delivery
  auto_refund_deadline?: string; // ISO timestamp: delivered_at + 7 days
  label_cost_refund_deadline?: string; // ISO timestamp: paid_at + 30 days
  auto_processed?: boolean; // True if refund was auto-processed by cron
  auto_processed_at?: string; // ISO timestamp when auto-processed
  label_cost_refunded?: boolean; // True if label cost was refunded
  label_cost_refunded_at?: string; // ISO timestamp when label cost refunded
};


//#region Messages





export type message_type = {
    id: string,
    posted_by: {
        ref: recordref_type,
        name: string
    }
    posted_by_user: user_type,
    posted_by_vendor: vendor_type,
    text: string,
    ref: recordref_type,
    reply_to: message_type,
    deliver_to?: deliverto_type,
    sentAt: string,
    respondedAt: string
    media?: media_type[]
}

export type deliverto_type = {
    userId: string,
    requiresResponse: boolean,
    responseCode: string
    datetime: string,
    mode: CommunicationModeType
}

//#endregion
//#region Object



//#endregion
//#region Order







export type order_type = {
    id: string
    orderId: string
    docType: string
    code: number
    customerEmail: string,
    customer: user_type,
    forObject: recordref_type
    user?: user_type
    target: string
    ttl?: number | undefined
    lines: orderLine_type[]
    payments: order_payment_type[],
    shipments: shipment_type[],
    credits: order_credit_type[],
    paymentSummary: order_payment_summary_type,
    ref: recordref_type
    stripe?: stripe_details_type
    shipping?: {
        name: string,
        address: string,
        addressComponents: address_details_type
    },
    billing?: {
        name: string,
        address: string,
        addressComponents: address_details_type
    },
    delivery? : {
        name: string,
        address: string,
        addressComponents: address_details_type
    }
    paid_status: string
    discount: number
    createdDate: string
    status?: string
    checkoutLinkExpiresAt?: string
} 

export type order_credit_type = {
    code: string,
    stripe_refundId: string,
    destination: {
        card?: {
            reference: string
        },
        type: "card"
    },
    currency: string,
    amount: number,
    date: string
}

export type order_payment_type = {
  id: string;
  code: string;
  stripe_chargeId: string;
  currency: string;
  charge: {
    subtotal: number;
    application?: {
      components: {
        processing: number;
      };
      actual: number;
    };
    stripe?: {
      estimate: number;
    };
    shipping?: {
      components: {
        subtotal: number;
        tax: number;
        stripe: number;
        currency: string;
      };
      estimate: number;
    };
    tax: number;
    paid: number;
  };
  payout: {
    customer_paid: number;
    application_fees: {
      components: {
        customer: {
          components: {
            processing: number;
          };
          total: number;
        };
        merchant: {
          components: {
            sale: number;
            listing: number;
          };
          total: number;
        };
        tax: number;
      };
      total: number;
    };
    stripe_fees: {
      components: {
        amount: number;
      };
      total: number;
    };
    summary: {
      sale_price_inc_tax: number;
      recieves: number;
      remaining: number;
    };
  };
  card_details: {
    brand: string;
    last4: string;
  };
  method_description: string;
  date: string;
};

export type order_balance_type = {
    subtotal: currency_amount_type
    fees: currency_amount_type
    tax: currency_amount_type
    total: currency_amount_type
    discount: currency_amount_type
    refund: currency_amount_type
}

export type order_payment_summary_type = {
    currency: string,
    due: order_balance_type,
    charged: {
        subtotal: number,
        fees: number,
        tax: number,
        paid: number
    },
    refunded: number,
    payout: order_payout_type
}

export type order_payout_type = {
    subtotal: number
    tax: number
    fees: number
    recieves: number
}

  

export type returnShippingEstimate_type = {
    id: string,
    rate_id: string,
    whoPayShipping: string,
    cost: currency_amount_type,
    boxes: returnShippingBox_type[],
    status: string,
    createdAt: string
}

export type returnShippingBox_type = {
    id: string,
    code: string,
    dimensions_cm: {
        depth: number,
        width: number,
        height: number
    },
    used_weight: number,
    items: any[]
}

export type orderLine_type = {
    id: string
    forObject: recordref_type | "inherit"
    variantId?: string
    item_description: string
    image?: media_type,
    merchantId: string
    merchant: vendor_type
    soldFrom: {
        state: string
        country: string
    },
    descriptor: string
    tax_code: string,
    price: currency_amount_type 
    quantity: number
    subtotal: currency_amount_type,
    tax: currency_amount_type,
    total: currency_amount_type,
    refunded: currency_amount_type,
    price_log: {
        stripe_refundId?: string,
        id: string
        datetime: string
        status: string
        type: "CHARGE" | "PARTIAL_REFUND" | "FULL_REFUND"
        price: currency_amount_type & {
            quantity: number
        },
        tax: currency_amount_type
        paymentId: string
    }[],
    refund_request_log: {
        id: string,
        datetime: string
        refund_quantity: number
        status: string
        reason?: {
            id: string,
            code: string,
            title: string
        },
        returnShippingEstimate?: returnShippingEstimate_type
        evidencePhotos?: media_type[]
        evidenceVideos?: media_type[]
    }[],
    discount: number
    stripe: stripe_details_type
    refund_status: string
    target: string
    description: string
    paid_status_log: {
        datetime: string
        status: 'PENDING' | 'SUCCESS'
        label: string,
        triggeredBy: string
    }[]
    inventory_status?: 'IN_STOCK' | 'BACKORDERED' | 'ALLOCATED';
    backordered_at?: string;
}

export type orderLine_tourBooking_type = orderLine_type & {
    ticketId: string
    sessionRef: recordref_type
}

export type orderLine_caseInvoice_type = orderLine_type & {
    interactionId: string
}

export type orderLine_servicePurchase_type = orderLine_type & {
    serviceId: string
    questionnaireResponses?: {
        questionId: string
        question: string
        answer: string | string[]
    }[]
    selectedAddOns?: string[]
    // Tracks if this service was purchased through a merchant's featured section
    // Used for revenue share calculation in payment processing
    featuringSource?: featuring_source_type
}

export type refund_policy_type = {
    id: string;
    merchantId: string;
    refundPolicy: {
      eligibility: {
        conditions: string[]; // Selected from a predefined list
        customConditions?: string; // Optional free-text input
        exclusions: string[]; // Selected from a predefined list
        customExclusions?: string; // Optional free-text input
      };
      refundTiers: {
        daysFromPurchase: number;
        refundPercentage: number;
      }[];
      refundProcess: {
        requiredInformation: string[];
        daysFromPurchase: number;
      };
      refundMethod: {
        options: ("Original payment method" | "Store credit" | "Bank transfer")[];
        processingTime: string;
      };
      returnPolicy: {
        requiresReturn: boolean;
        returnShippingCost: string;
        conditionRequirements: string;
      };
      partialRefundsOrExchanges: {
        partialRefunds: boolean;
        exchangeAvailable: boolean;
        conditions: string[];
      };
      nonRefundableSituations: string[];
      contact: {
        email: string;
        phone?: string;
      };
      lastUpdated: string;
    };
};  

export type refund_record_type = {
    id: string // Format: "orderId:refund:uniqueId"
    docType: "REFUND"
    orderId: string
    userId: string
    vendorId: string
    amount: number
    currency: string
    reason: string
    status: "ACTIVE" | "ARCHIVED" | "DELETED" // Record lifecycle status for Cosmos archiving
    refund_status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "REVERSED" // Refund workflow status
    requestedAt: string
    decisionAt?: string
    decidedBy?: string
    payments: {
        provider: string
        refundRef?: string
    }
    audit: {
        at: string
        by: string
        action: string
    }[]
    attachments: {
        type: string
        url: string
    }[]
    evidencePhotos?: media_type[]
    evidenceVideos?: media_type[]
    lines?: {
        id: string
        descriptor: string
        price: currency_amount_type
        quantity: number
        refund_quantity: number
        refund_status: string | null
    }[] // Item-level refund details
    returnShippingEstimate?: returnShippingEstimate_type
    returnShippingLabels?: label_info_type[]
    stripe?: stripe_details_type
    createdDate: string
    createdBy: string
    _etag?: string
}

//#endregion
// ============================================
// Personal Space Types - Main Export File
// ============================================
// This file is picked up by the gulp build to generate spiriverse.ts
// It re-exports all types from the types/ subdirectory



//#region PlatformAlert



export type platform_alert_type = {
    id: string
    code: string  // Human-readable code like "ALT-001234"
    alertType: AlertType
    severity: AlertSeverity
    alertStatus: AlertStatus  // NOT 'status' - that's reserved for soft-delete
    title: string
    message: string

    // Affected parties
    customerId?: string
    customerEmail?: string
    merchantId?: string

    // Context - flexible object for different alert types
    context: alert_context_type

    // Source information
    source: alert_source_type

    // Workflow
    assigneeId?: string
    resolutionNotes?: string
    resolvedAt?: string
    dismissedAt?: string

    // Standard fields
    createdDate: string
    updatedDate?: string
    ref: recordref_type
}

export type alert_context_type = {
    orderId?: string
    setupIntentId?: string
    errorMessage?: string
    url?: string
    stackTrace?: string
    userAgent?: string
    additionalData?: Record<string, unknown>
}

export type alert_source_type = {
    component: string     // e.g., "ResolveStripeSuccess"
    environment: string   // e.g., "production", "staging"
    version?: string
}

export const enum AlertType {
    PAYMENT_TIMEOUT = "PAYMENT_TIMEOUT",
    WEBHOOK_FAILURE = "WEBHOOK_FAILURE",
    ORDER_ERROR = "ORDER_ERROR",
    FRONTEND_ERROR = "FRONTEND_ERROR",
    BACKEND_ERROR = "BACKEND_ERROR",
    INTEGRATION_ERROR = "INTEGRATION_ERROR"
}

export const enum AlertSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}

export const enum AlertStatus {
    NEW = "NEW",
    INVESTIGATING = "INVESTIGATING",
    AWAITING_RESPONSE = "AWAITING_RESPONSE",
    RESOLVED = "RESOLVED",
    DISMISSED = "DISMISSED"
}

export type platform_alert_stats_type = {
    total: number
    byStatus: {
        new: number
        investigating: number
        awaitingResponse: number
        resolved: number
        dismissed: number
    }
    bySeverity: {
        low: number
        medium: number
        high: number
        critical: number
    }
}

export type platform_alert_response_type = {
    code: string
    success: boolean
    message: string
    alert?: platform_alert_type
}

export type platform_alerts_response_type = {
    code: string
    success: boolean
    message: string
    alerts: platform_alert_type[]
    totalCount: number
    hasMore: boolean
}

//#endregion



// Practitioner Insights Types
// Stored in Main-PersonalSpace with userId as partition key
// Allows verified practitioners to add insights/tips about crystals

export const PERSONAL_SPACE_CONTAINER = "Main-PersonalSpace";
export const PRACTITIONER_INSIGHT_DOC_TYPE = "PRACTITIONER_INSIGHT";

// Enum for insight types
export type insight_type =
  | "usage_tip"        // How to use the crystal effectively
  | "pairing"          // What crystals work well together
  | "personal_experience" // Personal story or experience
  | "warning"          // Cautions or things to be aware of
  | "alternative_use"; // Non-traditional or creative uses

// Enum for insight moderation status (named to avoid conflict with RecordStatus)
export type insight_status =
  | "pending"   // Awaiting moderation
  | "approved"  // Approved by moderator
  | "flagged"   // Flagged for review
  | "removed";  // Removed by moderator

// Main Practitioner Insight Type
export type practitioner_insight_type = {
  // Identity
  id: string;
  userId: string; // Partition key - the practitioner who created the insight
  docType: "PRACTITIONER_INSIGHT";

  // Crystal Reference
  crystalId: string; // Links to crystal reference database

  // Insight Details
  practitionerId: string; // Same as userId, for clarity in queries
  insightType: insight_type;
  content: string; // The actual insight text

  // Community Engagement
  agreeCount: number; // Number of practitioners who agree
  agreedBy: string[]; // Array of practitioner IDs who agreed

  // Moderation
  insightStatus: insight_status;
  reportCount: number;
  reportedBy?: string[]; // Optional: track who reported (for moderation)
  moderationNotes?: string; // Optional: notes from moderator
  moderatedBy?: string; // ID of moderator who took action
  moderatedAt?: string; // When moderation action was taken

  // Metadata
  ref?: recordref_type;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

// Input type for creating an insight
export type create_practitioner_insight_input = {
  userId: string;
  crystalId: string;
  insightType: insight_type;
  content: string;
};

// Input type for updating an insight
export type update_practitioner_insight_input = {
  id: string;
  userId: string;
  insightType?: insight_type;
  content?: string;
};

// Filter types for queries
export type practitioner_insight_filters = {
  crystalId?: string;
  insightType?: insight_type;
  insightStatus?: insight_status;
  limit?: number;
  offset?: number;
};

// Input for agreeing with an insight
export type agree_with_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
};

// Input for reporting an insight
export type report_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
  reason?: string;
};

// Input for moderating an insight
export type moderate_insight_input = {
  insightId: string;
  insightOwnerId: string; // The userId partition of the insight
  newStatus: insight_status;
  moderationNotes?: string;
};

// Response types
export type practitioner_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
};

export type practitioner_insight_list_response = {
  insights: practitioner_insight_type[];
  totalCount: number;
};

export type agree_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
  alreadyAgreed?: boolean;
};

export type report_insight_response = {
  success: boolean;
  message?: string;
  alreadyReported?: boolean;
};

export type moderate_insight_response = {
  success: boolean;
  message?: string;
  insight?: practitioner_insight_type;
};

//#region Product





// Crystal grade type (moved from crystal-listing)
export type crystal_grade = 'A' | 'AA' | 'AAA' | 'museum' | 'specimen' | 'polished';

// Product type discriminator
export type product_type_discriminator = 'STANDARD' | 'CRYSTAL';

// Crystal-specific type data
export type crystal_type_data = {
    crystalRefId: string;
    crystalRef?: crystal_reference_type; // Resolved from crystalRefId
    crystalForm: crystal_form;
    crystalGrade?: crystal_grade;
    crystalLocality?: string;
    crystalColor?: crystal_color;
};

// Union of all type-specific data
export type product_type_data = {
    crystal?: crystal_type_data;
};

export type product_type = {
    id: string,
    name: string,
    slug?: string,
    description: string,
    vendor: vendor_type,
    ref: recordref_type,
    thumbnail?: thumbnail_type,
    defaultVariantId: string,
    defaultVariant?: variant_type,
    variants: variant_type[],
    offers: offer_type[],
    listingFee?: stripe_details_type,
    is_ooak?: boolean,
    refundRules?: refund_rules_type,
    // Product type discriminator for crystal vs standard products
    productType?: product_type_discriminator,
    typeData?: product_type_data
}

export type variant_type = {
    id: string;
    isDefault?: boolean;
    name: string;
    code?: string;
    description: string;
    countryOfOrigin?: string;
    countryOfManufacture?: string;
    harmonizedTarrifCode?: {
        hsCode: string;
        formattedHsCode: string;
        description: string;
    };
    dimensions: variant_dimensions_type;
    weight: variant_weight_type;
    requireReturnShipping?: boolean;
    properties?: variant_property_type[];
    images: media_type[];
    defaultPrice: currency_amount_type;
    otherPrices?: currency_amount_type[];
    inventory: variant_inventory_type;
};

export type variant_property_type = {
    key: string,
    valueType: string,
    value: string,
    values: string[]
}

export type variant_dimensions_type = {
    height: number,
    width: number,
    depth: number,
    uom: string
}

export type variant_weight_type = {
    amount: number,
    uom: string
}

export type offer_type = {
    id: string,
    variantId: string,
    quantity: number, 
    currency: string,
    price: number
}

export type prerecord_type = {
    id: string,
    title: string,
    type: media_type,
    topic: string,
    datetime: string,
    description: string,
    thumbnail: thumbnail_type,
    fullPrice: currency_amount_type
    rentPrice: currency_amount_type
    media_content: media_type
}

export type preRecord_input_type = {
    id: string,
    title: string,
    type: media_type,
    topic: string,
    datetime: string,
    description: string,
    thumbnail: media_type,
    media_content: media_type,
    name: string
    rating: string,
    fullPrice: currency_amount_type
    rentPrice: currency_amount_type
    currency: string
}

export type variant_inventory_type = {
    variant_id: string;
    product_id: string;
    vendorId: string;
    track_inventory: boolean;
    qty_on_hand: number;
    qty_committed: number;
    low_stock_threshold?: number;
    is_ooak_effective?: boolean;
    location_id: string;
    updated_at: string;
    allow_backorder?: boolean;
    max_backorders?: number; // Max negative qty_on_hand allowed (e.g., 10 means can go to -10)
}

export type inventory_alert_type = {
    id: string;
    variant_id: string;
    product_id: string;
    vendorId: string;
    alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK';
    threshold?: number;
    current_qty: number;
    status: 'OPEN' | 'ACKED' | 'CLOSED';
    created_at: string;
    acknowledged: boolean;
    acknowledged_at?: string;
    acknowledged_by?: string;
    snoozed_until?: string;
}

export type inventory_transaction_type = {
    id: string;
    vendorId: string;
    product_id: string;
    variant_id: string;
    delta: number;
    qty_before: number;
    qty_after: number;
    reason: 'SALE' | 'RETURN' | 'RESTOCK' | 'ADJUSTMENT' | 'GIFTED' | 'DAMAGED' | 'LOST' | 'FOUND' | 'CORRECTION' | 'COMMITMENT' | 'FULFILLMENT' | 'RECEIVED' | 'REFUND';
    source?: 'ORDER' | 'MANUAL' | 'SHIPMENT' | 'DELIVERY';
    reference_id?: string;
    recipient?: string;
    notes?: string;
    created_at: string;
    created_by: string;
}

export type inventory_adjustment_input_type = {
    variant_id: string;
    delta: number;
    reason: 'ADJUSTMENT' | 'GIFTED' | 'DAMAGED' | 'LOST' | 'FOUND' | 'RESTOCK' | 'CORRECTION' | 'COMMITMENT' | 'FULFILLMENT' | 'RECEIVED';
    recipient?: string;
    notes?: string;
}

export type inventory_rule_type = {
    id: string;
    vendorId: string;
    low_stock_threshold_default: number;
    notify_email?: string;
    enabled: boolean;
    snooze_minutes: number;
}

export type stock_report_item_type = {
    product_id: string;
    product_name: string;
    variant_id: string;
    variant_name: string;
    qty_on_hand: number;
    qty_available: number;
    qty_committed: number;
    is_ooak: boolean;
    low_stock_threshold?: number;
    value: currency_amount_type;
    status: string;
}

export type stock_report_type = {
    total_products: number;
    total_variants: number;
    low_stock_items: number;
    out_of_stock_items: number;
    ooak_items: number;
    total_value: currency_amount_type;
    location_id: string;
    generated_at: string;
    items: stock_report_item_type[];
}

export type refund_rules_type = {
    allowAutoReturns?: boolean;
    productCost?: currency_amount_type;
    refundWithoutReturn?: boolean;
    useDefaultAddress?: boolean;
    customAddress?: refund_address_type;
    requirePhoto?: boolean;
    refundTiming?: 'immediate' | 'carrier_scan' | 'delivered' | 'manual';
}

export type refund_address_type = {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
}

//#endregion
//#region Question 




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


// Spread types available for reading requests
export type spread_type = 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD';

// Status of a reading request
export type reading_request_status =
  | 'PENDING_PAYMENT'  // Created, waiting for payment method to be saved
  | 'AWAITING_CLAIM'   // Payment method saved, waiting for a reader to claim
  | 'CLAIMED'          // Reader has claimed it, working on fulfillment
  | 'FULFILLED'        // Reader has completed the reading, payment captured
  | 'CANCELLED'        // User cancelled (refund if paid)
  | 'EXPIRED';         // Not claimed within time limit

// Spread type configuration with pricing
export interface spread_config {
  type: spread_type;
  label: string;
  cardCount: number;
  price: number; // In cents
  description: string;
}

export const SPREAD_CONFIGS: spread_config[] = [
  {
    type: 'SINGLE',
    label: 'Single Card',
    cardCount: 1,
    price: 500, // $5.00
    description: 'Quick guidance on a specific question'
  },
  {
    type: 'THREE_CARD',
    label: 'Three Card',
    cardCount: 3,
    price: 1200, // $12.00
    description: 'Past, Present, Future or Situation, Action, Outcome'
  },
  {
    type: 'FIVE_CARD',
    label: 'Five Card',
    cardCount: 5,
    price: 2000, // $20.00
    description: 'Deeper exploration with multiple perspectives'
  }
];

// Card in a fulfilled reading
export interface reading_card_type {
  name: string;
  reversed: boolean;
  position: string; // e.g., "Past", "Present", "Future", "Card 1", etc.
  interpretation: string;
  symbols?: string[]; // Auto-extracted symbols from card name
}

// Review for a reading
export interface reading_review_type {
  id: string;
  rating: number; // 1-5 stars
  headline: string;
  text: string;
  createdAt: string;
  userId: string;
  userName?: string;
}

// Reading request document
export interface reading_request_type {
  id: string;
  docType: 'READING_REQUEST';

  // Requester info
  userId: string;
  userEmail?: string;
  userName?: string;

  // Request details
  spreadType: spread_type;
  topic: string; // What they want guidance on
  context?: string; // Additional context (optional)

  // Pricing
  price: number; // In cents
  platformFee: number; // Platform cut in cents
  readerPayout: number; // What the reader gets in cents

  // Payment - using setup intent like cart checkout
  stripe?: reading_request_stripe_type;
  stripeCustomerId?: string; // User's Stripe customer ID
  paidAt?: string;

  // Fulfillment
  requestStatus: reading_request_status; // Named to avoid conflict with Cosmos record-level 'status' field
  claimedBy?: string; // Merchant/reader userId
  claimedAt?: string;
  claimDeadline?: string; // Shotclock - reader must fulfill by this time

  // Reading result (when fulfilled)
  photoUrl?: string;
  cards?: reading_card_type[];
  overallMessage?: string; // Reader's overall message/summary
  fulfilledAt?: string;

  // User's review of the reading
  review?: reading_review_type;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // When unclaimed request expires

  // Cosmos
  _id?: string;
  ref?: recordref_type;
}

// Stripe details for payment
export interface reading_request_stripe_type {
  setupIntentId?: string;
  setupIntentSecret?: string;
  paymentMethodId?: string;    // Saved payment method from setup intent
  paymentIntentId?: string;    // Created when merchant claims
  chargeId?: string;           // From successful payment
  connectedAccountId?: string; // Reader's connected account
}

// Input types
export interface create_reading_request_input {
  userId: string;
  spreadType: spread_type;
  topic: string;
  context?: string;
  paymentMethodId?: string; // If provided, use existing saved card instead of creating setup intent
}

export interface claim_reading_request_input {
  requestId: string;
  readerId: string; // Merchant claiming it
}

export interface fulfill_reading_request_input {
  requestId: string;
  readerId: string;
  photoUrl: string;
  cards: reading_card_type[];
  overallMessage?: string;
}

// Response types
export interface reading_request_response {
  success: boolean;
  message?: string;
  readingRequest?: reading_request_type;
  checkoutUrl?: string; // Stripe checkout URL for payment
}

export interface reading_request_list_response {
  success: boolean;
  requests: reading_request_type[];
  total: number;
}

// Review input
export interface review_reading_request_input {
  requestId: string;
  userId: string;
  rating: number;
  headline: string;
  text: string;
}

// Review response
export interface review_reading_request_response {
  success: boolean;
  message?: string;
  review?: reading_review_type;
}

//#region Report 



export type report_type = {
    id: string,
    posted_by: user_type,
    description: string,
    docType: "report"
}

//#endregion
//#region Service



// New enums for async services
export type ServiceCategory = "READING" | "HEALING" | "COACHING"
export type ServiceDeliveryMode = "SYNC" | "ASYNC"
export type ServiceBookingType = "SCHEDULED" | "ASAP" | "PACKAGE"
export type ServiceOrderStatus = "PENDING_PAYMENT" | "PAID" | "IN_PROGRESS" | "DELIVERED" | "CANCELLED" | "REFUNDED"
export type DeliverableFileType = "VIDEO" | "AUDIO" | "DOCUMENT" | "IMAGE"

// Cancellation policy types for SYNC services
export type CancellationPolicyType = "FLEXIBLE" | "MODERATE" | "STRICT" | "CUSTOM"

export type cancellationPolicy_type = {
    type: CancellationPolicyType,
    // Hours before appointment when full refund is available
    fullRefundHours?: number,
    // Hours before appointment when partial refund is available
    partialRefundHours?: number,
    // Percentage of refund for partial refund (0-100)
    partialRefundPercentage?: number,
    // Allow customers to reschedule themselves
    allowRescheduling: boolean,
    // Maximum number of reschedules allowed per booking
    maxReschedules?: number,
    // Minimum hours before appointment to allow rescheduling
    rescheduleBufferHours?: number
}

// Supporting types for new service features
export type servicePackageOption_type = {
    sessionCount: number,
    price: currency_amount_type,
    discountPercentage?: number
}

export type serviceAddOn_type = {
    type: "PRODUCT" | "EXTRA",
    productRef?: recordref_type,
    name: string,
    description: string,
    price?: currency_amount_type,
    isOptional: boolean
}

export type serviceQuestion_type = {
    id: string,
    question: string,
    type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT",
    options?: string[],
    required: boolean,
    placeholder?: string
}

export type servicePricing_type = {
    type: "HOURLY" | "FIXED" | "PACKAGE",
    fixedPrice?: currency_amount_type,
    ratePerHour?: currency_amount_type,
    packageOptions?: servicePackageOption_type[]
}

// Category-specific option types
export type readingServiceOptions_type = {
    readingType?: string,
    includePullCardSummary?: boolean,
    includeVoiceNote?: boolean,
    deckUsed?: string,
    availableTopics?: string,
    astrologyReadingTypes?: string[],
    houseSystem?: string,
    requiresBirthTime?: boolean,
    focusAreas?: string,
    customReadingDetails?: string,
    preReadingQuestions?: pre_reading_question_type[] // Add question builder support
}

export type healingServiceOptions_type = {
    healingType: string,
    sessionLocation?: "IN_PERSON" | "DISTANCE",
    includeEnergyReport?: boolean,
    recommendedCrystals?: string[],
    includeFollowUpReading?: boolean
}

export type coachingServiceOptions_type = {
    sessionFormat: "ONE_ON_ONE" | "GROUP",
    groupSize?: number,
    includeJournalPDF?: boolean,
    includeWorkbook?: boolean,
    includePostSessionNotes?: boolean
}

export type service_type = {
    id: string,
    name: string,
    vendorId: string,
    type: string,
    description: string,
    terms: string,
    faq: faq_type[]
    thumbnail: thumbnail_type
    ref: recordref_type

    // Legacy fields (optional now - for sync services)
    duration?: timespan_type,
    ratePerHour?: currency_amount_type

    // NEW - Async service fields
    category?: ServiceCategory,
    deliveryMode?: ServiceDeliveryMode,
    bookingType?: ServiceBookingType,
    pricing?: servicePricing_type,
    turnaroundDays?: number,
    deliveryFormats?: string[],
    addOns?: serviceAddOn_type[],
    questionnaire?: serviceQuestion_type[],
    targetTimezones?: string[], // Target customer regions/timezones for scheduling optimization

    // Category-specific options
    readingOptions?: readingServiceOptions_type,
    healingOptions?: healingServiceOptions_type,
    coachingOptions?: coachingServiceOptions_type
}

export type scheduleAvailability_type = {
    id: string,
    merchantId: string, 
    name: string, 
    service: service_type
}

export type serviceQuestionResponse_type = {
    questionId: string,
    question: string,
    answer: string | string[]
}

export type deliverableFile_type = {
    id: string,
    url: string,
    signedUrl?: string,
    name: string,
    type: DeliverableFileType,
    mimeType: string,
    size: number,
    uploadedAt: string
}

export type serviceDeliverables_type = {
    files: deliverableFile_type[],
    message?: string,
    deliveredAt?: string
}

export type servicePackageInfo_type = {
    totalSessions: number,
    completedSessions: number,
    remainingSessions: number
}

export type scheduledDateTime_type = {
  date: string
  time: timeRange_type
  practitionerTimezone: string
  customerTimezone?: string
  utcDateTime: string
}

export type serviceBooking_type = {
  id: string
  customerId?: string
  customerEmail?: string                // Customer's email for notifications
  vendorId?: string
  purchaseDate?: string

  // Optional now - only for SCHEDULED bookings
  date?: string
  time?: timeRange_type

  // NEW - Timezone-aware scheduling
  scheduledDateTime?: scheduledDateTime_type

  ref: recordref_type
  service: service_type
  price?: currency_amount_type
  stripe: stripe_details_type

  // NEW - Order status and fulfillment
  // IMPORTANT: Using "orderStatus" instead of "status" to avoid conflict with Cosmos soft-delete
  // The database layer automatically sets status="ACTIVE" for soft-delete functionality
  orderStatus?: ServiceOrderStatus,
  questionnaireResponses?: serviceQuestionResponse_type[],
  deliverables?: serviceDeliverables_type,
  packageInfo?: servicePackageInfo_type,

  // Scheduled booking confirmation flow fields
  confirmationStatus?: BookingConfirmationStatus,
  confirmationDeadline?: string,        // ISO datetime - when practitioner must confirm by
  confirmedDate?: string,               // When practitioner confirmed the booking
  rejectionReason?: string,
  rejectedDate?: string,                // When practitioner rejected the booking
  expiredDate?: string,                 // When booking expired due to no practitioner response
  cancelledDate?: string,               // When booking was cancelled
  cancelledBy?: string,                 // "CUSTOMER" or "PRACTITIONER"
  cancellationReason?: string,          // Reason for cancellation
  meetingLink?: string,
  meetingPasscode?: string,
  stripePaymentIntentId?: string,       // For manual capture
  deliveryMethod?: BookingDeliveryMethod,
  customerAddress?: googleplace_type,   // For MOBILE - practitioner travels to customer
  practitionerAddress?: string,         // Revealed after confirmation for AT_PRACTITIONER
  remindersSent?: bookingReminders_type,
}

export type servicePayment_type = {
    ref: recordref_type,
    service: service_type,
    stripe: stripe_details_type,
    createdDate: string,
    type: string
}

export type serviceSchedule_type = {
    id: string
    merchantId: string
    name: string
    ref: recordref_type
    services: scheduleServiceConfiguration_type[]
    weekdays: scheduleAvailabilityDay_type[]
    country: string
    timezone: string
    dateOverrides: scheduleAvailabilityDateOverride_type[]
}

export type scheduleAvailabilityDay_type = {
    day: string
    day_acronym: string
    enabled: boolean
    times: timeRange_type[]
  }

export  type scheduleAvailabilityDateOverride_type = {
    date: string,
    times: timeRange_type[]
}

export type scheduleServiceConfiguration_type = {
    id: string
    service: service_type
    serviceRef: recordref_type
    location: scheduleServiceConfigurationLocation_type
}
  
export type scheduleServiceConfigurationLocation_type = {
    inPerson: scheduleServiceConfigurationLocationInPerson_type
    onlineMeeting: scheduleServiceConfigurationLocationOnlineMeeting_type
    phoneCall: scheduleServiceConfigurationLocationPhoneCall_type
}
  
export type scheduleServiceConfigurationLocationInPerson_type = {
    place: googleplace_type
    buffer: timespan_type
    surcharge: currency_amount_type
}
  
export type scheduleServiceConfigurationLocationOnlineMeeting_type = {
    meeting_link: string,
    meeting_passcode: string
    buffer: timespan_type
    surcharge: currency_amount_type
}
  
export type scheduleServiceConfigurationLocationPhoneCall_type = {
    phoneNumber: string
    buffer: timespan_type
    surcharge: currency_amount_type
}

export type availableUntil_type = {
    intoTheFuture: timespan_type,
    range: dateToFrom_type
    type: string
}

//#region Practitioner Availability & Live Booking

// Booking confirmation status for scheduled services
export type BookingConfirmationStatus = "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED" | "EXPIRED" | "CANCELLED"

// Delivery method for bookings
export type BookingDeliveryMethod = "ONLINE" | "AT_PRACTITIONER" | "MOBILE"

// Practitioner weekday availability
export type practitionerWeekday_type = {
    day: number                         // 0=Sunday, 6=Saturday
    dayName: string
    enabled: boolean
    timeSlots: { id: string, start: string, end: string, location?: googleplace_type }[]
}

// Date override for specific dates
export type dateOverride_type = {
    date: string                        // ISO date
    type: "BLOCKED" | "CUSTOM"
    timeSlots?: { start: string, end: string, location?: googleplace_type }[]
    reason?: string
}

// Online delivery settings
export type onlineDeliverySettings_type = {
    enabled: boolean
    defaultMeetingLink?: string         // Pre-filled for confirmations
}

// At practitioner location delivery settings
export type atPractitionerDeliverySettings_type = {
    enabled: boolean
    location?: googleplace_type         // Full address stored
    displayArea?: string                // "Brooklyn, NY" - shown before confirmation
}

// Mobile delivery settings (practitioner travels to customer)
export type mobileDeliverySettings_type = {
    enabled: boolean
    serviceRadiusKm?: number            // e.g., 25
    travelSurcharge?: currency_amount_type
    baseLocation?: googleplace_type     // For calculating distance
}

// Delivery methods configuration for schedule
export type deliveryMethodsConfig_type = {
    online: onlineDeliverySettings_type
    atPractitionerLocation: atPractitionerDeliverySettings_type
    mobile: mobileDeliverySettings_type
}

// Practitioner schedule for availability
export type practitionerSchedule_type = {
    id: string                          // Use practitionerId
    practitionerId: string
    timezone: string                    // "America/New_York"
    country: string
    weekdays: practitionerWeekday_type[]
    dateOverrides: dateOverride_type[]
    serviceIds: string[]                // Services using this schedule
    bufferMinutes: number               // Buffer between appointments (default 15)
    advanceBookingDays: number          // How far ahead can book (default 30)
    minimumNoticeHours: number          // Min notice required (default 24)
    deliveryMethods: deliveryMethodsConfig_type
    createdDate?: string
    updatedDate?: string
    ref?: recordref_type
}

// Available slot for customer booking
export type availableSlot_type = {
    start: string                       // ISO time string "09:00"
    end: string                         // ISO time string "10:00"
    startUtc: string                    // UTC datetime
    endUtc: string                      // UTC datetime
}

// Available day with slots for customer
export type availableDay_type = {
    date: string                        // ISO date string
    dayName: string
    slots: availableSlot_type[]
}

// Reminders tracking for booking
export type bookingReminders_type = {
    reminder24hSent?: boolean
    reminder24hSentAt?: string
    reminder1hSent?: boolean
    reminder1hSentAt?: string
}

// Extended booking fields for scheduled services with confirmation flow
export type scheduledBookingFields_type = {
    confirmationStatus: BookingConfirmationStatus
    confirmationDeadline: string        // ISO datetime - when practitioner must confirm by
    rejectionReason?: string
    meetingLink?: string
    meetingPasscode?: string
    stripePaymentIntentId: string       // For manual capture
    deliveryMethod: BookingDeliveryMethod
    customerAddress?: googleplace_type  // For MOBILE - practitioner travels to customer
    practitionerAddress?: string        // Revealed after confirmation for AT_PRACTITIONER
    remindersSent?: bookingReminders_type
}

//#endregion

//#endregion

//#region SocialPost



export type socialpost_type = {
    id: string,
    type: "text-only" | "media-only",
    vendorId: string,
    customerId: string,
    title?: string,
    description: string,
    availableAfter: string,
    media?: media_type[],
    hashtags: string[]
    ref: recordref_type,
    content: {
        mainText?: {
            content: string,
            format: textFormat_type
        } | undefined,
        subText?: {
            content: string,
            format: textFormat_type
        } | undefined
    }
}

//#endregion
//#region User








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
//#region Vendor







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
  orderId?: string,
  stripeSubscriptionId?: string,
  payment_retry_count: number,
  payment_status: merchant_subscription_payment_status,
  card_status: merchant_card_status,
  last_payment_date: Date,
  plans: plan_type[],
  // Deferred subscription model fields
  first_payout_received?: boolean,  // After first payout, payouts are blocked until card added
  payouts_blocked?: boolean,        // True when waiting for card to be added
  // Self-managed billing fields
  next_billing_date?: string,       // ISO date of next charge
  billing_interval?: billing_interval,
  billing_history?: billing_record_type[],
  saved_payment_method?: string     // Stripe PaymentMethod ID
}

export type plan_type =  {
  productId: string
  variantId: string
  priceId?: string  // Stripe Price ID for subscription creation
  price: currency_amount_type
  name: string
}

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
    yearly = "yearly"
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
//#region Wishlist





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
// types/shipengine.ts

// #region Events
export interface ShipEngineEvent<T = unknown> {
  resource_url: string;
  resource_type: string;
  data: T;
}
// #endregion

// #region Shared Primitives
export interface ShipEngineAmount {
  currency: string;
  amount: number;
}

export interface ShipEngineWeight {
  value: number;
  unit: string;
}

export interface ShipEngineDimensions {
  unit: string;
  length: number;
  width: number;
  height: number;
}

export interface ShipEngineLabelMessages {
  reference1: string | null;
  reference2: string | null;
  reference3: string | null;
}
// #endregion

// #region Address & Package
export interface ShipEngineAddress {
  geolocation: any | null;
  instructions: string | null;
  name: string;
  phone: string;
  email: string | null;
  company_name: string;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator: string;
}

export interface ShipEngineShipmentPackage {
  shipment_package_id: string;
  package_id: string;
  package_code: string;
  package_name: string;
  weight: ShipEngineWeight;
  dimensions: ShipEngineDimensions;
  insured_value: ShipEngineAmount;
  label_messages: ShipEngineLabelMessages;
  external_package_id: string | null;
  content_description: string | null;
  products: any | null;
}
// #endregion

// #region Rate & RateResponse
export interface ShipEngineRateDetail {
  rate_detail_type: string;
  carrier_description: string;
  carrier_billing_code: string;
  carrier_memo: string | null;
  amount: ShipEngineAmount;
  billing_source: string;
}

export interface ShipEngineRate {
  rate_id: string;
  rate_type: string;
  carrier_id: string;
  shipping_amount: ShipEngineAmount;
  insurance_amount: ShipEngineAmount;
  confirmation_amount: ShipEngineAmount;
  other_amount: ShipEngineAmount;
  tax_amount: ShipEngineAmount;
  requested_comparison_amount: ShipEngineAmount;
  rate_details: ShipEngineRateDetail[];
  zone: string | null;
  package_type: string | null;
  delivery_days: number | null;
  guaranteed_service: boolean;
  estimated_delivery_date: string | null;
  carrier_delivery_days: number | null;
  ship_date: string;
  negotiated_rate: boolean;
  service_type: string;
  service_code: string;
  trackable: boolean;
  carrier_code: string;
  carrier_nickname: string;
  carrier_friendly_name: string;
  validation_status: string;
  warning_messages: string[];
  error_messages: string[];
}

export interface ShipEngineRateResponse {
  rates: ShipEngineRate[];
  invalid_rates: any[];
  rate_request_id: string;
  shipment_id: string;
  created_at: string;
  status: string;
  errors: any[];
}

export interface ShipEngineRateResponseWrapper {
  rate_response: ShipEngineRateResponse;
  shipment_id: string;
  carrier_id: string;
  service_code: string | null;
  requested_shipment_service: string | null;
  external_shipment_id: string | null;
  shipment_number: string | null;
  hold_until_date: string | null;
  ship_date: string;
  ship_by_date: string | null;
  created_at: string;
  modified_at: string;
  shipment_status: string;
  ship_to: ShipEngineAddress;
  ship_from: ShipEngineAddress;
  warehouse_id: string | null;
  return_to: ShipEngineAddress;
  is_return: boolean;
  confirmation: string;
  customs: any | null;
  external_order_id: string | null;
  order_source_code: string | null;
  advanced_options: ShipEngineAdvancedOptions;
  comparison_rate_type: string | null;
  retail_rate: any | null;
  shipping_rule_id: string | null;
  insurance_provider: string;
  tags: string[];
  store_id: string;
  packages: ShipEngineShipmentPackage[];
  total_weight: ShipEngineWeight;
  items: any[];
  notes_from_buyer: string | null;
  notes_for_gift: string | null;
  is_gift: boolean;
  assigned_user: string | null;
  amount_paid: number | null;
  shipping_paid: number | null;
  tax_paid: number | null;
  zone: string | null;
}
// #endregion

// #region Tracking
export interface ShipEngineTrackingEvent {
  occurred_at: string;
  carrier_occurred_at: string;
  description: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  company_name: string;
  signer: string;
  event_code: string;
  event_description: string;
  carrier_detail_code: string | null;
  status_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ShipEngineTrackingUpdate {
  tracking_number: string;
  status_code: string;
  status_description: string;
  carrier_status_code: string | null;
  carrier_status_description: string | null;
  ship_date: string;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  exception_description: string | null;
  events: ShipEngineTrackingEvent[];
}
// #endregion

// #region Advanced Options
export interface ShipEngineAdvancedOptions {
  bill_to_account: string | null;
  bill_to_country_code: string | null;
  bill_to_party: string | null;
  bill_to_postal_code: string | null;
  contains_alcohol: boolean;
  delivered_duty_paid: boolean;
  non_machinable: boolean;
  saturday_delivery: boolean;
  dry_ice: boolean;
  dry_ice_weight: ShipEngineWeight | null;
  fedex_freight: any | null;
  third_party_consignee: boolean;
  ancillary_endorsements_option: string | null;
  freight_class: string | null;
  custom_field1: string | null;
  custom_field2: string | null;
  custom_field3: string | null;
  collect_on_delivery: any | null;
  return_pickup_attempts: number | null;
  additional_handling: boolean;
  own_document_upload: boolean;
  limited_quantity: boolean;
  event_notification: boolean;
}
// #endregion

// #region Input Types
export interface ShipEngineInputAddress {
  name: string;
  phone: string;
  company_name: string;
  address_line1: string;
  address_line2?: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: 'yes' | 'no';
}

export interface ShipEngineInputPackage {
  package_code: string;
  items: {
    harmonized_tariff_code: string;
    country_of_manufacture: string;
    country_of_origin: string;
    quantity: number;
    description: string;
    value: {
      amount: number;
      currency: string;
    };
  }[];
  weight: {
    value: number;
    unit: string;
  };
  dimensions?: {
    unit: string;
    length: number;
    width: number;
    height: number;
  };
}
// #endregion


// Import shared zodiac_sign from crystal-reference (no re-export to avoid duplicates)


// ============================================
// Astrology Types
// ============================================

// Celestial bodies calculated in the chart
export type celestial_body =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'chiron'
  | 'northnode'
  | 'ascendant'
  | 'midheaven';

// Major aspects
export type aspect_type =
  | 'conjunction'   // 0°
  | 'sextile'       // 60°
  | 'square'        // 90°
  | 'trine'         // 120°
  | 'opposition';   // 180°

// Birth time precision
export type birth_time_precision =
  | 'exact'           // User knows exact time
  | 'approximate'     // User knows approximate range
  | 'unknown';        // User doesn't know time

// Approximate time ranges
export type approximate_time_range =
  | 'morning'      // 6am - 12pm, midpoint 9am
  | 'afternoon'    // 12pm - 6pm, midpoint 3pm
  | 'evening'      // 6pm - 12am, midpoint 9pm
  | 'night';       // 12am - 6am, midpoint 3am

// ============================================
// Birth Location
// ============================================

export interface birth_location_type {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;      // IANA timezone e.g. "Australia/Melbourne"
  note?: string;         // Optional note e.g. "Born in small town near..."
}

// ============================================
// Planetary Position
// ============================================

export interface planet_position_type {
  body: celestial_body;
  sign: zodiac_sign;
  degree: number;           // 0-29.99 within sign
  absoluteDegree: number;   // 0-359.99 in zodiac
  house?: number;           // 1-12, only if birth time known
  retrograde: boolean;
}

// ============================================
// House Cusp
// ============================================

export interface house_cusp_type {
  house: number;          // 1-12
  sign: zodiac_sign;
  degree: number;         // Degree within sign
}

// ============================================
// Aspect
// ============================================

export interface aspect_data_type {
  body1: celestial_body;
  body2: celestial_body;
  aspect: aspect_type;
  orb: number;            // How far from exact (in degrees)
  applying: boolean;      // Is the aspect applying or separating
}

// ============================================
// Birth Chart (Main Document)
// ============================================

export interface birth_chart_type {
  id: string;
  userId: string;
  docType: 'BIRTH_CHART';

  // Birth data (user input)
  birthDate: string;                           // ISO date "1985-03-15"
  birthTimePrecision: birth_time_precision;
  birthTime?: string;                          // "14:30" if exact
  birthTimeApproximate?: approximate_time_range; // if approximate
  birthLocation: birth_location_type;

  // Calculated chart data
  calculatedAt: string;
  planets: planet_position_type[];
  houses?: house_cusp_type[];                  // Only if birth time known/approximate
  aspects: aspect_data_type[];

  // Convenience fields for quick display
  sunSign: zodiac_sign;
  moonSign: zodiac_sign;
  risingSign?: zodiac_sign;                    // Only if birth time known

  // Flags
  housesAreApproximate?: boolean;              // True if using approximate birth time
  moonMayBeInaccurate?: boolean;               // True if moon changed signs that day

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// City Search Result
// ============================================

export interface city_search_result_type {
  id: string;            // Unique ID for the city
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  adminRegion?: string;  // State/province
}

// ============================================
// Input Types
// ============================================

export interface birth_location_input {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  note?: string;
}

export interface create_birth_chart_input {
  userId: string;
  birthDate: string;
  birthTimePrecision: birth_time_precision;
  birthTime?: string;
  birthTimeApproximate?: approximate_time_range;
  birthLocation: birth_location_input;
}

export interface update_birth_chart_input {
  id: string;
  userId: string;
  birthDate?: string;
  birthTimePrecision?: birth_time_precision;
  birthTime?: string;
  birthTimeApproximate?: approximate_time_range;
  birthLocation?: birth_location_input;
}

// ============================================
// Response Types
// ============================================

export interface birth_chart_response {
  success: boolean;
  message?: string;
  birthChart?: birth_chart_type;
}

export interface city_search_response {
  cities: city_search_result_type[];
}

// ============================================
// Transit Types
// ============================================

// Moon phases
export type moon_phase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

// Transit planet position (current sky position)
export interface transit_position_type {
  body: celestial_body;
  sign: zodiac_sign;
  degree: number;           // 0-29.99 within sign
  absoluteDegree: number;   // 0-359.99 in zodiac
  retrograde: boolean;
  speed?: number;           // Degrees per day (for calculating ingress)
}

// Aspect between a transit planet and a natal planet
export interface transit_to_natal_aspect_type {
  transitPlanet: celestial_body;
  transitSign: zodiac_sign;
  transitDegree: number;
  natalPlanet: celestial_body;
  natalSign: zodiac_sign;
  natalDegree: number;
  aspect: aspect_type;
  orb: number;
  applying: boolean;        // Is the aspect getting tighter?
  exactDate?: string;       // When the aspect becomes exact (if applying)
  isActive: boolean;        // Within active orb threshold
}

// Moon phase information
export interface moon_phase_info_type {
  phase: moon_phase;
  phaseName: string;        // Human readable name
  illumination: number;     // 0-100 percentage
  sign: zodiac_sign;
  degree: number;
  nextPhase: moon_phase;
  nextPhaseDate: string;
}

// Full transit response (for today's transits)
export interface current_transits_type {
  calculatedAt: string;
  calculatedFor: string;    // Date transits were calculated for

  // Current planetary positions
  planets: transit_position_type[];

  // Moon phase
  moonPhase: moon_phase_info_type;

  // Transits to natal chart (only if birth chart exists)
  transitsToNatal?: transit_to_natal_aspect_type[];

  // Active transits (within tight orb - 3° applying, 1° separating)
  activeTransits?: transit_to_natal_aspect_type[];

  // Upcoming transits (aspects perfecting in next 7 days)
  upcomingTransits?: upcoming_transit_type[];

  // General transits (planet-to-planet in the sky)
  generalTransits?: transit_to_transit_aspect_type[];
}

// Upcoming transit prediction
export interface upcoming_transit_type {
  transitPlanet: celestial_body;
  natalPlanet: celestial_body;
  aspect: aspect_type;
  exactDate: string;
  orb: number;
  daysUntilExact: number;
  description?: string;
}

// Transit planet to transit planet aspects (current sky)
export interface transit_to_transit_aspect_type {
  planet1: celestial_body;
  planet1Sign: zodiac_sign;
  planet2: celestial_body;
  planet2Sign: zodiac_sign;
  aspect: aspect_type;
  orb: number;
  applying: boolean;
  exactDate?: string;
}

// Input for getting transits (optional date override)
export interface get_transits_input {
  userId?: string;          // If provided, compares to user's natal chart
  date?: string;            // ISO date, defaults to today
  timezone?: string;        // IANA timezone for calculations
  latitude?: number;        // For local moon calculations
  longitude?: number;
}

// Response type
export interface transits_response {
  success: boolean;
  message?: string;
  transits?: current_transits_type;
  hasBirthChart: boolean;   // Whether we have a birth chart to compare against
}

// ============================================
// Astrology Journal Types
// ============================================

// Mood options for journal entries
export type journal_mood =
  | 'heavy'
  | 'energised'
  | 'reflective'
  | 'anxious'
  | 'peaceful'
  | 'confused';

// Snapshot of active transit at time of entry
export interface transit_snapshot_aspect {
  transitingBody: celestial_body;
  natalBody: celestial_body;
  aspect: aspect_type;
  orb: number;
}

// Transit snapshot captured at time of journal entry
export interface transit_snapshot_type {
  moonSign: zodiac_sign;
  moonPhase: moon_phase;
  moonPhaseName: string;
  activeTransits: transit_snapshot_aspect[];
  retrogradePlanets: celestial_body[];
  capturedAt: string;
}

// Astrology journal entry
export interface astrology_journal_entry_type {
  id: string;
  userId: string;
  docType: 'ASTROLOGY_JOURNAL_ENTRY';

  // Auto-populated transit context
  transitSnapshot: transit_snapshot_type;

  // User input
  promptShown?: string;           // The prompt displayed, if any
  promptDismissed: boolean;       // Whether user dismissed the prompt
  content: string;                // Main journal text

  // Optional tags
  planetaryThemes: celestial_body[];  // User-selected planets
  mood?: journal_mood;

  // Linking
  linkedReadingId?: string;       // If reflecting on a specific reading

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: {
    id: string;
    partition: string[];
    container: string;
  };
}

// Input for creating a journal entry
export interface create_astrology_journal_input {
  userId: string;
  content: string;
  promptShown?: string;
  promptDismissed?: boolean;
  planetaryThemes?: celestial_body[];
  mood?: journal_mood;
  linkedReadingId?: string;
}

// Input for updating a journal entry
export interface update_astrology_journal_input {
  id: string;
  userId: string;
  content?: string;
  planetaryThemes?: celestial_body[];
  mood?: journal_mood;
  linkedReadingId?: string;
}

// Filters for querying journal entries
export interface astrology_journal_filters {
  startDate?: string;
  endDate?: string;
  planetaryThemes?: celestial_body[];  // Filter by tagged planets
  mood?: journal_mood;
  hasLinkedReading?: boolean;
  duringRetrograde?: celestial_body;   // e.g., 'mercury' for Mercury retrograde entries
  moonSign?: zodiac_sign;
  moonPhase?: moon_phase;
  limit?: number;
  offset?: number;
}

// Response type
export interface astrology_journal_response {
  success: boolean;
  message?: string;
  entry?: astrology_journal_entry_type;
}

// Prompt data
export interface journal_prompt_type {
  id: string;
  category: 'moon_sign' | 'planetary_transit' | 'retrograde' | 'general';
  triggerBody?: celestial_body;
  triggerSign?: zodiac_sign;
  prompt: string;
}




// ============================================
// Crystals & Stones Types (Personal Space Specific)
// ============================================

// Acquisition source types (unique to personal space)
export type crystal_acquisition_source =
  | 'SPIRIVERSE'      // Bought from SpiriVerse marketplace
  | 'ONLINE_SHOP'     // Other online shops
  | 'LOCAL_SHOP'      // Local crystal/metaphysical shop
  | 'FAIR_SHOW'       // Crystal fair, gem show, market
  | 'GIFT'            // Received as gift
  | 'FOUND'           // Found in nature
  | 'INHERITED'       // Family heirloom
  | 'TRADE'           // Traded with another collector
  | 'OTHER';

// ============================================
// Crystal Collection Item (Core)
// ============================================

export interface crystal_collection_item_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_COLLECTION';

  // Required fields
  name: string;              // "Amethyst", "Clear Quartz", etc.
  crystalRefId?: string;     // Link to crystal reference database
  addedDate: string;         // When added to collection

  // Physical properties
  color?: crystal_color;
  form?: crystal_form;
  size?: string;             // "Small", "Medium", "Large" or dimensions
  weight?: number;           // Weight in grams
  origin?: string;           // Country/region of origin if known

  // Metaphysical properties
  primaryPurpose?: string;   // Main use: "protection", "love", "clarity"
  chakras?: chakra_type[];   // Associated chakras
  elements?: string[];       // Fire, Water, Air, Earth, Spirit
  zodiacSigns?: string[];    // Astrological associations

  // Personal relationship
  nickname?: string;         // Personal name for this crystal
  personalMeaning?: string;  // What this crystal means to you
  specialBond?: boolean;     // Is this a go-to crystal?
  energyNotes?: string;      // How its energy feels to you

  // Acquisition info (embedded for quick reference)
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;     // Vendor name, person's name, location
  acquiredDate?: string;     // When acquired
  purchasePrice?: number;
  currency?: string;

  // Status
  isActive: boolean;         // Still in collection (vs gifted/lost)
  location?: string;         // Where it's stored: "altar", "bedroom", "office"

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Wishlist Item (Core)
// ============================================

export interface crystal_wishlist_item_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_WISHLIST';

  // Required
  name: string;              // Crystal name
  crystalRefId?: string;     // Link to crystal reference database
  addedDate: string;

  // Preferences
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;

  // Why do you want it?
  purpose?: string;          // "healing", "collection", "gift"
  reason?: string;           // Personal reason for wanting it

  // Marketplace integration
  alertEnabled?: boolean;    // Notify when available on SpiriVerse
  priority?: number;         // 1 (must have) to 5 (nice to have)

  // Status
  isAcquired: boolean;       // Found and bought it?
  acquiredDate?: string;
  collectionItemId?: string; // Link to collection item if acquired

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Companion Log (Core)
// ============================================

// Daily crystal companion - what crystal is with you today?
export interface crystal_companion_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_COMPANION';

  // Required
  date: string;              // ISO date (YYYY-MM-DD)
  crystalId?: string;        // Reference to collection item (optional)
  crystalName: string;       // Name of crystal (in case not in collection)

  // Context
  reason?: string;           // Why this crystal today?
  intention?: string;        // Intention set with the crystal
  location?: string;         // "pocket", "necklace", "desk", "altar"

  // Reflection (can be added later)
  howItFelt?: string;        // How the day went with this crystal
  effectivenessScore?: number; // 1-5 how effective it felt
  willContinue?: boolean;    // Will you carry it tomorrow?

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Cleansing Log (Progressive - unlocks after 5 crystals)
// ============================================

export interface crystal_cleansing_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_CLEANSING';

  // Required
  date: string;
  crystalIds?: string[];     // Which crystals were cleansed
  crystalNames: string[];    // Names (for display without lookup)

  // Cleansing details
  method: cleansing_method;
  methodDetails?: string;    // e.g., "Full moon", "White sage", "Tibetan bowl"
  duration?: number;         // Duration in minutes
  moonPhase?: string;        // If lunar cleansing

  // Charging (often done together)
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;        // Intention set during charging

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Grid (Progressive - unlocks after 10 crystals)
// ============================================

export interface grid_crystal_placement {
  position: string;          // "center", "inner-1", "outer-3", etc.
  crystalId?: string;        // Reference to collection item
  crystalName: string;
  role?: string;             // "focus stone", "way stones", "desire stones"
}

export interface crystal_grid_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_GRID';

  // Required
  name: string;              // Grid name
  createdDate: string;
  purpose: string;           // Main intention/purpose

  // Grid configuration
  gridShape?: string;        // "flower of life", "seed of life", "metatron", "custom"
  crystals: grid_crystal_placement[];

  // Activation
  activatedDate?: string;
  deactivatedDate?: string;  // When grid was taken down
  isActive: boolean;

  // Tracking
  duration?: string;         // How long grid was active
  outcome?: string;          // What happened / did it work?
  effectivenessScore?: number; // 1-5

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Input/Response Types
// ============================================

// Collection inputs
export interface create_crystal_collection_input {
  userId: string;
  name: string;
  crystalRefId?: string;     // Link to crystal reference database
  addedDate?: string;
  color?: crystal_color;
  form?: crystal_form;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras?: chakra_type[];
  elements?: string[];
  zodiacSigns?: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond?: boolean;
  energyNotes?: string;
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  location?: string;
  photoUrl?: string;
}

export interface update_crystal_collection_input {
  id: string;
  userId: string;
  name?: string;
  crystalRefId?: string;     // Link to crystal reference database
  color?: crystal_color;
  form?: crystal_form;
  size?: string;
  weight?: number;
  origin?: string;
  primaryPurpose?: string;
  chakras?: chakra_type[];
  elements?: string[];
  zodiacSigns?: string[];
  nickname?: string;
  personalMeaning?: string;
  specialBond?: boolean;
  energyNotes?: string;
  acquisitionSource?: crystal_acquisition_source;
  acquiredFrom?: string;
  acquiredDate?: string;
  purchasePrice?: number;
  currency?: string;
  isActive?: boolean;
  location?: string;
  photoUrl?: string;
}

// Wishlist inputs
export interface create_crystal_wishlist_input {
  userId: string;
  name: string;
  crystalRefId?: string;     // Link to crystal reference database
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled?: boolean;
  priority?: number;
}

export interface update_crystal_wishlist_input {
  id: string;
  userId: string;
  name?: string;
  crystalRefId?: string;     // Link to crystal reference database
  preferredForm?: crystal_form;
  preferredSize?: string;
  preferredOrigin?: string;
  maxBudget?: number;
  currency?: string;
  purpose?: string;
  reason?: string;
  alertEnabled?: boolean;
  priority?: number;
  isAcquired?: boolean;
  acquiredDate?: string;
  collectionItemId?: string;
}

// Companion log inputs
export interface create_crystal_companion_input {
  userId: string;
  date?: string;
  crystalId?: string;
  crystalName: string;
  reason?: string;
  intention?: string;
  location?: string;
}

export interface update_crystal_companion_input {
  id: string;
  userId: string;
  crystalId?: string;
  crystalName?: string;
  reason?: string;
  intention?: string;
  location?: string;
  howItFelt?: string;
  effectivenessScore?: number;
  willContinue?: boolean;
}

// Cleansing log inputs
export interface create_crystal_cleansing_input {
  userId: string;
  date?: string;
  crystalIds?: string[];
  crystalNames: string[];
  method: cleansing_method;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
  photoUrl?: string;
}

export interface update_crystal_cleansing_input {
  id: string;
  userId: string;
  crystalIds?: string[];
  crystalNames?: string[];
  method?: cleansing_method;
  methodDetails?: string;
  duration?: number;
  moonPhase?: string;
  didCharge?: boolean;
  chargingMethod?: charging_method;
  chargingDetails?: string;
  intention?: string;
  notes?: string;
  photoUrl?: string;
}

// Grid inputs
export interface create_crystal_grid_input {
  userId: string;
  name: string;
  createdDate?: string;
  purpose: string;
  gridShape?: string;
  crystals: grid_crystal_placement[];
  notes?: string;
  photoUrl?: string;
}

export interface update_crystal_grid_input {
  id: string;
  userId: string;
  name?: string;
  purpose?: string;
  gridShape?: string;
  crystals?: grid_crystal_placement[];
  activatedDate?: string;
  deactivatedDate?: string;
  isActive?: boolean;
  duration?: string;
  outcome?: string;
  effectivenessScore?: number;
  notes?: string;
  photoUrl?: string;
}

// Response types
export interface crystal_collection_response {
  success: boolean;
  message?: string;
  crystal?: crystal_collection_item_type;
}

export interface crystal_wishlist_response {
  success: boolean;
  message?: string;
  wishlistItem?: crystal_wishlist_item_type;
}

export interface crystal_companion_response {
  success: boolean;
  message?: string;
  companionLog?: crystal_companion_log_type;
}

export interface crystal_cleansing_response {
  success: boolean;
  message?: string;
  cleansingLog?: crystal_cleansing_log_type;
}

export interface crystal_grid_response {
  success: boolean;
  message?: string;
  grid?: crystal_grid_type;
}

export interface delete_crystal_response {
  success: boolean;
  message?: string;
}

// Filter types
export interface crystal_collection_filters {
  color?: crystal_color;
  form?: crystal_form;
  chakra?: chakra_type;
  isActive?: boolean;
  specialBond?: boolean;
  search?: string;          // Search by name/nickname
  limit?: number;
  offset?: number;
}

export interface crystal_wishlist_filters {
  priority?: number;
  isAcquired?: boolean;
  alertEnabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface crystal_companion_filters {
  startDate?: string;
  endDate?: string;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface crystal_cleansing_filters {
  startDate?: string;
  endDate?: string;
  method?: cleansing_method;
  crystalId?: string;
  limit?: number;
  offset?: number;
}

export interface crystal_grid_filters {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Charging Reminder (Progressive - after enabling moon notifications)
// ============================================

export interface charging_reminder_type {
  id: string;
  userId: string;
  docType: 'CHARGING_REMINDER';

  // Which crystals to remind about
  crystalIds?: string[];
  crystalNames: string[];

  // Reminder settings
  reminderType: 'full_moon' | 'new_moon' | 'custom';
  customDate?: string;           // For custom reminders
  isRecurring: boolean;
  recurringInterval?: string;    // "monthly", "weekly"

  // Notification preferences
  notifyBefore?: number;         // Hours before event
  notificationMethod?: 'push' | 'email' | 'both';

  // Status
  isActive: boolean;
  lastTriggered?: string;
  nextTrigger?: string;

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Acquisition Journal (Progressive - prompt after each new collection entry)
// ============================================

export interface acquisition_journal_type {
  id: string;
  userId: string;
  docType: 'ACQUISITION_JOURNAL';

  // Link to collection item
  crystalId: string;
  crystalName: string;

  // The story
  date: string;                  // Acquisition date
  story?: string;                // The full story of how you found it
  circumstances?: string;        // What led you to this crystal?
  initialFeeling?: string;       // How it felt when you first held it
  calledToYou?: boolean;         // Did you feel called to it?

  // Vendor/Source details (expanded from collection item)
  vendorName?: string;
  vendorContact?: string;
  vendorWebsite?: string;
  eventName?: string;            // If from a fair/show
  eventLocation?: string;

  // Photos
  photoUrls?: string[];          // Multiple photos of the acquisition

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Pairing Notes (Progressive - after first grid logged)
// ============================================

export interface crystal_pairing_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_PAIRING';

  // The pairing
  crystal1Id?: string;
  crystal1Name: string;
  crystal2Id?: string;
  crystal2Name: string;

  // How they work together
  pairingPurpose: string;        // What you use this pairing for
  synergy?: string;              // How their energies combine
  effectivenessScore?: number;   // 1-5 how well they work together
  discovered?: string;           // How you discovered this pairing

  // Context
  bestUsedFor?: string[];        // Situations where this pairing shines
  avoidWhen?: string[];          // When not to use together
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Shop/Fair Log (Progressive - after first acquisition with vendor tagged)
// ============================================

export interface crystal_shop_log_type {
  id: string;
  userId: string;
  docType: 'CRYSTAL_SHOP_LOG';

  // Vendor info
  vendorName: string;
  vendorType: 'online_shop' | 'local_shop' | 'fair_booth' | 'market_stall' | 'private_seller';

  // Contact & location
  website?: string;
  socialMedia?: string;          // Instagram, etc.
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;

  // For fairs/shows
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;

  // Your experience
  visitDate?: string;
  rating?: number;               // 1-5
  specialties?: string[];        // What they're known for
  priceRange?: string;           // "budget", "mid", "premium"
  notes?: string;
  wouldRecommend?: boolean;
  wouldReturn?: boolean;

  // Purchases from this vendor
  purchaseCount?: number;
  totalSpent?: number;
  currency?: string;

  // Photos
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Crystal Statistics Types
// ============================================

export interface crystal_stats {
  // Collection overview
  totalCrystals: number;
  activeCrystals: number;
  inactiveCrystals: number;

  // By category
  colorDistribution: { color: string; count: number; percentage: number }[];
  formDistribution: { form: string; count: number; percentage: number }[];
  chakraDistribution: { chakra: string; count: number }[];

  // Special
  specialBondCount: number;
  recentlyAdded: crystal_collection_item_type[];

  // Activity
  companionStreak: number;   // Days in a row with a companion crystal
  totalCleansingsSessions: number;
  activeGrids: number;

  // Wishlist
  wishlistCount: number;
  acquiredFromWishlist: number;
}




// ============================================
// Dream Journal Types
// ============================================

// Dream mood/emotion
export type dream_mood =
  | 'peaceful'
  | 'joyful'
  | 'anxious'
  | 'fearful'
  | 'confused'
  | 'sad'
  | 'excited'
  | 'neutral'
  | 'mysterious'
  | 'empowered';

// Dream clarity level
export type dream_clarity =
  | 'vivid'      // Very clear, detailed memory
  | 'clear'      // Good recall
  | 'moderate'   // Some details remembered
  | 'hazy'       // Fragmented/unclear
  | 'minimal';   // Barely remembered

// Dream type/category
export type dream_type =
  | 'normal'
  | 'lucid'
  | 'recurring'
  | 'nightmare'
  | 'prophetic'
  | 'visitation'
  | 'flying'
  | 'falling'
  | 'spiritual';

// Dream Journal entry document type
export interface dream_journal_type {
  id: string;
  userId: string;
  docType: 'DREAM_JOURNAL';

  // Required fields
  date: string;          // ISO date string (YYYY-MM-DD)
  title: string;         // Brief title for the dream
  content: string;       // Main dream description/narrative

  // Categorization
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;

  // Analysis fields
  themes?: string[];     // Tags/themes (e.g., "water", "flying", "family")
  symbols: symbol_tag[]; // Enhanced symbol tags (shared with readings)
  interpretation?: string; // Personal interpretation
  emotions?: string[];   // Emotions felt during/after dream

  // Context
  sleepQuality?: number; // 1-5 scale
  wakeTime?: string;     // Time woke up (HH:mm)
  photoUrl?: string;     // Optional dream sketch/image

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Input types
export interface create_dream_input {
  userId: string;
  date?: string;         // Defaults to today if not provided
  title: string;
  content: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;
  themes?: string[];
  symbols?: symbol_tag_input[];  // Enhanced symbol input
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
}

export interface update_dream_input {
  id: string;
  userId: string;
  title?: string;
  content?: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  clarity?: dream_clarity;
  isLucid?: boolean;
  themes?: string[];
  symbols?: symbol_tag_input[];  // Enhanced symbol input
  interpretation?: string;
  emotions?: string[];
  sleepQuality?: number;
  wakeTime?: string;
  photoUrl?: string;
}

// Response types
export interface dream_response {
  success: boolean;
  message?: string;
  dream?: dream_journal_type;
}

export interface delete_dream_response {
  success: boolean;
  message?: string;
}

// Filter types for dream queries
export interface dream_filters {
  startDate?: string;
  endDate?: string;
  dreamType?: dream_type;
  mood?: dream_mood;
  isLucid?: boolean;
  theme?: string;        // Search for specific theme
  limit?: number;
  offset?: number;
}




// ============================================
// Energy Healing Types
// ============================================

// Chakra status for check-ins
export type chakra_status =
  | 'open'
  | 'balanced'
  | 'overactive'
  | 'blocked'
  | 'weak'
  | 'unclear';

// Energy work modality types
export type energy_modality =
  | 'reiki'
  | 'pranic_healing'
  | 'quantum_touch'
  | 'theta_healing'
  | 'healing_touch'
  | 'chakra_balancing'
  | 'aura_cleansing'
  | 'crystal_healing'
  | 'sound_healing'
  | 'breathwork'
  | 'grounding'
  | 'shielding'
  | 'cord_cutting'
  | 'entity_clearing'
  | 'space_clearing'
  | 'distance_healing'
  | 'self_healing'
  | 'other';

// Energy journal entry types
export type energy_entry_type =
  | 'meditation'
  | 'clearing'
  | 'grounding'
  | 'session_given'
  | 'session_received'
  | 'self_practice'
  | 'attunement'
  | 'protection_ritual'
  | 'observation';

// Session role - practitioner or recipient
export type session_role = 'practitioner' | 'recipient';

// ============================================
// Energy Journal Entry (Core - day one)
// ============================================

export interface energy_journal_type {
  id: string;
  userId: string;
  docType: 'ENERGY_JOURNAL';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  entryType: energy_entry_type;
  title?: string;            // Optional title for the entry

  // Session details (if applicable)
  modality?: energy_modality;
  duration?: number;         // Duration in minutes
  role?: session_role;       // For session entries

  // For sessions received - link to booking
  bookingId?: string;        // SpiriVerse booking reference
  practitionerName?: string;
  practitionerId?: string;

  // For sessions given
  clientInitials?: string;   // Privacy - just initials
  sessionNotes?: string;     // Private practitioner notes

  // Experience
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;      // 1-10 scale
  sensations?: string[];     // Physical/energetic sensations felt
  insights?: string;         // Insights or messages received

  // Techniques used
  techniquesUsed?: string[];
  toolsUsed?: string[];      // Crystals, singing bowl, etc.

  // General notes
  notes?: string;
  intention?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Chakra Check-In (Core - day one)
// ============================================

export interface chakra_state {
  chakra: chakra_type;
  status: chakra_status;
  notes?: string;            // Specific observations
}

export interface chakra_checkin_type {
  id: string;
  userId: string;
  docType: 'CHAKRA_CHECKIN';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  checkInTime?: string;      // HH:mm - morning, evening check-in

  // Chakra states - quick tap assessment
  chakras: chakra_state[];

  // Overall assessment
  overallBalance?: number;   // 1-10 scale
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;

  // Context
  physicalState?: string;    // How body feels
  emotionalState?: string;   // Emotional state
  mentalState?: string;      // Mental clarity

  // Notes
  observations?: string;
  actionTaken?: string;      // What did you do to balance?

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Session Reflection (Core - day one)
// ============================================

// Reflection on a healing session received
export interface session_reflection_type {
  id: string;
  userId: string;
  docType: 'SESSION_REFLECTION';

  // Required fields
  date: string;              // Session date
  practitionerName: string;

  // Session info
  modality?: energy_modality;
  sessionType?: string;      // "In-person", "Distance", "Group"
  duration?: number;         // Minutes

  // SpiriVerse integration
  bookingId?: string;        // Link to SpiriVerse booking
  practitionerId?: string;   // Link to practitioner

  // Experience
  preSessionState?: string;  // How you felt before
  duringSession?: string;    // What you experienced
  postSessionState?: string; // How you felt after
  sensations?: string[];     // Physical/energetic sensations

  // Healing areas
  areasWorkedOn?: string[];  // Chakras, body areas, issues
  messagesReceived?: string; // Any messages/insights from practitioner

  // Follow-up
  aftercare?: string;        // Practitioner recommendations
  personalNotes?: string;    // Private notes
  wouldRecommend?: boolean;
  overallRating?: number;    // 1-5

  // Tracking
  shiftsNoticed?: string;    // Changes noticed after session
  followUpDate?: string;     // Next session date

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Attunement Tracker (Progressive)
// ============================================

// Reiki levels and other attunement systems
export type attunement_level =
  | 'reiki_1'
  | 'reiki_2'
  | 'reiki_3'
  | 'reiki_master'
  | 'karuna_1'
  | 'karuna_2'
  | 'karuna_master'
  | 'seichem'
  | 'kundalini_reiki'
  | 'other';

export interface attunement_record_type {
  id: string;
  userId: string;
  docType: 'ATTUNEMENT_RECORD';

  // Required fields
  date: string;              // Attunement date
  level: attunement_level;
  system: string;            // "Usui Reiki", "Karuna Reiki", etc.

  // Teacher info
  teacherName: string;
  teacherId?: string;        // SpiriVerse practitioner if applicable
  lineage?: string;          // Reiki lineage if known

  // Details
  location?: string;         // Where it took place
  format?: string;           // "In-person", "Distance"
  duration?: string;         // Course duration

  // Experience
  experience?: string;       // What you experienced
  symbols?: string[];        // Symbols received (if applicable)
  insights?: string;

  // Certificate
  certificateUrl?: string;
  certificateNumber?: string;

  // Practice since
  practiceNotes?: string;    // How practice has evolved since
  hoursLogged?: number;      // Practice hours since attunement

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Protection Ritual Log (Progressive)
// ============================================

export type protection_type =
  | 'shielding'
  | 'grounding'
  | 'cord_cutting'
  | 'space_clearing'
  | 'aura_sealing'
  | 'psychic_protection'
  | 'entity_clearing'
  | 'boundary_setting'
  | 'other';

export interface protection_ritual_type {
  id: string;
  userId: string;
  docType: 'PROTECTION_RITUAL';

  // Required fields
  date: string;
  protectionType: protection_type;

  // Details
  technique?: string;        // Specific technique used
  duration?: number;         // Minutes
  reason?: string;           // Why this protection was needed
  location?: string;         // Where performed

  // Tools used
  toolsUsed?: string[];      // Crystals, salt, sage, etc.
  invocations?: string[];    // Guides/angels/deities called

  // Experience
  sensations?: string;       // What you felt
  effectiveness?: number;    // 1-5 how effective
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Aura Observation (Progressive)
// ============================================

export type aura_color =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'white'
  | 'gold'
  | 'silver'
  | 'pink'
  | 'brown'
  | 'gray'
  | 'black'
  | 'rainbow'
  | 'other';

export type aura_layer =
  | 'physical'      // Etheric
  | 'emotional'     // Astral
  | 'mental'        // Lower mental
  | 'astral'        // Higher astral
  | 'etheric_template'
  | 'celestial'
  | 'causal';       // Ketheric template

export interface aura_layer_observation {
  layer?: aura_layer;
  colors: aura_color[];
  intensity?: number;        // 1-5
  notes?: string;
}

export interface aura_observation_type {
  id: string;
  userId: string;
  docType: 'AURA_OBSERVATION';

  // Required fields
  date: string;
  observationType: 'self' | 'other';

  // For other observations
  subjectInitials?: string;  // Privacy

  // Observation
  primaryColors: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation[];

  // Assessment
  overallHealth?: number;    // 1-10
  clarity?: number;          // 1-5 how clear the aura appeared
  size?: string;             // "compact", "normal", "expanded"

  // Observations
  patterns?: string;         // Any patterns noticed
  anomalies?: string;        // Dark spots, tears, etc.
  messages?: string;         // Intuitive messages received

  // Method
  observationMethod?: string; // "meditation", "peripheral vision", "photo"
  photoUrl?: string;

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Energy Healing Input Types
// ============================================

// Energy Journal inputs
export interface create_energy_journal_input {
  userId: string;
  date?: string;
  entryType: energy_entry_type;
  title?: string;
  modality?: energy_modality;
  duration?: number;
  role?: session_role;
  bookingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  sensations?: string[];
  insights?: string;
  techniquesUsed?: string[];
  toolsUsed?: string[];
  notes?: string;
  intention?: string;
  photoUrl?: string;
}

export interface update_energy_journal_input {
  id: string;
  userId: string;
  entryType?: energy_entry_type;
  title?: string;
  modality?: energy_modality;
  duration?: number;
  role?: session_role;
  bookingId?: string;
  practitionerName?: string;
  practitionerId?: string;
  clientInitials?: string;
  sessionNotes?: string;
  preSessionFeeling?: string;
  postSessionFeeling?: string;
  energyLevel?: number;
  sensations?: string[];
  insights?: string;
  techniquesUsed?: string[];
  toolsUsed?: string[];
  notes?: string;
  intention?: string;
  photoUrl?: string;
}

// Chakra Check-In inputs
export interface chakra_state_input {
  chakra: chakra_type;
  status: chakra_status;
  notes?: string;
}

export interface create_chakra_checkin_input {
  userId: string;
  date?: string;
  checkInTime?: string;
  chakras: chakra_state_input[];
  overallBalance?: number;
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

export interface update_chakra_checkin_input {
  id: string;
  userId: string;
  checkInTime?: string;
  chakras?: chakra_state_input[];
  overallBalance?: number;
  dominantChakra?: chakra_type;
  weakestChakra?: chakra_type;
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  observations?: string;
  actionTaken?: string;
}

// Session Reflection inputs
export interface create_session_reflection_input {
  userId: string;
  date?: string;
  practitionerName: string;
  modality?: energy_modality;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
}

export interface update_session_reflection_input {
  id: string;
  userId: string;
  practitionerName?: string;
  modality?: energy_modality;
  sessionType?: string;
  duration?: number;
  bookingId?: string;
  practitionerId?: string;
  preSessionState?: string;
  duringSession?: string;
  postSessionState?: string;
  sensations?: string[];
  areasWorkedOn?: string[];
  messagesReceived?: string;
  aftercare?: string;
  personalNotes?: string;
  wouldRecommend?: boolean;
  overallRating?: number;
  shiftsNoticed?: string;
  followUpDate?: string;
  photoUrl?: string;
}

// Attunement inputs
export interface create_attunement_input {
  userId: string;
  date?: string;
  level: attunement_level;
  system: string;
  teacherName: string;
  teacherId?: string;
  lineage?: string;
  location?: string;
  format?: string;
  duration?: string;
  experience?: string;
  symbols?: string[];
  insights?: string;
  certificateUrl?: string;
  certificateNumber?: string;
  practiceNotes?: string;
  hoursLogged?: number;
}

export interface update_attunement_input {
  id: string;
  userId: string;
  level?: attunement_level;
  system?: string;
  teacherName?: string;
  teacherId?: string;
  lineage?: string;
  location?: string;
  format?: string;
  duration?: string;
  experience?: string;
  symbols?: string[];
  insights?: string;
  certificateUrl?: string;
  certificateNumber?: string;
  practiceNotes?: string;
  hoursLogged?: number;
}

// Protection Ritual inputs
export interface create_protection_ritual_input {
  userId: string;
  date?: string;
  protectionType: protection_type;
  technique?: string;
  duration?: number;
  reason?: string;
  location?: string;
  toolsUsed?: string[];
  invocations?: string[];
  sensations?: string;
  effectiveness?: number;
  notes?: string;
}

export interface update_protection_ritual_input {
  id: string;
  userId: string;
  protectionType?: protection_type;
  technique?: string;
  duration?: number;
  reason?: string;
  location?: string;
  toolsUsed?: string[];
  invocations?: string[];
  sensations?: string;
  effectiveness?: number;
  notes?: string;
}

// Aura Observation inputs
export interface aura_layer_observation_input {
  layer?: aura_layer;
  colors: aura_color[];
  intensity?: number;
  notes?: string;
}

export interface create_aura_observation_input {
  userId: string;
  date?: string;
  observationType: 'self' | 'other';
  subjectInitials?: string;
  primaryColors: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation_input[];
  overallHealth?: number;
  clarity?: number;
  size?: string;
  patterns?: string;
  anomalies?: string;
  messages?: string;
  observationMethod?: string;
  photoUrl?: string;
  notes?: string;
}

export interface update_aura_observation_input {
  id: string;
  userId: string;
  observationType?: 'self' | 'other';
  subjectInitials?: string;
  primaryColors?: aura_color[];
  secondaryColors?: aura_color[];
  layers?: aura_layer_observation_input[];
  overallHealth?: number;
  clarity?: number;
  size?: string;
  patterns?: string;
  anomalies?: string;
  messages?: string;
  observationMethod?: string;
  photoUrl?: string;
  notes?: string;
}

// ============================================
// Energy Healing Response Types
// ============================================

export interface energy_journal_response {
  success: boolean;
  message?: string;
  entry?: energy_journal_type;
}

export interface chakra_checkin_response {
  success: boolean;
  message?: string;
  checkin?: chakra_checkin_type;
}

export interface session_reflection_response {
  success: boolean;
  message?: string;
  reflection?: session_reflection_type;
}

export interface attunement_response {
  success: boolean;
  message?: string;
  attunement?: attunement_record_type;
}

export interface protection_ritual_response {
  success: boolean;
  message?: string;
  ritual?: protection_ritual_type;
}

export interface aura_observation_response {
  success: boolean;
  message?: string;
  observation?: aura_observation_type;
}

export interface delete_energy_response {
  success: boolean;
  message?: string;
}

// ============================================
// Energy Healing Filter Types
// ============================================

export interface energy_journal_filters {
  startDate?: string;
  endDate?: string;
  entryType?: energy_entry_type;
  modality?: energy_modality;
  role?: session_role;
  limit?: number;
  offset?: number;
}

export interface chakra_checkin_filters {
  startDate?: string;
  endDate?: string;
  chakra?: chakra_type;       // Filter by specific chakra
  status?: chakra_status;     // Filter by status
  limit?: number;
  offset?: number;
}

export interface session_reflection_filters {
  startDate?: string;
  endDate?: string;
  modality?: energy_modality;
  practitionerId?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export interface attunement_filters {
  system?: string;
  level?: attunement_level;
  limit?: number;
  offset?: number;
}

export interface protection_ritual_filters {
  startDate?: string;
  endDate?: string;
  protectionType?: protection_type;
  limit?: number;
  offset?: number;
}

export interface aura_observation_filters {
  startDate?: string;
  endDate?: string;
  observationType?: 'self' | 'other';
  primaryColor?: aura_color;
  limit?: number;
  offset?: number;
}

// ============================================
// Energy Healing Statistics
// ============================================

export interface chakra_trend {
  chakra: chakra_type;
  recentStatus: chakra_status;
  blockedCount: number;       // Times blocked in period
  openCount: number;          // Times open in period
  trend: 'improving' | 'declining' | 'stable';
}

export interface energy_stats {
  // Journal overview
  totalJournalEntries: number;
  entriesThisWeek: number;
  entriesThisMonth: number;

  // Entry type breakdown
  entryTypeBreakdown: { type: energy_entry_type; count: number }[];

  // Sessions
  sessionsGiven: number;
  sessionsReceived: number;

  // Chakra health
  chakraCheckinsCount: number;
  chakraTrends: chakra_trend[];
  mostBlockedChakra?: chakra_type;
  mostOpenChakra?: chakra_type;

  // Practice
  totalPracticeMinutes: number;
  averageSessionLength: number;
  practiceStreak: number;     // Consecutive days

  // Attunements
  attunementCount: number;
  highestLevel?: attunement_level;

  // Protection
  protectionRitualCount: number;

  // Aura
  auraObservationCount: number;
}



// ============================================
// Prayer & Faith Types
// ============================================
// Help people of faith deepen their walk with God,
// track their prayer life and spiritual growth

// Prayer types/categories
export type prayer_type =
  | 'praise'
  | 'thanksgiving'
  | 'petition'
  | 'intercession'
  | 'confession'
  | 'meditation'
  | 'contemplation'
  | 'devotional';

// Prayer status for tracking answered prayers
export type prayer_status =
  | 'active'
  | 'answered'
  | 'answered_differently'
  | 'waiting'
  | 'ongoing';

// Scripture book categories
export type scripture_book_type =
  | 'old_testament'
  | 'new_testament'
  | 'psalms'
  | 'proverbs'
  | 'gospels'
  | 'epistles'
  | 'prophets'
  | 'wisdom'
  | 'other';

// ============================================
// Prayer Journal Entry (Core)
// ============================================

export interface prayer_journal_type {
  id: string;
  userId: string;
  docType: 'PRAYER_JOURNAL';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  title?: string;            // Optional title for the prayer

  // Prayer details
  prayerType: prayer_type;
  content: string;           // The prayer text
  status?: prayer_status;    // For petition/intercession tracking

  // For intercession prayers
  prayingFor?: string;       // Who/what you're praying for (e.g., "Mom's health")

  // Requests and gratitude (can be combined)
  requests?: string[];       // Specific prayer requests
  gratitude?: string[];      // Things you're grateful for

  // Scripture integration
  scriptureReference?: string; // e.g., "Psalm 23:1-4"
  scriptureText?: string;     // The verse text

  // Reflection
  insights?: string;         // What God revealed during prayer
  feelingBefore?: string;    // How you felt before praying
  feelingAfter?: string;     // How you felt after praying

  // For answered prayers
  answeredDate?: string;     // When prayer was answered
  answerDescription?: string; // How it was answered

  // Tags for organization
  tags?: string[];           // Custom tags

  // Privacy
  isPrivate?: boolean;       // Default true - personal prayer life

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Scripture Reflection (Core)
// ============================================

export interface scripture_reflection_type {
  id: string;
  userId: string;
  docType: 'SCRIPTURE_REFLECTION';

  // Required fields
  date: string;              // ISO date (YYYY-MM-DD)
  reference: string;         // e.g., "John 3:16" or "Psalm 23:1-6"

  // Scripture details
  book?: string;             // Book name
  chapter?: number;          // Chapter number
  verseStart?: number;       // Starting verse
  verseEnd?: number;         // Ending verse (if range)
  bookType?: scripture_book_type;

  // The text
  text?: string;             // The scripture text itself

  // Reflection
  whatSpokeToMe: string;     // What stood out/spoke to you
  personalApplication?: string; // How to apply it to life
  questions?: string[];      // Questions that arose
  crossReferences?: string[]; // Related scriptures

  // Context
  readingContext?: string;   // "Morning devotional", "Bible study", etc.
  version?: string;          // Bible version (NIV, KJV, ESV, etc.)

  // Response
  prayerResponse?: string;   // Prayer in response to scripture

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Daily Passage (Core - Easy Daily Habit)
// ============================================
// A passage is served to the user, they reflect on it

export interface daily_passage_type {
  id: string;
  userId: string;
  docType: 'DAILY_PASSAGE';

  // The passage served
  date: string;              // ISO date (YYYY-MM-DD)
  reference: string;         // e.g., "John 3:16-17"
  text: string;              // The scripture text
  book?: string;             // Book name
  chapter?: number;          // Chapter number
  verseStart?: number;       // Starting verse
  verseEnd?: number;         // Ending verse
  version?: string;          // Bible version (NIV, ESV, etc.)

  // User's reflection (optional - just reflecting is the habit)
  reflection?: string;       // What this passage means to them
  prayerResponse?: string;   // Prayer in response
  personalApplication?: string; // How to apply it

  // Engagement tracking
  isRead: boolean;           // Did they read it?
  readAt?: string;           // When they read it
  isReflected: boolean;      // Did they add a reflection?
  reflectedAt?: string;      // When they reflected

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Prayer & Faith Input Types
// ============================================

// Prayer Journal inputs
export interface create_prayer_journal_input {
  userId: string;
  date?: string;
  title?: string;
  prayerType: prayer_type;
  content: string;
  status?: prayer_status;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface update_prayer_journal_input {
  id: string;
  userId: string;
  title?: string;
  prayerType?: prayer_type;
  content?: string;
  status?: prayer_status;
  prayingFor?: string;
  requests?: string[];
  gratitude?: string[];
  scriptureReference?: string;
  scriptureText?: string;
  insights?: string;
  feelingBefore?: string;
  feelingAfter?: string;
  answeredDate?: string;
  answerDescription?: string;
  tags?: string[];
  isPrivate?: boolean;
}

// Scripture Reflection inputs
export interface create_scripture_reflection_input {
  userId: string;
  date?: string;
  reference: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: scripture_book_type;
  text?: string;
  whatSpokeToMe: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

export interface update_scripture_reflection_input {
  id: string;
  userId: string;
  reference?: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  bookType?: scripture_book_type;
  text?: string;
  whatSpokeToMe?: string;
  personalApplication?: string;
  questions?: string[];
  crossReferences?: string[];
  readingContext?: string;
  version?: string;
  prayerResponse?: string;
}

// Daily Passage inputs
export interface reflect_on_passage_input {
  id: string;
  userId: string;
  reflection?: string;
  prayerResponse?: string;
  personalApplication?: string;
}

export interface mark_passage_read_input {
  id: string;
  userId: string;
}

// ============================================
// Prayer & Faith Response Types
// ============================================

export interface prayer_journal_response {
  success: boolean;
  message?: string;
  prayer?: prayer_journal_type;
}

export interface scripture_reflection_response {
  success: boolean;
  message?: string;
  reflection?: scripture_reflection_type;
}

export interface daily_passage_response {
  success: boolean;
  message?: string;
  passage?: daily_passage_type;
}

export interface delete_faith_response {
  success: boolean;
  message?: string;
}

// ============================================
// Prayer & Faith Filter Types
// ============================================

export interface prayer_journal_filters {
  startDate?: string;
  endDate?: string;
  prayerType?: prayer_type;
  status?: prayer_status;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface scripture_reflection_filters {
  startDate?: string;
  endDate?: string;
  book?: string;
  bookType?: scripture_book_type;
  limit?: number;
  offset?: number;
}

export interface daily_passage_filters {
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
  isReflected?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Prayer & Faith Statistics
// ============================================

export interface faith_stats {
  // Daily Passage
  dailyPassageStreak: number;     // Consecutive days reading
  totalPassagesRead: number;
  totalPassagesReflected: number;
  passagesThisWeek: number;

  // Prayer Journal
  totalPrayers: number;
  prayersThisWeek: number;
  prayersThisMonth: number;
  prayerTypeBreakdown: { type: prayer_type; count: number }[];
  answeredPrayersCount: number;
  waitingPrayersCount: number;
  activePrayersCount: number;
  prayerStreak: number;           // Consecutive days praying

  // Scripture Reflections (own reading)
  totalScriptureReflections: number;
  reflectionsThisWeek: number;

  // Common themes
  commonTags: { tag: string; count: number }[];
  favoriteBooks: { book: string; count: number }[];
}



// ============================================
// Meditation Journal Types
// ============================================

// Meditation technique types
export type meditation_technique =
  | 'mindfulness'
  | 'breathing'
  | 'guided'
  | 'mantra'
  | 'visualization'
  | 'body_scan'
  | 'loving_kindness'
  | 'transcendental'
  | 'walking'
  | 'chakra'
  | 'sound'
  | 'other';

// Post-meditation mood/state
export type meditation_mood =
  | 'peaceful'
  | 'calm'
  | 'refreshed'
  | 'energized'
  | 'grounded'
  | 'clear'
  | 'relaxed'
  | 'sleepy'
  | 'restless'
  | 'neutral';

// Meditation Journal entry document type
export interface meditation_journal_type {
  id: string;
  userId: string;
  docType: 'MEDITATION_JOURNAL';

  // Required fields
  date: string;          // ISO date string (YYYY-MM-DD)
  duration: number;      // Duration in minutes

  // Session details
  technique?: meditation_technique;
  guidedBy?: string;     // Name of guide/app if guided meditation
  focus?: string;        // What was the focus (e.g., "breath", "chakra", "intention")

  // Experience
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;        // 1-5 how deep was the meditation
  distractionLevel?: number; // 1-5 how distracted were you

  // Insights
  insights?: string;     // Any insights or realizations
  experiences?: string;  // Notable experiences (visions, sensations, etc.)
  intentions?: string;   // Intentions set during meditation
  gratitude?: string[];  // Things grateful for

  // Context
  location?: string;     // Where did you meditate
  posture?: string;      // Seated, lying, walking, etc.
  photoUrl?: string;     // Optional photo of space/setup

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Input types
export interface create_meditation_input {
  userId: string;
  date?: string;         // Defaults to today if not provided
  duration: number;
  technique?: meditation_technique;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
}

export interface update_meditation_input {
  id: string;
  userId: string;
  duration?: number;
  technique?: meditation_technique;
  guidedBy?: string;
  focus?: string;
  preSessionMood?: meditation_mood;
  postSessionMood?: meditation_mood;
  depth?: number;
  distractionLevel?: number;
  insights?: string;
  experiences?: string;
  intentions?: string;
  gratitude?: string[];
  location?: string;
  posture?: string;
  photoUrl?: string;
}

// Response types
export interface meditation_response {
  success: boolean;
  message?: string;
  meditation?: meditation_journal_type;
}

export interface delete_meditation_response {
  success: boolean;
  message?: string;
}

// Filter types for meditation queries
export interface meditation_filters {
  startDate?: string;
  endDate?: string;
  technique?: meditation_technique;
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
}

// Meditation Statistics
export interface meditation_stats {
  totalSessions: number;
  totalMinutes: number;
  averageDuration: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTime: string | null;
  favoriteTechnique: string | null;
}




// ============================================
// Mediumship Types
// ============================================

// Message source - who/what delivered the message
export type spirit_source =
  | 'guide'           // Spirit guide
  | 'loved_one'       // Deceased loved one
  | 'angel'           // Angelic being
  | 'ancestor'        // Ancestral spirit
  | 'higher_self'     // Higher self
  | 'unknown'         // Unknown source
  | 'collective'      // Collective consciousness
  | 'nature_spirit'   // Elemental/nature spirit
  | 'other';

// Method of receiving message
export type reception_method =
  | 'clairvoyance'    // Seeing
  | 'clairaudience'   // Hearing
  | 'clairsentience'  // Feeling
  | 'claircognizance' // Knowing
  | 'dreams'          // Dream visitation
  | 'meditation'      // During meditation
  | 'automatic_writing'
  | 'pendulum'
  | 'cards'           // Oracle/tarot
  | 'signs'           // Signs and synchronicities
  | 'other';

// ============================================
// Synchronicity Log (Core - day one, after 7 days active)
// ============================================

export interface synchronicity_type {
  id: string;
  userId: string;
  docType: 'SYNCHRONICITY';

  // Required
  date: string;
  title: string;               // Brief title
  description: string;         // What happened

  // Details
  time?: string;               // Time of occurrence
  location?: string;           // Where it happened
  witnesses?: string;          // Was anyone else there?

  // Interpretation
  possibleMeaning?: string;    // What you think it means
  relatedTo?: string;          // What situation/question it relates to
  confirmedMeaning?: string;   // What it turned out to mean (add later)

  // Patterns
  recurringTheme?: boolean;    // Is this part of a pattern?
  relatedSynchronicities?: string[]; // IDs of related entries
  symbols?: symbol_tag[];      // Symbols present

  // Rating
  significanceScore?: number;  // 1-5 how significant it felt

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Spirit Messages (Progressive - after first Reading Reflection entry)
// ============================================

export interface spirit_message_type {
  id: string;
  userId: string;
  docType: 'SPIRIT_MESSAGE';

  // Required
  date: string;
  messageContent: string;      // The actual message received

  // Source
  source: spirit_source;
  sourceName?: string;         // Name if known (e.g., "Grandma Rose")
  sourceDescription?: string;  // Description of how they appeared/felt

  // Reception
  receptionMethod: reception_method;
  receptionContext?: string;   // What were you doing when received?
  clarity?: number;            // 1-5 how clear was the message

  // Validation
  evidentialDetails?: string;  // Details that could be verified
  validated?: boolean;         // Was the message validated?
  validationNotes?: string;    // How it was validated

  // Interpretation
  interpretation?: string;     // Your interpretation
  actionTaken?: string;        // What you did with the message
  outcome?: string;            // What happened after

  // Emotions
  emotionsDuring?: string[];   // How you felt receiving it
  emotionsAfter?: string[];    // How you felt after

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Symbol Dictionary (Progressive - after 5 dream entries)
// ============================================

// Personal symbol meaning - built from dreams and readings
export interface personal_symbol_type {
  id: string;
  userId: string;
  docType: 'PERSONAL_SYMBOL';

  // Symbol info
  symbolName: string;          // "Water", "Snake", "Red car"
  normalizedName: string;      // Lowercase for matching
  category?: string;           // "animal", "element", "object", etc.

  // Meanings
  personalMeaning: string;     // What this symbol means to YOU
  contextualMeanings?: {       // Different meanings in different contexts
    context: string;
    meaning: string;
  }[];

  // Tracking
  firstEncountered: string;    // Date first seen
  lastEncountered: string;     // Date last seen
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  synchronicityOccurrences: number;

  // Examples
  notableExamples?: {
    entryType: 'dream' | 'reading' | 'synchronicity' | 'message';
    entryId: string;
    date: string;
    snippet: string;           // Brief excerpt
  }[];

  // Evolution
  meaningEvolution?: {         // How meaning has changed over time
    date: string;
    previousMeaning: string;
    newMeaning: string;
    reason?: string;
  }[];

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Loved Ones in Spirit (Progressive - optional prompt around holidays)
// ============================================

export interface loved_one_in_spirit_type {
  id: string;
  userId: string;
  docType: 'LOVED_ONE_SPIRIT';

  // Who they are
  name: string;
  relationship: string;        // "Grandmother", "Father", "Friend"
  nickname?: string;           // What you called them

  // Life details
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string; // Brief, if comfortable sharing

  // Connection
  personalMemory?: string;     // A cherished memory
  theirPersonality?: string;   // What they were like
  sharedInterests?: string[];  // Things you did together
  lessonsLearned?: string;     // What they taught you

  // Signs they send
  commonSigns?: string[];      // Signs you associate with them
  signExplanations?: {         // Why these signs
    sign: string;
    reason: string;
  }[];

  // Communication
  messageHistory?: {           // Messages received from them
    date: string;
    messageId?: string;        // Link to spirit_message
    summary: string;
  }[];

  // Anniversaries & remembrance
  importantDates?: {           // Dates to remember
    date: string;
    occasion: string;          // "Birthday", "Passing anniversary", "Wedding"
    reminderEnabled?: boolean;
  }[];

  // Media
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Development Exercises (Progressive - after 30 days, they're committed)
// ============================================

export type exercise_type =
  | 'meditation'
  | 'visualization'
  | 'psychometry'      // Reading objects
  | 'remote_viewing'
  | 'aura_reading'
  | 'symbol_work'
  | 'automatic_writing'
  | 'pendulum'
  | 'card_practice'
  | 'sitting_in_power'
  | 'other';

export type exercise_difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface development_exercise_type {
  id: string;
  userId: string;
  docType: 'DEVELOPMENT_EXERCISE';

  // Exercise info
  date: string;
  exerciseType: exercise_type;
  exerciseName: string;        // Specific exercise name
  source?: string;             // Book, course, teacher who taught it
  difficulty?: exercise_difficulty;

  // Practice details
  duration?: number;           // Minutes
  environment?: string;        // Where you practiced
  preparation?: string;        // How you prepared

  // Results
  results?: string;            // What happened
  accuracy?: number;           // 1-5 if verifiable
  hits?: string[];             // Correct impressions
  misses?: string[];           // Incorrect impressions

  // Learning
  insights?: string;           // What you learned
  challengesFaced?: string;    // Difficulties encountered
  improvements?: string;       // What you'd do differently

  // Progress tracking
  confidenceLevel?: number;    // 1-5 confidence with this exercise
  willRepeat?: boolean;        // Will you do this again?
  nextSteps?: string;          // What to work on next

  // Notes
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Reading Reflection (Core - for mediums who get readings)
// ============================================

export interface reading_reflection_type {
  id: string;
  userId: string;
  docType: 'READING_REFLECTION';

  // Required
  date: string;
  readerName: string;

  // Reading details
  readingType?: string;        // "Mediumship", "Psychic", "Tarot"
  format?: string;             // "In-person", "Phone", "Video", "Text"
  duration?: number;           // Minutes
  bookingId?: string;          // SpiriVerse booking if applicable
  readerId?: string;           // SpiriVerse reader if applicable

  // Content
  mainMessages?: string;       // Key messages received
  evidentialInfo?: string;     // Evidence provided (for mediumship)
  predictions?: string;        // Any predictions made
  guidance?: string;           // Guidance given

  // Validation
  accuracyScore?: number;      // 1-5 how accurate
  resonatedWith?: string[];    // What resonated
  didntResonate?: string[];    // What didn't resonate
  validatedLater?: string;     // Things validated after the reading

  // Personal
  emotionalImpact?: string;    // How it affected you
  actionsTaken?: string;       // What you did with the information
  overallRating?: number;      // 1-5

  // Notes
  notes?: string;
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// ============================================
// Mediumship Input Types
// ============================================

// Synchronicity inputs
export interface create_synchronicity_input {
  userId: string;
  date?: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: symbol_tag_input[];
  significanceScore?: number;
  photoUrl?: string;
}

export interface update_synchronicity_input {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  time?: string;
  location?: string;
  witnesses?: string;
  possibleMeaning?: string;
  relatedTo?: string;
  confirmedMeaning?: string;
  recurringTheme?: boolean;
  relatedSynchronicities?: string[];
  symbols?: symbol_tag_input[];
  significanceScore?: number;
  photoUrl?: string;
}

// Spirit Message inputs
export interface create_spirit_message_input {
  userId: string;
  date?: string;
  messageContent: string;
  source: spirit_source;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod: reception_method;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  interpretation?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

export interface update_spirit_message_input {
  id: string;
  userId: string;
  messageContent?: string;
  source?: spirit_source;
  sourceName?: string;
  sourceDescription?: string;
  receptionMethod?: reception_method;
  receptionContext?: string;
  clarity?: number;
  evidentialDetails?: string;
  validated?: boolean;
  validationNotes?: string;
  interpretation?: string;
  actionTaken?: string;
  outcome?: string;
  emotionsDuring?: string[];
  emotionsAfter?: string[];
  photoUrl?: string;
}

// Personal Symbol inputs
export interface create_personal_symbol_input {
  userId: string;
  symbolName: string;
  category?: string;
  personalMeaning: string;
  contextualMeanings?: { context: string; meaning: string }[];
  notes?: string;
}

export interface update_personal_symbol_input {
  id: string;
  userId: string;
  personalMeaning?: string;
  contextualMeanings?: { context: string; meaning: string }[];
  notes?: string;
}

// Loved One inputs
export interface create_loved_one_input {
  userId: string;
  name: string;
  relationship: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: { sign: string; reason: string }[];
  importantDates?: { date: string; occasion: string; reminderEnabled?: boolean }[];
  photoUrl?: string;
}

export interface update_loved_one_input {
  id: string;
  userId: string;
  name?: string;
  relationship?: string;
  nickname?: string;
  birthDate?: string;
  passingDate?: string;
  passingCircumstances?: string;
  personalMemory?: string;
  theirPersonality?: string;
  sharedInterests?: string[];
  lessonsLearned?: string;
  commonSigns?: string[];
  signExplanations?: { sign: string; reason: string }[];
  importantDates?: { date: string; occasion: string; reminderEnabled?: boolean }[];
  photoUrl?: string;
}

// Development Exercise inputs
export interface create_development_exercise_input {
  userId: string;
  date?: string;
  exerciseType: exercise_type;
  exerciseName: string;
  source?: string;
  difficulty?: exercise_difficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

export interface update_development_exercise_input {
  id: string;
  userId: string;
  exerciseType?: exercise_type;
  exerciseName?: string;
  source?: string;
  difficulty?: exercise_difficulty;
  duration?: number;
  environment?: string;
  preparation?: string;
  results?: string;
  accuracy?: number;
  hits?: string[];
  misses?: string[];
  insights?: string;
  challengesFaced?: string;
  improvements?: string;
  confidenceLevel?: number;
  willRepeat?: boolean;
  nextSteps?: string;
  notes?: string;
}

// Reading Reflection inputs
export interface create_reading_reflection_input {
  userId: string;
  date?: string;
  readerName: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

export interface update_reading_reflection_input {
  id: string;
  userId: string;
  readerName?: string;
  readingType?: string;
  format?: string;
  duration?: number;
  bookingId?: string;
  readerId?: string;
  mainMessages?: string;
  evidentialInfo?: string;
  predictions?: string;
  guidance?: string;
  accuracyScore?: number;
  resonatedWith?: string[];
  didntResonate?: string[];
  validatedLater?: string;
  emotionalImpact?: string;
  actionsTaken?: string;
  overallRating?: number;
  notes?: string;
  photoUrl?: string;
}

// ============================================
// Mediumship Response Types
// ============================================

export interface synchronicity_response {
  success: boolean;
  message?: string;
  synchronicity?: synchronicity_type;
}

export interface spirit_message_response {
  success: boolean;
  message?: string;
  spiritMessage?: spirit_message_type;
}

export interface personal_symbol_response {
  success: boolean;
  message?: string;
  symbol?: personal_symbol_type;
}

export interface loved_one_response {
  success: boolean;
  message?: string;
  lovedOne?: loved_one_in_spirit_type;
}

export interface development_exercise_response {
  success: boolean;
  message?: string;
  exercise?: development_exercise_type;
}

export interface reading_reflection_response {
  success: boolean;
  message?: string;
  reflection?: reading_reflection_type;
}

export interface delete_mediumship_response {
  success: boolean;
  message?: string;
}

// ============================================
// Mediumship Filter Types
// ============================================

export interface synchronicity_filters {
  startDate?: string;
  endDate?: string;
  recurringTheme?: boolean;
  hasSymbol?: string;
  minSignificance?: number;
  limit?: number;
  offset?: number;
}

export interface spirit_message_filters {
  startDate?: string;
  endDate?: string;
  source?: spirit_source;
  receptionMethod?: reception_method;
  validated?: boolean;
  limit?: number;
  offset?: number;
}

export interface personal_symbol_filters {
  category?: string;
  minOccurrences?: number;
  limit?: number;
  offset?: number;
}

export interface loved_one_filters {
  relationship?: string;
  limit?: number;
  offset?: number;
}

export interface development_exercise_filters {
  startDate?: string;
  endDate?: string;
  exerciseType?: exercise_type;
  difficulty?: exercise_difficulty;
  limit?: number;
  offset?: number;
}

export interface reading_reflection_filters {
  startDate?: string;
  endDate?: string;
  readingType?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// User Card Symbols (Personal tarot card meanings)
// ============================================

export interface user_card_symbols_type {
  id: string;
  userId: string;
  docType: 'USER_CARD_SYMBOLS';

  // Card identification
  cardName: string;              // "The Moon", "Ace of Cups"
  normalizedCardName: string;    // Lowercase for matching

  // Personal symbols
  personalSymbols: string[];     // User's symbols for this card
  usePersonalOnly: boolean;      // If true, skip default extraction

  // Notes
  notes?: string;                // Why these symbols

  // Metadata
  createdAt: string;
  updatedAt: string;
  _id?: string;
  ref?: recordref_type;
}

// User Card Symbols inputs
export interface create_user_card_symbols_input {
  userId: string;
  cardName: string;
  personalSymbols: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

export interface update_user_card_symbols_input {
  id: string;
  userId: string;
  personalSymbols?: string[];
  usePersonalOnly?: boolean;
  notes?: string;
}

export interface user_card_symbols_response {
  success: boolean;
  message?: string;
  cardSymbols?: user_card_symbols_type;
}

// ============================================
// Mediumship Statistics
// ============================================

export interface mediumship_stats {
  // Activity
  totalSynchronicities: number;
  synchronicitiesThisMonth: number;
  totalSpiritMessages: number;
  messagesThisMonth: number;

  // Patterns
  symbolCount: number;
  topSymbols: { name: string; count: number }[];
  mostActiveSource: spirit_source | null;
  preferredReceptionMethod: reception_method | null;

  // Development
  exerciseCount: number;
  exercisesThisMonth: number;
  averageAccuracy: number;
  favoriteExercise: exercise_type | null;

  // Loved Ones
  lovedOnesCount: number;
  upcomingDates: { lovedOneId: string; name: string; date: string; occasion: string }[];

  // Readings
  readingReflectionCount: number;
  averageReadingRating: number;

  // Streaks
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
}



// ============================================
// Reading Source Types
// ============================================

// Where did this reading come from?
export type reading_source_type = 'SELF' | 'SPIRIVERSE' | 'EXTERNAL';

// External platform types
export type external_platform_type = 'TIKTOK' | 'YOUTUBE' | 'IN_PERSON' | 'PODCAST' | 'OTHER';

// Source details - varies based on source type
export interface reading_source_details {
  // SELF - pulled cards myself
  deck?: string;

  // SPIRIVERSE - reading from a practitioner on platform
  spiriReadingId?: string;
  practitionerName?: string;
  practitionerId?: string;

  // EXTERNAL - TikTok, YouTube, in-person reader, etc.
  platform?: external_platform_type;
  readerName?: string;
  sourceUrl?: string;
  channelName?: string; // For YouTube/TikTok creators
}

// ============================================
// Symbol Types (Shared across entries)
// ============================================

// Symbol category
export type symbol_category =
  | 'ELEMENT'    // water, fire, air, earth
  | 'ANIMAL'     // snake, owl, wolf, etc.
  | 'ARCHETYPE'  // mother, trickster, sage, etc.
  | 'OBJECT'     // key, mirror, tower, etc.
  | 'PLACE'      // forest, ocean, house, etc.
  | 'PERSON'     // stranger, child, guide, etc.
  | 'ACTION'     // flying, falling, running, etc.
  | 'CELESTIAL'  // moon, sun, stars, etc.
  | 'OTHER';

// Symbol tag attached to an entry
export interface symbol_tag {
  symbolId?: string;        // Reference to master Symbol (if exists)
  name: string;             // "water", "snake", "moon"
  category?: symbol_category;
  context?: string;         // "drowning in water" vs "calm lake"
  autoExtracted: boolean;   // true if from card mapping, false if manual
}

// Master Symbol (system-wide reference)
export interface symbol_type {
  id: string;
  docType: 'SYMBOL';
  name: string;
  normalizedName: string;   // lowercase, trimmed for matching
  category: symbol_category;
  systemMeanings: string[]; // ["emotions", "subconscious", "cleansing"]
  associatedCards: string[]; // ["The Moon", "Ace of Cups"]
  isSystemSymbol: boolean;  // true = provided by us
  createdAt: string;
}

// User's personal meaning for a symbol
export interface user_symbol_meaning_type {
  id: string;
  docType: 'USER_SYMBOL_MEANING';
  userId: string;
  symbolId: string;
  symbolName: string;
  personalMeaning: string;
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  firstSeen: string;
  lastSeen: string;
  commonContexts: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Card Types
// ============================================

// Journal card type for individual cards in a personal reading (renamed to avoid collision)
export interface journal_card_type {
  name: string;
  reversed: boolean;
  spreadPosition?: string; // e.g., "Past", "Present", "Future"
  interpretation?: string; // Per-card interpretation/reflection
}

// ============================================
// Reading Entry (Enhanced from Daily Card Pull)
// ============================================

// Reading Entry document type - the journal entry for any reading
export interface reading_entry_type {
  id: string;
  userId: string;
  docType: 'READING_ENTRY';

  // Required fields
  date: string; // ISO date string (YYYY-MM-DD)

  // SOURCE - Where did this reading come from?
  sourceType: reading_source_type;
  sourceDetails: reading_source_details;

  // CARDS
  cards: journal_card_type[];
  spreadType?: string; // "Single pull", "3-card", "Celtic Cross", etc.

  // REFLECTION
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number; // 1-5 how much did it resonate

  // SYMBOLS (extracted from cards + manual)
  symbols: symbol_tag[];
  themes: string[]; // User-defined themes/tags

  // TRACKING OVER TIME
  followUpDate?: string;
  outcome?: string; // What actually happened? (filled in later)

  // MEDIA
  photoUrl?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Cosmos DB internal
  _id?: string;
  ref?: recordref_type;
}

// Legacy alias for backwards compatibility
export type daily_card_pull_type = reading_entry_type;

// Input types
export interface create_reading_entry_input {
  userId: string;
  date?: string; // Defaults to today if not provided

  // Source
  sourceType: reading_source_type;
  sourceDetails: reading_source_details;

  // Cards
  cards: card_input[];
  spreadType?: string;

  // Reflection
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;

  // Symbols
  symbols?: symbol_tag_input[];
  themes?: string[];

  // Tracking
  followUpDate?: string;

  // Media
  photoUrl?: string;
}

// Legacy input type for backwards compatibility with old API
export interface legacy_create_card_pull_input {
  userId: string;
  date?: string;
  deck: string;  // Legacy: deck at top level
  cards: card_input[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

// Legacy alias - use legacy type for old API
export type create_card_pull_input = legacy_create_card_pull_input;

export interface card_input {
  name: string;
  reversed: boolean;
  spreadPosition?: string;
  interpretation?: string;
}

export interface symbol_tag_input {
  symbolId?: string;
  name: string;
  category?: symbol_category;
  context?: string;
  autoExtracted?: boolean;
}

export interface update_reading_entry_input {
  id: string;
  userId: string;

  // Source (can update details but not type)
  sourceDetails?: reading_source_details;

  // Cards
  cards?: card_input[];
  spreadType?: string;

  // Reflection
  question?: string;
  firstImpression?: string;
  reflection?: string;
  resonanceScore?: number;

  // Symbols
  symbols?: symbol_tag_input[];
  themes?: string[];

  // Tracking
  followUpDate?: string;
  outcome?: string;

  // Media
  photoUrl?: string;
}

// Legacy input type for backwards compatibility with old API
export interface legacy_update_card_pull_input {
  id: string;
  userId: string;
  deck?: string;  // Legacy: deck at top level
  cards?: card_input[];
  question?: string;
  firstImpression?: string;
  reflection?: string;
  photoUrl?: string;
}

// Legacy alias - use legacy type for old API
export type update_card_pull_input = legacy_update_card_pull_input;

// Response types
export interface reading_entry_response {
  success: boolean;
  message?: string;
  readingEntry?: reading_entry_type;
}

// Legacy response type with cardPull field
export interface legacy_card_pull_response {
  success: boolean;
  message?: string;
  cardPull?: reading_entry_type;
}

// Legacy alias
export type card_pull_response = legacy_card_pull_response;

export interface delete_reading_entry_response {
  success: boolean;
  message?: string;
}

// Legacy alias
export type delete_card_pull_response = delete_reading_entry_response;

// Filter types for queries
export interface reading_entry_filters {
  startDate?: string;
  endDate?: string;
  sourceType?: reading_source_type;
  deck?: string; // For SELF source type
  hasQuestion?: boolean;
  hasSymbol?: string; // Filter by symbol name
  limit?: number;
  offset?: number;
}

// Legacy alias
export type card_pull_filters = reading_entry_filters;

// ============================================
// Card Pattern Statistics Types
// ============================================

export interface card_frequency {
  name: string;
  count: number;
  reversedCount: number;
  lastPulled: string;
}

export interface suit_distribution {
  suit: string;
  count: number;
  percentage: number;
}

export type PatternPeriod = 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEAR' | 'ALL_TIME';

export interface card_pattern_stats {
  // Overall counts
  totalReadings: number;
  totalCards: number;
  uniqueCards: number;

  // Time-based
  readingsThisWeek: number;
  readingsThisMonth: number;

  // Card frequency
  topCards: card_frequency[];
  recentCards: card_frequency[];

  // Suit analysis
  suitDistribution: suit_distribution[];

  // Major vs Minor
  majorArcanaCount: number;
  minorArcanaCount: number;
  majorArcanaPercentage: number;

  // Reversed stats
  totalReversed: number;
  reversedPercentage: number;

  // Source breakdown
  selfReadings: number;
  externalReadings: number;
  spiriverseReadings: number;

  // Period info
  periodStart?: string;
  periodEnd?: string;

  // Comparison with previous period
  previousPeriodReadings?: number;
  readingsChange?: number;
  readingsChangePercent?: number;

  // Emerging patterns - cards appearing more frequently recently
  emergingCards?: card_frequency[];
  // Cards that appeared in previous period but not this one
  fadingCards?: card_frequency[];
}

// ============================================
// Symbol Pattern Statistics Types
// ============================================

export interface symbol_occurrence {
  symbolName: string;
  category?: symbol_category;
  totalCount: number;
  dreamCount: number;
  readingCount: number;
  lastSeen: string;
  personalMeaning?: string;
}

export interface symbol_pattern_stats {
  // Overall counts
  totalSymbols: number;
  totalOccurrences: number;

  // Top symbols by frequency
  topSymbols: symbol_occurrence[];

  // Symbols appearing in both dreams and readings
  crossEntrySymbols: symbol_occurrence[];

  // Category breakdown
  categoryBreakdown: { category: string; count: number; percentage: number }[];

  // Recent symbol activity
  recentSymbols: symbol_occurrence[];
}

// ============================================
// Progressive Unlock System Types
// ============================================
// Universal framework for gating features based on user activity.
// Features unlock as users engage with the platform, creating a
// sense of discovery and preventing overwhelm for new users.



// ============================================
// Feature Identifiers
// ============================================

// All unlockable features across all interest areas
export type unlockable_feature =
  // Crystals
  | 'crystals:cleansing-log'
  | 'crystals:charging-reminders'
  | 'crystals:crystal-grids'
  | 'crystals:acquisition-journal'
  | 'crystals:pairing-notes'
  | 'crystals:shop-fair-log'
  // Mediumship
  | 'mediumship:synchronicity-log'
  | 'mediumship:spirit-messages'
  | 'mediumship:symbol-dictionary'
  | 'mediumship:loved-ones'
  | 'mediumship:development-exercises'
  // Energy
  | 'energy:attunement-tracker'
  | 'energy:protection-rituals'
  | 'energy:aura-observations'
  // Faith (all core, no progressive unlocks yet)
  // Tarot/Oracle (future)
  | 'tarot:card-pattern-stats'
  | 'tarot:symbol-tracking'
  | 'tarot:spread-builder';

// Interest area groupings
export type unlock_interest_area =
  | 'crystals'
  | 'mediumship'
  | 'energy'
  | 'faith'
  | 'tarot';

// ============================================
// Unlock Condition Types
// ============================================

// Types of conditions that can unlock features
export type unlock_condition_type =
  | 'days-active'           // User has been active for X days
  | 'entry-count'           // User has X entries of a specific type
  | 'total-entries'         // User has X total entries across types
  | 'first-entry'           // User has at least one entry of a type
  | 'collection-count'      // User has X items in a collection
  | 'setting-enabled'       // User has enabled a setting
  | 'prompt-based'          // Always available, shown via prompt
  | 'date-triggered';       // Triggered by calendar (holidays, anniversaries)

// Condition definition
export interface unlock_condition {
  type: unlock_condition_type;
  // For count-based conditions
  targetCount?: number;
  // For entry-count conditions, specify which doc type
  docType?: string;
  // For setting-enabled conditions
  settingKey?: string;
  // Human-readable description
  description: string;
}

// ============================================
// Unlock Status Types
// ============================================

// Progress toward an unlock
export interface unlock_progress {
  current: number;
  required: number;
  label: string;           // e.g., "3/5 crystals", "Day 5 of 7"
  percentage: number;      // 0-100 for progress bars
}

// Status of a single feature
export interface unlock_status {
  featureId: unlockable_feature;
  featureName: string;     // Human-readable name
  featureDescription: string;
  interestArea: unlock_interest_area;
  isUnlocked: boolean;
  progress?: unlock_progress;
  unlockedAt?: string;     // ISO timestamp when first unlocked
  celebrationShown?: boolean;
  // For prompt-based unlocks
  isPromptBased?: boolean;
  promptContext?: string;  // e.g., "holiday", "anniversary"
}

// All unlock statuses for a user, grouped by interest
export interface user_unlock_state {
  userId: string;
  // Activity metrics used for calculations
  activityMetrics: user_activity_metrics;
  // Unlock status by interest area
  crystals: unlock_status[];
  mediumship: unlock_status[];
  energy: unlock_status[];
  faith: unlock_status[];
  tarot: unlock_status[];
  // Recently unlocked (for celebration)
  recentlyUnlocked: unlock_status[];
  // Next up (closest to unlocking)
  upcomingUnlocks: unlock_status[];
}

// ============================================
// User Activity Metrics
// ============================================

// Centralized activity metrics for unlock calculations
export interface user_activity_metrics {
  userId: string;
  // Account age
  accountCreatedAt: string;
  daysActive: number;           // Days with at least one action
  currentStreak: number;        // Consecutive days active
  longestStreak: number;
  lastActiveDate: string;

  // Entry counts by doc type
  entryCounts: {
    // Mediumship
    dreams: number;
    readingEntries: number;     // Card pull/reading journal entries
    readingReflections: number; // Readings received from mediums
    synchronicities: number;
    spiritMessages: number;
    developmentExercises: number;
    // Energy
    energyJournalEntries: number;
    chakraCheckins: number;
    sessionReflections: number;
    attunements: number;
    protectionRituals: number;
    auraObservations: number;
    clearingEntries: number;    // Subset of energy journal
    sessionsGiven: number;      // Subset of energy journal
    // Crystals
    crystalsInCollection: number;
    crystalCleansings: number;
    crystalGrids: number;
    acquisitionsWithVendor: number;
    // Faith
    dailyPassagesRead: number;
    prayerEntries: number;
    scriptureReflections: number;
    // Tarot
    cardPulls: number;
  };

  // Settings flags relevant to unlocks
  settings: {
    moonNotificationsEnabled: boolean;
  };
}

// ============================================
// Unlock Event (for tracking/analytics)
// ============================================

export interface unlock_event {
  id: string;
  userId: string;
  docType: 'UNLOCK_EVENT';
  featureId: unlockable_feature;
  unlockedAt: string;
  celebrationShown: boolean;
  celebrationShownAt?: string;
  // Snapshot of what triggered the unlock
  triggerMetrics?: Partial<user_activity_metrics['entryCounts']>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Feature Definition Registry
// ============================================

// Complete definition of an unlockable feature
export interface feature_definition {
  id: unlockable_feature;
  name: string;
  description: string;
  interestArea: unlock_interest_area;
  requiredInterest: SpiritualInterest;  // Which spiritual interest enables this
  condition: unlock_condition;
  icon?: string;                         // Icon name for UI
  route?: string;                        // Route path when unlocked
  // Celebration content
  celebration: {
    title: string;                       // "New Feature Unlocked!"
    message: string;                     // What they can now do
    ctaText: string;                     // "Try it now"
  };
}

// ============================================
// GraphQL Input/Response Types
// ============================================

export interface mark_celebration_shown_input {
  userId: string;
  featureId: unlockable_feature;
}

export interface unlock_status_response {
  success: boolean;
  message?: string;
  status?: unlock_status;
}

export interface user_unlock_state_response {
  success: boolean;
  message?: string;
  state?: user_unlock_state;
}

// ============================================
// Unlock Check Function Type
// ============================================

// Function signature for checking if a feature is unlocked
export type unlock_check_fn = (metrics: user_activity_metrics) => {
  isUnlocked: boolean;
  progress?: unlock_progress;
};

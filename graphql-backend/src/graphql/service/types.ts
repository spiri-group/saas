//#region Service

import { currency_amount_type, dateToFrom_type, faq_type, googleplace_type, pre_reading_question_type, recordref_type, stripe_details_type, thumbnail_type, timeRange_type, timespan_type } from "../0_shared/types"

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
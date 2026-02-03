# SpiriVerse Services Transformation - Complete Implementation Plan

## Executive Summary

Transform the current appointment-based services system into an **async-first, category-specific** platform supporting three distinct service types: Readings, Healings, and Coaching. The system will integrate with the existing cart/checkout flow while quietly maintaining sync capabilities for future use.

### Key Decisions from User Input:
- ✅ **Retain sync infrastructure** but don't expose or market it yet (async takes the lead)
- ✅ **Unified cart integration** with products
- ✅ **All file formats supported**: Video (MP4, MOV), Audio (MP3, M4A), Documents (PDF, DOCX), Images (JPG, PNG)
- ✅ **Three distinct creation experiences**: Separate forms for Reading, Healing, and Coaching offers
- ✅ **Category-specific features**: Each service type has unique fields and workflows

---

## Current State Analysis

### What Exists (Keep & Extend)
- ✅ Basic service schema: name, description, thumbnail, ratePerHour, duration
- ✅ Service creation mutation and UI foundation
- ✅ Scheduling system (RRule-based calendar, weekday configs)
- ✅ Booking flow with Stripe invoice payment
- ✅ Service listing queries
- ✅ Customer booking view

### What's Missing (Need to Build)
- ❌ Async delivery mode support
- ❌ Category system (Readings, Healings, Coaching)
- ❌ Fixed pricing (currently only hourly rate)
- ❌ Cart integration for services
- ❌ File upload/storage for deliverables
- ❌ Fulfillment workflow for practitioners
- ❌ Customer delivery/download UI
- ❌ Order status tracking (paid → in progress → delivered)
- ❌ Email notifications for service lifecycle
- ❌ Questionnaire/intake form system

### Critical Issues to Fix
- 🐛 **Hardcoded pricing**: Line 468 in book_service mutation uses `$50` instead of actual service price
- 🐛 **No payment webhook handler**: Service bookings don't update status when payment succeeds
- 🐛 **Invoice-based payment**: Should use direct payment intent or cart checkout instead

---

## Phase 1: Backend Schema Extensions

### File: `/graphql-backend/src/graphql/service/types.ts`

#### 1.1 Add New Enums

```typescript
// Add at top of file after imports
export type ServiceCategory = "READING" | "HEALING" | "COACHING"
export type ServiceDeliveryMode = "SYNC" | "ASYNC"
export type ServiceBookingType = "SCHEDULED" | "ASAP" | "PACKAGE"
export type ServiceOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"

export type DeliverableFileType = "VIDEO" | "AUDIO" | "DOCUMENT" | "IMAGE"
```

#### 1.2 Extend `service_type`

```typescript
export type service_type = {
    id: string,
    name: string,
    vendorId: string,
    type: string,  // Keep for backward compatibility
    description: string,
    terms: string,
    faq: faq_type[]
    thumbnail: thumbnail_type
    ref: recordref_type

    // EXISTING - Keep for sync services
    duration?: timespan_type,           // Optional now
    ratePerHour?: currency_amount_type, // Optional now

    // NEW - Async service fields
    category: ServiceCategory,          // READING | HEALING | COACHING
    deliveryMode: ServiceDeliveryMode,  // SYNC | ASYNC (default ASYNC)
    bookingType: ServiceBookingType,    // SCHEDULED | ASAP | PACKAGE

    // Pricing (one or the other)
    pricing: {
        type: "HOURLY" | "FIXED" | "PACKAGE",
        fixedPrice?: currency_amount_type,
        ratePerHour?: currency_amount_type,
        packageOptions?: servicePackageOption_type[]
    },

    // Async-specific
    turnaroundDays?: number,            // "Delivered within X days"
    deliveryFormats?: string[],         // ["RECORDED_VIDEO", "WRITTEN_PDF", "LIVE_VIDEO"]

    // Add-ons and extras
    addOns?: serviceAddOn_type[],       // Linked products, extras

    // Intake questionnaire
    questionnaire?: serviceQuestion_type[],

    // Category-specific fields
    readingOptions?: readingServiceOptions_type,   // For READING category
    healingOptions?: healingServiceOptions_type,   // For HEALING category
    coachingOptions?: coachingServiceOptions_type, // For COACHING category
}
```

#### 1.3 New Supporting Types

```typescript
export type servicePackageOption_type = {
    sessionCount: number,     // 3, 6, or 12 sessions
    price: currency_amount_type,
    discountPercentage?: number
}

export type serviceAddOn_type = {
    type: "PRODUCT" | "EXTRA",
    productRef?: recordref_type,  // Link to product from shop
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

// Category-specific option types

export type readingServiceOptions_type = {
    readingType?: string,           // "Tarot", "Oracle", "Psychic", "Mediumship"
    includePullCardSummary?: boolean,
    includeVoiceNote?: boolean,
    deckUsed?: string,              // Name of deck
}

export type healingServiceOptions_type = {
    healingType: string,            // "Reiki", "Energy", "Sound", "Intuitive"
    sessionLocation?: "IN_PERSON" | "DISTANCE",
    includeEnergyReport?: boolean,
    recommendedCrystals?: string[], // Product IDs or names
    includeFollowUpReading?: boolean
}

export type coachingServiceOptions_type = {
    sessionFormat: "ONE_ON_ONE" | "GROUP",
    groupSize?: number,             // If GROUP
    includeJournalPDF?: boolean,
    includeWorkbook?: boolean,
    includePostSessionNotes?: boolean
}
```

#### 1.4 Extend `serviceBooking_type` → Rename to `serviceOrder_type`

```typescript
export type serviceOrder_type = {
  id: string
  customerId: string          // NEW
  vendorId: string            // NEW
  purchaseDate: string        // NEW

  // Keep for backward compatibility and sync services
  date?: string               // Optional now (only for SCHEDULED bookings)
  time?: timeRange_type       // Optional now

  ref: recordref_type
  service: service_type
  stripe: stripe_details_type

  // NEW - Order status tracking
  status: ServiceOrderStatus,

  // NEW - Questionnaire responses
  questionnaireResponses?: serviceQuestionResponse_type[],

  // NEW - Deliverables (for async services)
  deliverables?: serviceDeliverables_type,

  // NEW - Package tracking (for multi-session packages)
  packageInfo?: {
    totalSessions: number,
    completedSessions: number,
    remainingSessions: number
  }
}

export type serviceQuestionResponse_type = {
    questionId: string,
    question: string,
    answer: string | string[]  // string for text, array for multiselect
}

export type serviceDeliverables_type = {
    files: deliverableFile_type[],
    message?: string,           // Practitioner notes
    deliveredAt?: string,       // Timestamp
}

export type deliverableFile_type = {
    id: string,
    url: string,                // Azure Blob Storage URL
    signedUrl?: string,         // Temporary signed URL for download
    name: string,
    type: DeliverableFileType,  // VIDEO | AUDIO | DOCUMENT | IMAGE
    mimeType: string,           // "video/mp4", "audio/mp3", etc.
    size: number,               // Bytes
    uploadedAt: string,         // Timestamp
}
```

---

## Phase 2: Backend GraphQL Implementation

### File: `/graphql-backend/src/graphql/service/schema.graphql`

#### 2.1 Update GraphQL Schema

```graphql
# Enums
enum ServiceCategory {
  READING
  HEALING
  COACHING
}

enum ServiceDeliveryMode {
  SYNC
  ASYNC
}

enum ServiceBookingType {
  SCHEDULED
  ASAP
  PACKAGE
}

enum ServiceOrderStatus {
  PENDING_PAYMENT
  PAID
  IN_PROGRESS
  DELIVERED
  CANCELLED
  REFUNDED
}

enum DeliverableFileType {
  VIDEO
  AUDIO
  DOCUMENT
  IMAGE
}

# Types
type Service {
  id: ID!
  name: String!
  vendorId: ID!
  description: String!
  terms: String
  faq: [FAQ]
  thumbnail: Thumbnail
  ref: RecordRef!

  # Category and mode
  category: ServiceCategory!
  deliveryMode: ServiceDeliveryMode!
  bookingType: ServiceBookingType!

  # Pricing
  pricing: ServicePricing!

  # Async fields
  turnaroundDays: Int
  deliveryFormats: [String]

  # Add-ons
  addOns: [ServiceAddOn]

  # Questionnaire
  questionnaire: [ServiceQuestion]

  # Category-specific
  readingOptions: ReadingServiceOptions
  healingOptions: HealingServiceOptions
  coachingOptions: CoachingServiceOptions

  # Legacy fields (for sync services)
  duration: TimeSpan
  ratePerHour: CurrencyAmount
}

type ServicePricing {
  type: String!  # HOURLY | FIXED | PACKAGE
  fixedPrice: CurrencyAmount
  ratePerHour: CurrencyAmount
  packageOptions: [PackageOption]
}

type PackageOption {
  sessionCount: Int!
  price: CurrencyAmount!
  discountPercentage: Float
}

type ServiceAddOn {
  type: String!  # PRODUCT | EXTRA
  productRef: RecordRef
  name: String!
  description: String
  price: CurrencyAmount
  isOptional: Boolean!
}

type ServiceQuestion {
  id: ID!
  question: String!
  type: String!  # TEXT | TEXTAREA | SELECT | MULTISELECT
  options: [String]
  required: Boolean!
  placeholder: String
}

type ReadingServiceOptions {
  readingType: String
  includePullCardSummary: Boolean
  includeVoiceNote: Boolean
  deckUsed: String
}

type HealingServiceOptions {
  healingType: String!
  sessionLocation: String
  includeEnergyReport: Boolean
  recommendedCrystals: [String]
  includeFollowUpReading: Boolean
}

type CoachingServiceOptions {
  sessionFormat: String!  # ONE_ON_ONE | GROUP
  groupSize: Int
  includeJournalPDF: Boolean
  includeWorkbook: Boolean
  includePostSessionNotes: Boolean
}

type ServiceOrder {
  id: ID!
  customerId: ID!
  vendorId: ID!
  purchaseDate: String!
  date: String
  time: TimeRange
  ref: RecordRef!
  service: Service!
  stripe: StripeDetails!
  status: ServiceOrderStatus!
  questionnaireResponses: [QuestionResponse]
  deliverables: ServiceDeliverables
  packageInfo: PackageInfo
}

type QuestionResponse {
  questionId: ID!
  question: String!
  answer: String  # JSON string for arrays
}

type ServiceDeliverables {
  files: [DeliverableFile!]!
  message: String
  deliveredAt: String
}

type DeliverableFile {
  id: ID!
  url: String!
  signedUrl: String
  name: String!
  type: DeliverableFileType!
  mimeType: String!
  size: Int!
  uploadedAt: String!
}

type PackageInfo {
  totalSessions: Int!
  completedSessions: Int!
  remainingSessions: Int!
}

# Inputs
input CreateReadingOfferInput {
  name: String!
  description: String!
  terms: String
  faq: [FAQInput]
  thumbnail: ThumbnailInput
  pricing: ServicePricingInput!
  turnaroundDays: Int
  deliveryFormats: [String]
  addOns: [ServiceAddOnInput]
  questionnaire: [ServiceQuestionInput]
  readingOptions: ReadingServiceOptionsInput
}

input CreateHealingOfferInput {
  name: String!
  description: String!
  terms: String
  faq: [FAQInput]
  thumbnail: ThumbnailInput
  pricing: ServicePricingInput!
  bookingType: ServiceBookingType!  # Can be SCHEDULED or ASAP
  turnaroundDays: Int  # For ASAP healings
  addOns: [ServiceAddOnInput]
  questionnaire: [ServiceQuestionInput]
  healingOptions: HealingServiceOptionsInput!
}

input CreateCoachingOfferInput {
  name: String!
  description: String!
  terms: String
  faq: [FAQInput]
  thumbnail: ThumbnailInput
  pricing: ServicePricingInput!
  bookingType: ServiceBookingType!  # SCHEDULED or PACKAGE
  deliveryFormats: [String]
  turnaroundDays: Int  # For async coaching
  addOns: [ServiceAddOnInput]
  questionnaire: [ServiceQuestionInput]
  coachingOptions: CoachingServiceOptionsInput!
}

input ServicePricingInput {
  type: String!  # HOURLY | FIXED | PACKAGE
  fixedPrice: CurrencyAmountInput
  ratePerHour: CurrencyAmountInput
  packageOptions: [PackageOptionInput]
}

input PackageOptionInput {
  sessionCount: Int!
  price: CurrencyAmountInput!
  discountPercentage: Float
}

input ServiceAddOnInput {
  type: String!
  productRef: RecordRefInput
  name: String!
  description: String
  price: CurrencyAmountInput
  isOptional: Boolean!
}

input ServiceQuestionInput {
  id: ID
  question: String!
  type: String!
  options: [String]
  required: Boolean!
  placeholder: String
}

input ReadingServiceOptionsInput {
  readingType: String
  includePullCardSummary: Boolean
  includeVoiceNote: Boolean
  deckUsed: String
}

input HealingServiceOptionsInput {
  healingType: String!
  sessionLocation: String
  includeEnergyReport: Boolean
  recommendedCrystals: [String]
  includeFollowUpReading: Boolean
}

input CoachingServiceOptionsInput {
  sessionFormat: String!
  groupSize: Int
  includeJournalPDF: Boolean
  includeWorkbook: Boolean
  includePostSessionNotes: Boolean
}

input QuestionResponseInput {
  questionId: ID!
  question: String!
  answer: String!  # JSON string if array
}

input UploadDeliverableInput {
  orderId: ID!
  files: [DeliverableFileInput!]!
  message: String
}

input DeliverableFileInput {
  name: String!
  type: DeliverableFileType!
  mimeType: String!
  size: Int!
  # Note: File upload handled separately via Azure Blob Storage
  # This input receives metadata after upload completes
  url: String!
}

# Queries
type Query {
  # Existing (keep)
  service(id: ID!, vendorId: ID!): Service
  services(merchantId: ID!): [Service]
  myServicesSchedule(merchantId: ID!): ServiceSchedule
  servicesCalendar(
    start: String!
    end: String!
    merchantId: ID!
    serviceIds: [ID]
  ): [ServiceCalendarSlot]

  # NEW - Order queries
  myServiceOrders(
    vendorId: ID!
    status: ServiceOrderStatus
    category: ServiceCategory
  ): [ServiceOrder]

  customerServiceOrders(
    customerId: ID!
    status: ServiceOrderStatus
  ): [ServiceOrder]

  serviceOrderById(orderId: ID!): ServiceOrder

  # NEW - Service discovery
  discoverServices(
    category: ServiceCategory
    deliveryMode: ServiceDeliveryMode
    priceRange: PriceRangeInput
    limit: Int
    offset: Int
  ): ServiceDiscoveryResult
}

type ServiceDiscoveryResult {
  services: [Service!]!
  total: Int!
  hasMore: Boolean!
}

input PriceRangeInput {
  min: Float
  max: Float
  currency: String!
}

# Mutations
type Mutation {
  # NEW - Category-specific creation
  create_reading_offer(input: CreateReadingOfferInput!): Service!
  create_healing_offer(input: CreateHealingOfferInput!): Service!
  create_coaching_offer(input: CreateCoachingOfferInput!): Service!

  # NEW - Cart integration (service becomes cart item, purchased via checkout)
  add_service_to_cart(
    serviceId: ID!
    questionnaireResponses: [QuestionResponseInput]
    selectedAddOns: [ID]
  ): Cart!

  # NEW - Fulfillment
  upload_service_deliverable(input: UploadDeliverableInput!): ServiceOrder!
  mark_service_delivered(orderId: ID!): ServiceOrder!

  # NEW - Update/manage services
  update_service(serviceId: ID!, input: UpdateServiceInput!): Service!
  archive_service(serviceId: ID!): Service!

  # Existing (keep for sync services)
  create_service(input: CreateServiceInput!): Service
  create_service_schedule(merchantId: ID!, name: String!): ServiceSchedule
  schedule_availability(
    merchantId: ID!
    serviceId: ID!
    scheduleId: ID!
    config: ScheduleConfigInput!
  ): ServiceSchedule
  book_service(
    serviceId: ID!
    date: String!
    time: TimeRangeInput!
  ): ServiceBooking
  cancel_booking(bookingId: ID!): Boolean

  # NEW - Refund
  refund_service_order(orderId: ID!, reason: String): ServiceOrder!
}
```

### File: `/graphql-backend/src/graphql/service/index.ts`

#### 2.2 Implement New Resolvers

**Important implementation notes:**

1. **create_reading_offer** (lines ~100-200):
   - Validate required fields for reading
   - Set `category: "READING"`, `deliveryMode: "ASYNC"` by default
   - Generate service ID and ref
   - Store in `Main-Listing` container with `type: "SERVICE"`
   - Return created service

2. **create_healing_offer** (lines ~201-300):
   - Similar to reading but with healing-specific validation
   - Support both SCHEDULED (for in-person) and ASAP (for distance)
   - Validate healingOptions present
   - Set `category: "HEALING"`

3. **create_coaching_offer** (lines ~301-400):
   - Support SCHEDULED, PACKAGE booking types
   - Validate package options if type is PACKAGE
   - Set `category: "COACHING"`

4. **add_service_to_cart** (lines ~401-500):
   - Find service by ID
   - Create cart item with type "SERVICE"
   - Attach questionnaire responses
   - Calculate price (fixed or from package selection)
   - Add to existing cart or create new cart
   - Return updated cart

5. **upload_service_deliverable** (lines ~501-600):
   - Validate order exists and belongs to vendor
   - Validate order status is PAID or IN_PROGRESS
   - Store file metadata in deliverables array
   - Update order status to IN_PROGRESS if was PAID
   - Return updated order

6. **mark_service_delivered** (lines ~601-700):
   - Validate order has at least one deliverable
   - Update status to DELIVERED
   - Set deliveredAt timestamp
   - Send customer notification email
   - Return updated order

7. **myServiceOrders query** (lines ~701-800):
   - Query Main-Bookings container
   - Filter by vendorId and optionally status/category
   - Order by purchaseDate DESC
   - Return array of service orders

8. **customerServiceOrders query** (lines ~801-900):
   - Query Main-Bookings container
   - Filter by customerId and optionally status
   - Order by purchaseDate DESC
   - Generate signed URLs for deliverable files
   - Return array of service orders

9. **discoverServices query** (lines ~901-1000):
   - Query Main-Listing container
   - Filter by category, deliveryMode, price range
   - Support pagination (limit/offset)
   - Return services with count

#### 2.3 Azure Blob Storage Integration

**File: `/graphql-backend/src/services/azure-storage.ts`** (NEW)

```typescript
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = "service-deliverables";

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;

  constructor() {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async uploadFile(
    vendorId: string,
    orderId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);

    // Create container if doesn't exist
    await containerClient.createIfNotExists({
      access: "private"
    });

    // Generate unique blob name
    const blobName = `${vendorId}/${orderId}/${Date.now()}-${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with metadata
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType
      }
    });

    return blockBlobClient.url;
  }

  async generateSignedUrl(blobUrl: string, expiryHours: number = 24): Promise<string> {
    // Parse blob URL to get container and blob name
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    // Generate SAS token
    const startsOn = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryHours * 60 * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters({
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"), // Read only
      startsOn,
      expiresOn
    }, this.blobServiceClient.credential as any).toString();

    return `${blobUrl}?${sasToken}`;
  }

  async deleteFile(blobUrl: string): Promise<void> {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    await blobClient.deleteIfExists();
  }
}

export const azureStorage = new AzureStorageService();
```

**Usage in upload mutation:**
```typescript
// In upload_service_deliverable resolver
const fileBuffer = await fetchFileBuffer(fileInput.url); // Implement based on your upload flow
const blobUrl = await azureStorage.uploadFile(
  order.vendorId,
  orderId,
  fileInput.name,
  fileBuffer,
  fileInput.mimeType
);
```

**Usage in query for signed URLs:**
```typescript
// In customerServiceOrders resolver
for (const order of orders) {
  if (order.deliverables?.files) {
    for (const file of order.deliverables.files) {
      file.signedUrl = await azureStorage.generateSignedUrl(file.url, 24);
    }
  }
}
```

---

## Phase 3: Cart & Checkout Integration

### File: `/graphql-backend/src/graphql/cart/types.ts`

#### 3.1 Extend Cart Item Type

```typescript
export type cart_item_type = {
  // ... existing product fields

  // NEW - Service fields
  isService?: boolean,
  serviceId?: string,
  service?: service_type,  // Import from service/types
  questionnaireResponses?: serviceQuestionResponse_type[],
  selectedAddOns?: string[],  // Array of add-on IDs
}
```

### File: `/graphql-backend/src/graphql/cart/index.ts`

#### 3.2 Modify Add to Cart Logic

Update `addToCart` mutation (around line ~50-150):

```typescript
// Add validation for service items
if (input.serviceId) {
  // Fetch service
  const service = await queryService(input.serviceId, input.vendorId);

  if (!service) {
    throw new Error("Service not found");
  }

  // Calculate price
  let price: number;
  if (service.pricing.type === "FIXED") {
    price = service.pricing.fixedPrice.amount;
  } else if (service.pricing.type === "PACKAGE") {
    // Find selected package option
    const selectedPackage = service.pricing.packageOptions.find(
      p => p.sessionCount === input.packageSessionCount
    );
    price = selectedPackage?.price.amount || service.pricing.fixedPrice.amount;
  } else {
    throw new Error("Hourly rate services must be booked via appointment");
  }

  // Create cart item
  const cartItem: cart_item_type = {
    id: generateId(),
    isService: true,
    serviceId: service.id,
    service: service,
    questionnaireResponses: input.questionnaireResponses || [],
    selectedAddOns: input.selectedAddOns || [],
    quantity: 1,  // Services always qty 1
    price: { amount: price, currency: service.pricing.fixedPrice.currency }
  };

  // Add to cart
  cart.items.push(cartItem);
}
```

#### 3.3 Validate Cart Before Checkout

Update checkout validation (around line ~200-300):

```typescript
// Check if cart has mixed items (products + services)
const hasProducts = cart.items.some(item => !item.isService);
const hasServices = cart.items.some(item => item.isService);

if (hasProducts && hasServices) {
  // Allow for now, but skip shipping calculation for services
  // Future: Consider splitting into separate checkouts
}

// For service-only carts, skip shipping entirely
if (hasServices && !hasProducts) {
  // No shipping address required
  // No shipping calculation needed
}
```

### File: `/graphql-backend/src/functions/stripe/payment_intent_succeeded/index.ts`

#### 3.4 Extend Payment Webhook for Services

Update webhook handler (around line ~200-600):

```typescript
// After handling product orders...

// Handle service orders from cart
if (order.items) {
  const serviceItems = order.items.filter(item => item.isService);

  for (const item of serviceItems) {
    // Create service order in Main-Bookings
    const serviceOrder: serviceOrder_type = {
      id: generateId(),
      customerId: order.customerId,
      vendorId: item.service.vendorId,
      purchaseDate: new Date().toISOString(),
      ref: { id: item.serviceId, type: "SERVICE" },
      service: item.service,
      stripe: {
        paymentIntentId: paymentIntent.id,
        chargeId: paymentIntent.charges.data[0]?.id,
        amount: item.price.amount,
        currency: item.price.currency
      },
      status: "PAID",
      questionnaireResponses: item.questionnaireResponses || [],
      deliverables: undefined  // Will be added during fulfillment
    };

    // Store in Main-Bookings container
    await cosmosClient
      .database("Spiriverse")
      .container("Main-Bookings")
      .items.create(serviceOrder);

    // Send email to practitioner
    await sendEmail({
      to: practitionerEmail,
      template: "SERVICE_PURCHASED_PRACTITIONER",
      data: {
        serviceName: item.service.name,
        customerName: order.customerName,
        purchaseDate: serviceOrder.purchaseDate,
        orderId: serviceOrder.id,
        fulfillmentUrl: `${process.env.FRONTEND_URL}/m/${merchantSlug}/manage/services/orders/${serviceOrder.id}`
      }
    });

    // Send email to customer
    await sendEmail({
      to: order.customerEmail,
      template: "SERVICE_PURCHASED_CUSTOMER",
      data: {
        serviceName: item.service.name,
        practitionerName: practitionerName,
        purchaseDate: serviceOrder.purchaseDate,
        turnaroundDays: item.service.turnaroundDays,
        orderId: serviceOrder.id,
        orderUrl: `${process.env.FRONTEND_URL}/c/${customerId}/services/${serviceOrder.id}`
      }
    });
  }
}
```

---

## Phase 4: Practitioner UI - Service Creation

### File Structure

```
/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/
├── page.tsx                     # Main services dashboard
├── create/
│   ├── page.tsx                 # Choose service type landing page
│   ├── reading/
│   │   ├── page.tsx            # Create Reading form
│   │   └── components/
│   │       ├── ReadingForm.tsx
│   │       └── ReadingTypeSelector.tsx
│   ├── healing/
│   │   ├── page.tsx            # Create Healing form
│   │   └── components/
│   │       ├── HealingForm.tsx
│   │       └── HealingTypeSelector.tsx
│   └── coaching/
│       ├── page.tsx             # Create Coaching form
│       └── components/
│           ├── CoachingForm.tsx
│           └── PackageBuilder.tsx
├── [serviceId]/
│   ├── page.tsx                 # View/Edit service
│   └── edit/
│       └── page.tsx             # Edit service form
└── orders/
    ├── page.tsx                 # Orders to fulfill list
    ├── [orderId]/
    │   └── page.tsx             # Fulfillment interface
    └── components/
        ├── OrderCard.tsx
        ├── FileUploader.tsx
        └── DeliverablesList.tsx
```

### 4.1 Choose Service Type Landing Page

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/page.tsx`**

```tsx
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function ChooseServiceType({ params }: { params: { merchant_slug: string } }) {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Create a New Service Offering</h1>
      <p className="text-muted-foreground mb-8">
        Choose the type of service you&apos;d like to offer to your clients
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reading Card */}
        <Link href={`/m/${params.merchant_slug}/manage/services/create/reading`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Reading Offer</CardTitle>
              </div>
              <CardDescription>
                For mediums, tarot/oracle readers, and psychics. Offer live or recorded readings
                with optional card summaries and voice notes.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Healing Card */}
        <Link href={`/m/${params.merchant_slug}/manage/services/create/healing`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Healing Session</CardTitle>
              </div>
              <CardDescription>
                For reiki, energy, sound, and intuitive healers. Offer in-person or distance
                sessions with energy reports and follow-ups.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Coaching Card */}
        <Link href={`/m/${params.merchant_slug}/manage/services/create/coaching`}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Coaching / Guidance</CardTitle>
              </div>
              <CardDescription>
                For life-path mentors and spiritual coaches. Offer single sessions, packages,
                or group coaching with journals and workbooks.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

### 4.2 Reading Offer Form

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/reading/page.tsx`**

Key form fields:
- Service name (text input)
- Description (rich text editor)
- Thumbnail upload
- Reading type selector (Tarot, Oracle, Psychic, Mediumship, Other)
- Delivery format (Live Video/Phone, Recorded Video, Recorded Audio, Written PDF)
- Fixed price input
- Turnaround days (slider 1-14 days)
- Include pull-card summary PDF? (checkbox)
- Include voice note? (checkbox)
- Deck used (optional text input)
- Terms & conditions (textarea)
- FAQ builder (add question/answer pairs)
- Questionnaire builder (add custom intake questions)
- Add-ons selector (link products from shop)

Submit button calls `create_reading_offer` mutation.

### 4.3 Healing Session Form

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/healing/page.tsx`**

Key form fields:
- Service name
- Description (rich text)
- Thumbnail upload
- Healing type (Reiki, Energy Work, Sound Healing, Crystal Healing, Intuitive, Other)
- Session location (In-Person / Distance)
- Booking type (Scheduled Appointment / Asynchronous - performed at your convenience)
- Pricing:
  - If scheduled: Hourly rate or fixed price + duration
  - If async: Fixed price + turnaround days
- Include energy report? (checkbox)
- Recommend crystals/tools from shop (product selector)
- Include follow-up reading? (checkbox + price)
- Terms & conditions
- FAQ builder
- Questionnaire builder

Submit button calls `create_healing_offer` mutation.

### 4.4 Coaching/Guidance Form

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/coaching/page.tsx`**

Key form fields:
- Service name
- Description (rich text)
- Thumbnail upload
- Session format (1-on-1 / Group)
  - If group: Max group size
- Delivery mode (Live Scheduled / Async Feedback)
- Pricing structure selector:
  - Single session (fixed price)
  - Package (builder for 3/6/12 session options with pricing)
- If async: Turnaround days
- Include journal PDF? (checkbox)
- Include workbook? (checkbox)
- Include post-session notes? (checkbox)
- Terms & conditions
- FAQ builder
- Questionnaire builder

Submit button calls `create_coaching_offer` mutation.

### 4.5 Shared Components

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/components/QuestionnaireBuilder.tsx`**

Reusable component for building intake questionnaires:
- Add question button
- Question types: Text, Textarea, Select (dropdown), Multi-select
- Mark as required
- Add placeholder text
- Reorder questions (drag & drop)
- Delete questions

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/create/components/AddOnSelector.tsx`**

Reusable component for linking products as add-ons:
- Search merchant's products
- Select products to offer as add-ons
- Mark as optional/required
- Set add-on pricing (if different from product price)

---

## Phase 5: Practitioner UI - Fulfillment

### 5.1 Orders to Fulfill Dashboard

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/orders/page.tsx`**

```tsx
'use client';

import { useQuery } from "@apollo/client";
import { MY_SERVICE_ORDERS } from "./hooks/UseMyServiceOrders";
import { ServiceOrderCard } from "./components/OrderCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ServiceOrdersPage({ params }) {
  const { merchant_slug } = params;

  const [statusFilter, setStatusFilter] = useState("PAID");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data, loading } = useQuery(MY_SERVICE_ORDERS, {
    variables: {
      vendorId: merchantId,  // Get from auth context
      status: statusFilter === "ALL" ? undefined : statusFilter,
      category: categoryFilter === "ALL" ? undefined : categoryFilter
    }
  });

  const orders = data?.myServiceOrders || [];

  // Group by status
  const paidOrders = orders.filter(o => o.status === "PAID");
  const inProgressOrders = orders.filter(o => o.status === "IN_PROGRESS");
  const deliveredOrders = orders.filter(o => o.status === "DELIVERED");

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Orders</h1>
          <p className="text-muted-foreground">Manage and fulfill your service orders</p>
        </div>
        <div className="flex gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <option value="ALL">All Categories</option>
            <option value="READING">Readings</option>
            <option value="HEALING">Healings</option>
            <option value="COACHING">Coaching</option>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="paid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="paid">
            To Fulfill <Badge className="ml-2">{paidOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress <Badge className="ml-2">{inProgressOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered <Badge className="ml-2">{deliveredOrders.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paid">
          {paidOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No orders waiting for fulfillment
            </div>
          ) : (
            <div className="grid gap-4">
              {paidOrders.map(order => (
                <ServiceOrderCard key={order.id} order={order} merchantSlug={merchant_slug} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress">
          {/* Similar for in-progress */}
        </TabsContent>

        <TabsContent value="delivered">
          {/* Similar for delivered */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/orders/components/OrderCard.tsx`**

```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Package } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export function ServiceOrderCard({ order, merchantSlug }) {
  const dueDate = order.service.turnaroundDays
    ? new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000)
    : null;

  const isOverdue = dueDate && new Date() > dueDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={order.service.category === "READING" ? "purple" : order.service.category === "HEALING" ? "green" : "blue"}>
                {order.service.category}
              </Badge>
              <h3 className="font-semibold">{order.service.name}</h3>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {order.customerName || order.customerId}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Purchased {format(new Date(order.purchaseDate), "MMM d, yyyy")}
              </span>
              {dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                  <Package className="h-4 w-4" />
                  Due {format(dueDate, "MMM d, yyyy")} {isOverdue && "(Overdue)"}
                </span>
              )}
            </div>
          </div>
          <Badge variant={order.status === "PAID" ? "default" : order.status === "IN_PROGRESS" ? "secondary" : "success"}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>

      {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
        <CardContent>
          <div className="text-sm">
            <p className="font-medium mb-2">Client Responses:</p>
            <ul className="space-y-1">
              {order.questionnaireResponses.slice(0, 2).map((response, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <span className="font-medium">{response.question}:</span> {response.answer}
                </li>
              ))}
              {order.questionnaireResponses.length > 2 && (
                <li className="text-muted-foreground italic">
                  +{order.questionnaireResponses.length - 2} more responses
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      )}

      <CardFooter>
        <Link href={`/m/${merchantSlug}/manage/services/orders/${order.id}`} className="w-full">
          <Button className="w-full">
            {order.status === "PAID" ? "Start Fulfillment" : "Continue Working"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

### 5.2 Fulfillment Interface

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/orders/[orderId]/page.tsx`**

```tsx
'use client';

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { SERVICE_ORDER_BY_ID } from "../hooks/UseServiceOrder";
import { UPLOAD_DELIVERABLE, MARK_DELIVERED } from "../hooks/UseFulfillment";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "../components/FileUploader";
import { DeliverablesList } from "../components/DeliverablesList";
import { QuestionnaireResponses } from "../components/QuestionnaireResponses";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function FulfillmentPage({ params }) {
  const { orderId, merchant_slug } = params;

  const [practitionerMessage, setPractitionerMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const { data, loading, refetch } = useQuery(SERVICE_ORDER_BY_ID, {
    variables: { orderId }
  });

  const [uploadDeliverable] = useMutation(UPLOAD_DELIVERABLE);
  const [markDelivered] = useMutation(MARK_DELIVERED);

  const order = data?.serviceOrderById;

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  const handleFileUpload = async (files) => {
    // Upload to Azure Blob Storage first (implement upload endpoint)
    // Then call uploadDeliverable mutation with file metadata

    for (const file of files) {
      // 1. Upload to blob storage
      const uploadUrl = await uploadToAzure(file);

      // 2. Save metadata
      await uploadDeliverable({
        variables: {
          input: {
            orderId,
            files: [{
              name: file.name,
              type: getFileType(file.type),
              mimeType: file.type,
              size: file.size,
              url: uploadUrl
            }],
            message: practitionerMessage
          }
        }
      });
    }

    refetch();
  };

  const handleMarkDelivered = async () => {
    if (!order.deliverables?.files || order.deliverables.files.length === 0) {
      alert("Please upload at least one file before marking as delivered");
      return;
    }

    await markDelivered({
      variables: { orderId }
    });

    // Show success message and redirect
    alert("Order marked as delivered! Customer has been notified.");
    window.location.href = `/m/${merchant_slug}/manage/services/orders`;
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href={`/m/${merchant_slug}/manage/services/orders`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge>{order.service.category}</Badge>
                <h1 className="text-2xl font-bold">{order.service.name}</h1>
              </div>
              <p className="text-muted-foreground">
                Order #{order.id.slice(0, 8)} • Purchased {format(new Date(order.purchaseDate), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <Badge variant={order.status === "DELIVERED" ? "success" : "default"}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Customer</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
            </div>
            <div>
              <p className="font-medium">Price</p>
              <p className="text-muted-foreground">
                {order.stripe.currency} {order.stripe.amount / 100}
              </p>
            </div>
            {order.service.turnaroundDays && (
              <div>
                <p className="font-medium">Due Date</p>
                <p className="text-muted-foreground">
                  {format(
                    new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000),
                    "MMM d, yyyy"
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questionnaire Responses */}
      {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Client Intake Responses</h2>
          </CardHeader>
          <CardContent>
            <QuestionnaireResponses responses={order.questionnaireResponses} />
          </CardContent>
        </Card>
      )}

      {/* Deliverables Section */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">Deliverables</h2>
          <p className="text-sm text-muted-foreground">
            Upload your reading, healing report, or session recording for the client
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing deliverables */}
          {order.deliverables?.files && order.deliverables.files.length > 0 && (
            <div>
              <p className="font-medium mb-2">Uploaded Files:</p>
              <DeliverablesList files={order.deliverables.files} />
            </div>
          )}

          {/* File uploader */}
          {order.status !== "DELIVERED" && (
            <>
              <Separator />
              <FileUploader onUpload={handleFileUpload} />
            </>
          )}

          {/* Practitioner message */}
          {order.status !== "DELIVERED" && (
            <>
              <Separator />
              <div>
                <label className="font-medium mb-2 block">Message for Client (Optional)</label>
                <Textarea
                  placeholder="Add any notes, instructions, or insights for the client..."
                  value={practitionerMessage}
                  onChange={(e) => setPractitionerMessage(e.target.value)}
                  rows={5}
                />
              </div>
            </>
          )}

          {/* Existing message */}
          {order.deliverables?.message && (
            <div>
              <p className="font-medium mb-2">Your Message:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.deliverables.message}
              </p>
            </div>
          )}
        </CardContent>

        {order.status !== "DELIVERED" && (
          <CardFooter>
            <Button
              onClick={handleMarkDelivered}
              disabled={!order.deliverables?.files || order.deliverables.files.length === 0}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Mark as Delivered & Notify Client
            </Button>
          </CardFooter>
        )}
      </Card>

      {order.status === "DELIVERED" && (
        <div className="text-center text-muted-foreground">
          <p>✓ This order was delivered on {format(new Date(order.deliverables.deliveredAt), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
      )}
    </div>
  );
}
```

**File: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/services/orders/components/FileUploader.tsx`**

```tsx
'use client';

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileVideo, FileAudio, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "video/*": [".mp4", ".mov"],
  "audio/*": [".mp3", ".m4a"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/*": [".jpg", ".jpeg", ".png"]
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export function FileUploader({ onUpload }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter(file => file.size <= MAX_FILE_SIZE);

    if (validFiles.length < acceptedFiles.length) {
      alert("Some files were too large (max 500MB per file)");
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      // Upload files (implement actual upload logic)
      await onUpload(files);

      // Clear files after successful upload
      setFiles([]);
      setProgress(100);
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith("video/")) return <FileVideo className="h-5 w-5" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-5 w-5" />;
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Accepted: Video (MP4, MOV), Audio (MP3, M4A), Documents (PDF, DOCX), Images (JPG, PNG)
          <br />
          Max file size: 500MB
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <div className="space-y-2">
          {uploading && <Progress value={progress} />}
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 6: Customer UI - Browse & Purchase

### 6.1 Service Discovery Page

**File: `/saas-frontend/src/app/(site)/services/page.tsx`**

Features:
- Display services in grid/list view
- Filter by category (tabs or dropdown)
- Filter by price range
- Search by practitioner or service name
- Service card showing:
  - Thumbnail
  - Service name
  - Practitioner name & avatar
  - Price
  - Category badge
  - Delivery format badge
  - Turnaround time
  - Rating (future)
- Click to view details

### 6.2 Service Details Page

**File: `/saas-frontend/src/app/(site)/services/[serviceId]/page.tsx`**

Structure:
- Hero section: Thumbnail, name, practitioner info, price, category
- Tabs: Description | Terms | FAQ
- Delivery information (format, turnaround)
- Questionnaire form (if service has intake questions)
- Add-ons selector (if service has add-ons)
- "Add to Cart" button
- Related services from same practitioner

### 6.3 Cart Integration

**File: `/saas-frontend/src/components/cart/CartItem.tsx`**

Extend to display service items:
- Show service thumbnail
- Display "Service" badge
- Show questionnaire summary
- Show selected add-ons
- No quantity selector (always 1)
- Remove from cart button

---

## Phase 7: Customer UI - My Services

### 7.1 Customer Services Dashboard

**File: `/saas-frontend/src/app/(site)/c/[customerId]/services/page.tsx`**

Features:
- List all purchased services
- Filter by status (All | Processing | Delivered)
- Card view per service:
  - Service thumbnail
  - Service name & category
  - Practitioner name
  - Purchase date
  - Status badge (Processing / Delivered)
  - "View Details" button
- Empty state for no services

### 7.2 Service Order Details Page

**File: `/saas-frontend/src/app/(site)/c/[customerId]/services/[orderId]/page.tsx`**

For In-Progress Orders:
- Show "Your [service name] is being prepared"
- Expected delivery date countdown
- Display questionnaire responses submitted
- "Message practitioner" button (future)

For Delivered Orders:
- Practitioner message display (if provided)
- Download section:
  - List all deliverable files with icons
  - Download buttons with signed URLs
  - Video/audio player embedded
  - Image gallery for images
- "Request re-delivery" button (future)
- "Leave a review" section (future)

---

## Phase 8: Email Notifications

### SendGrid Templates to Create:

1. **SERVICE_PURCHASED_PRACTITIONER**
   - Subject: "New Order: [Service Name]"
   - Content: Customer name, service name, purchase date, questionnaire responses, link to fulfillment dashboard

2. **SERVICE_PURCHASED_CUSTOMER**
   - Subject: "Your [Service Name] Purchase Confirmed"
   - Content: Service name, practitioner name, turnaround time, what to expect, order tracking link

3. **SERVICE_DELIVERED_CUSTOMER**
   - Subject: "Your [Service Name] is Ready!"
   - Content: Practitioner message preview, link to view/download deliverables, thank you message

4. **SERVICE_DELIVERED_PRACTITIONER**
   - Subject: "Delivery Confirmed: [Service Name]"
   - Content: Confirmation that customer was notified, link to view order, encourage follow-up

### Integration Points:

- **payment_intent_succeeded webhook**: Send emails #1 and #2
- **mark_service_delivered mutation**: Send emails #3 and #4

---

## Phase 9: Testing Checklist

### End-to-End Test Scenarios:

1. **Reading Service Flow**:
   - Create reading offer with questionnaire
   - Add to cart as customer
   - Complete checkout
   - Verify emails sent
   - Fulfill order with video file
   - Mark as delivered
   - Verify customer can download

2. **Healing Service Flow**:
   - Create distance healing (async)
   - Purchase with questionnaire responses
   - Upload energy report PDF + audio note
   - Deliver and verify notifications

3. **Coaching Service Flow**:
   - Create 6-session package
   - Purchase package
   - Track multi-session fulfillment
   - Deliver session recordings one by one

4. **Mixed Cart**:
   - Add service + product to cart
   - Ensure shipping skipped for service portion
   - Verify separate fulfillment flows

5. **File Upload**:
   - Test all file formats (MP4, MP3, PDF, PNG)
   - Test large files (near 500MB limit)
   - Test Azure Blob Storage integration
   - Verify signed URLs expire correctly

6. **Refund Flow**:
   - Request refund for unfulfilled service
   - Verify Stripe refund processes
   - Verify order status updates to REFUNDED

---

## Phase 10: Documentation

### Update CLAUDE.md:

Add section documenting:
- Service order lifecycle (purchase → fulfill → deliver)
- File storage architecture (Azure Blob)
- Category-specific features
- Integration with cart/checkout
- Email notification flow
- Async vs sync service distinction

### Create Merchant Guide:

- How to create each service type
- Best practices for turnaround times
- Tips for great service delivery
- How to link products as add-ons
- Managing orders efficiently

### Create Customer Help:

- How to purchase services
- When will I receive my service?
- How to download deliverables
- What if I have an issue?

---

## Implementation Priority

### Week 1: Backend Foundation
- Phase 1: Schema extensions (6 hours)
- Phase 2: Mutations & queries (12 hours)
- Phase 3: Cart integration (8 hours)
**Total: 26 hours**

### Week 2: Practitioner UI
- Phase 4: Service creation forms (16 hours)
- Phase 5: Fulfillment dashboard (14 hours)
**Total: 30 hours**

### Week 3: Customer UI
- Phase 6: Discovery & purchase (12 hours)
- Phase 7: My services dashboard (10 hours)
**Total: 22 hours**

### Week 4: Polish & Launch
- Phase 8: Email templates (4 hours)
- Phase 9: Testing (12 hours)
- Phase 10: Documentation (4 hours)
**Total: 20 hours**

### **Grand Total: ~100 hours (2.5 weeks full-time)**

---

## Key Technical Decisions Summary

1. **Schema**: Extend existing `service_type`, don't create separate async type
2. **Storage**: Azure Blob Storage with signed URLs (24hr expiry)
3. **Cart**: Services join products in unified cart, use existing checkout
4. **Payments**: Leverage existing Stripe integration via cart checkout
5. **Orders**: Store in `Main-Bookings` container, extend with deliverables
6. **Sync Services**: Keep infrastructure dormant, hide from UI for now
7. **Categories**: Hard-coded 3 categories with separate creation flows
8. **File Formats**: All supported (video, audio, docs, images)
9. **Fulfillment**: File upload → mark delivered → auto-notify customer
10. **Emails**: SendGrid templates triggered by webhook/mutation

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Large file uploads fail | Implement chunked uploads, resume capability |
| Blob storage costs spike | Monitor usage, implement file size limits, compress videos |
| Cart complexity increases | Keep service items simple, document edge cases |
| Practitioner confusion about async vs sync | Clear UI copy, hide sync options for launch |
| Customer expectations mismatch | Clear turnaround time display, email updates |
| Refund disputes | Terms enforcement, clear delivery proof |

---

## Future Enhancements (Post-MVP)

1. **Live Session Support**: Expose dormant sync infrastructure, add scheduling UI
2. **Video Chat Integration**: Zoom/Twilio integration for live sessions
3. **Subscription Services**: Recurring monthly readings/coaching
4. **Group Sessions**: Multi-customer bookings for workshops
5. **Session Replays**: Record and store live sessions automatically
6. **Advanced Analytics**: Track fulfillment times, customer satisfaction, repeat bookings
7. **Automated Reminders**: Email practitioners when orders nearing due date
8. **Customer Reviews**: Rating and review system for services
9. **Recommended Services**: Algorithm for personalized service suggestions
10. **Mobile App**: Native apps for easier file upload/download

---

End of Implementation Plan

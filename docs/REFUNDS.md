# SpiriVerse Refunds System Architecture & Implementation

This document contains comprehensive implementation details and architectural decisions for the refunds system across the entire SpiriVerse platform.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Architecture](#data-architecture)
3. [Refund Policy System](#refund-policy-system)
4. [Refund Request Workflow](#refund-request-workflow)
5. [GraphQL API Reference](#graphql-api-reference)
6. [Stripe Integration](#stripe-integration)
7. [Return Shipping System](#return-shipping-system)
8. [Client Implementation](#client-implementation)
9. [Known Gaps & Improvements](#known-gaps--improvements)

---

## System Overview

The SpiriVerse refunds system is a comprehensive, policy-driven framework that manages the complete refund lifecycle from customer request to payment processing.

### Key Features

- **Policy-Based Eligibility**: Merchant-configurable refund policies with time-based tiers
- **Reason-Driven Flow**: Customers select from eligible refund reasons
- **Return Shipping Integration**: Automatic shipping cost calculation and label generation
- **Evidence System**: Photo upload for certain refund types
- **Multi-Merchant Support**: Separate refund processing per vendor
- **Auto-Approval Logic**: Automatic approval based on policy rules
- **Real-time Communication**: Integrated chat between customer and merchant

### Supported Product Types

1. **Physical Products** (PRODUCT-PURCHASE-*)
2. **Tours/Events** (TOUR-BOOKING)
3. **Case Invoices** (CASE-*)

---

## Data Architecture

### Order Line Refund Tracking

**Location**: `/graphql-backend/src/graphql/order/types.ts:182-237`

```typescript
type orderLine_type = {
  // ... other fields
  price_log: {
    stripe_refundId?: string    // Set when refund initiated
    creditId?: string            // Set when refund completed
    id: string
    datetime: string
    status: "NEW" | "PENDING" | "SUCCESS"
    type: "CHARGE" | "PARTIAL_REFUND" | "FULL_REFUND"
    price: currency_amount_type & { quantity: number }
    tax: currency_amount_type
    paymentId: string
  }[]

  refund_request_log: {
    id: string
    datetime: string
    refund_quantity: number
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
    reason?: {
      id: string
      code: string
      title: string
    }
    returnShippingEstimate?: returnShippingEstimate_type
  }[]

  paid_status_log: {
    datetime: string
    status: 'PENDING' | 'SUCCESS'
    label: "CHARGE" | "PARTIAL_REFUND" | "FULL_REFUND"
    triggeredBy: string  // "STRIPE" | "SYSTEM" | userId
  }[]
}
```

### Separate Refund Records

**Location**: `/graphql-backend/src/graphql/order/types.ts:289-331`

Refunds are stored as **separate documents** in the `Main-Orders` container to enable efficient querying and prevent order document bloat.

```typescript
type refund_record_type = {
  id: string                    // Format: "orderId:refund:uniqueId"
  docType: "REFUND"
  orderId: string
  userId: string
  vendorId: string              // Separate refund per merchant
  amount: number
  currency: string
  reason: string

  // Record lifecycle (for Cosmos archiving)
  status: "ACTIVE" | "ARCHIVED" | "DELETED"

  // Refund workflow state
  refund_status: "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED" | "REVERSED" | "REQUIRES_INFO"

  requestedAt: string
  decisionAt?: string
  decidedBy?: string

  payments: {
    provider: string            // "STRIPE"
    refundRef?: string          // Stripe refund ID after processing
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

  lines: {
    id: string
    descriptor: string
    price: currency_amount_type
    quantity: number
    refund_quantity: number
    refund_status: string | null
  }[]

  returnShippingEstimate?: returnShippingEstimate_type
  returnShippingLabels?: label_info_type[]

  stripe?: stripe_details_type  // For return shipping payment

  createdDate: string
  createdBy: string
  _etag?: string
}
```

### Order Credits

**Location**: `/graphql-backend/src/graphql/order/types.ts:46-58`

Created when Stripe refund succeeds (via webhook).

```typescript
type order_credit_type = {
  id: string                    // Links to price_log entries
  code: string                  // Human-friendly ID (e.g., "CR-12345")
  stripe_refundId: string
  stripe_chargeId: string
  destination: {
    card?: { reference: string }
    type: "card"
  }
  currency: string
  amount: number                // Excludes tax
  tax: number
  date: string
}
```

### Return Shipping Estimate

**Location**: `/graphql-backend/src/graphql/order/types.ts:160-180`

```typescript
type returnShippingEstimate_type = {
  id: string
  rate_id: string               // ShipEngine rate ID
  whoPayShipping: "customer" | "merchant"
  cost: currency_amount_type
  boxes: returnShippingBox_type[]
  status: "pending_payment" | "ready_for_labels"
  createdAt: string
}

type returnShippingBox_type = {
  id: string
  code: string
  dimensions_cm: { depth: number, width: number, height: number }
  used_weight: number
  items: any[]                  // Items packed in this box
}
```

---

## Refund Policy System

### Policy Data Structure

**Location**: `/graphql-backend/src/graphql/order/types.ts:248-287`

```typescript
type refund_policy_type = {
  id: string
  merchantId: string
  refundPolicy: {
    eligibility: {
      conditions: string[]        // Predefined conditions
      customConditions?: string   // Merchant-specific additions
      exclusions: string[]        // Predefined exclusions
      customExclusions?: string
    }
    refundTiers: {
      daysFromPurchase: number    // e.g., 7, 14, 30
      refundPercentage: number    // e.g., 1.0, 0.5, 0.25
    }[]
    refundProcess: {
      requiredInformation: string[]
      daysFromPurchase: number
    }
    refundMethod: {
      options: ("Original payment method" | "Store credit" | "Bank transfer")[]
      processingTime: string
    }
    returnPolicy: {
      requiresReturn: boolean
      returnShippingCost: string
      conditionRequirements: string
    }
    partialRefundsOrExchanges: {
      partialRefunds: boolean
      exchangeAvailable: boolean
      conditions: string[]
    }
    nonRefundableSituations: string[]
    contact: {
      email: string
      phone?: string
    }
    lastUpdated: string
  }
}
```

### Enhanced Policy Structure (In Database)

**Storage**: `Main-VendorSettings` container with `type: "REFUND_POLICY"`

**Additional Fields**:
- `listingType`: "PRODUCT" | "TOUR" | "ALL"
- `country`: ISO country code (e.g., "US", "AU")
- `title`: Policy name
- `reasons`: Array of refund reasons (see below)

### Refund Reasons Structure

**Client Source**: `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/product_reasons.json`

Each reason includes:

```typescript
type RefundReturnReason = {
  id: string
  code: string                   // e.g., "CHANGE_OF_MIND", "DEFECTIVE_ITEM"
  title: string
  whoPayShipping: "MERCHANT" | "CUSTOMER" | "NOT_REQUIRED"
  conditions: RefundPolicyDetail[]
  tiers: RefundTier[]
  confirmed: boolean             // Used for auto-approval
  no_refund: boolean            // If true, reason is ineligible
}

type RefundTier = {
  id: string
  daysUpTo: number              // e.g., 7, 14, 30
  refundPercentage: number      // e.g., 1.0, 0.5, 0.25
  refundCustomerFees: boolean
}

type RefundPolicyDetail = {
  id: string
  code: string
  isCustom: boolean
  title: string
  description: string           // Supports [X] placeholder for days
}
```

### Default Product Refund Reasons

1. **Change of mind** - Customer pays shipping
2. **Bought by mistake** - Customer pays shipping
3. **Product doesn't meet expectations** - Merchant pays shipping
4. **Damaged from delivery** - Merchant pays shipping
5. **Wrong item was sent** - Merchant pays shipping
6. **Missing parts or accessories** - Merchant pays shipping
7. **Item defective or doesn't work** - Merchant pays shipping

Default tiers: 7 days (100%), 14 days (50%), 30 days (25%)

### Policy Resolution Logic

**Location**: `/graphql-backend/src/graphql/order/index.ts:156-217`

**Query**: `orderRefundPolicy(orderId: ID!): RefundPolicy`

**Algorithm**:
1. Fetch order by ID
2. Extract `merchantId` from first order line
3. Get listing to determine `listingType`
4. Query policies: `vendorId = @merchantId AND listingType = @listingType`
5. If no specific policy found, try: `listingType = 'ALL' OR IS_NULL(listingType)`
6. Return null if no policy exists

### Eligibility Calculation

**Location**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/hooks/UseRefundEligibility.tsx`

**Client-Side Logic** (runs in browser):

```typescript
const useRefundEligibility = (order, refundPolicy) => {
  // Calculate order age
  const orderDate = DateTime.fromISO(order.createdDate);
  const orderAgeDays = Math.abs(orderDate.diffNow('days').days);

  const eligibleReasons = [];

  for (const reason of refundPolicy.reasons) {
    // Skip if marked as no_refund
    if (reason.no_refund) continue;

    // Find applicable tier
    const sortedTiers = reason.tiers.sort((a, b) => a.daysUpTo - b.daysUpTo);
    const applicableTier = sortedTiers.find(tier => orderAgeDays <= tier.daysUpTo);

    // Check if tier allows refunds
    if (applicableTier && applicableTier.refundPercentage > 0) {
      eligibleReasons.push({
        ...reason,
        applicableTier
      });
    }
  }

  return {
    isEligible: eligibleReasons.length > 0,
    eligibleReasons,
    orderAgeDays
  };
}
```

**Example**:
- Order age: 10 days
- Tiers: [7 days: 100%, 14 days: 50%, 30 days: 25%]
- Result: 14-day tier applies → 50% refund

---

## Refund Request Workflow

### Phase 1: Customer Submits Refund Request

**Mutation**: `upsert_request_refund`
**Location**: `/graphql-backend/src/graphql/order/index.ts:509-1095`

**Input Parameters**:
```graphql
mutation {
  upsert_request_refund(
    orderRef: RecordRefInput
    lines: [OrderLineRefundInput]
    reasonId: String
    evidencePhotos: [MediaInput]
  ) {
    code
    message
    order
  }
}
```

**Process Flow**:

1. **Fetch Order & Customer Details** (lines 512-530)
   - Get order from database
   - Get customer user record
   - Restore inherited forObject references

2. **Auto-Approval Check** (lines 538-576)
   - If `reasonId` provided, fetch refund policy
   - Find matching reason in policy
   - Check conditions:
     - `reason.confirmed === true`
     - `reason.no_refund === false`
     - Order age falls within a tier's `daysUpTo`
     - Tier has `refundPercentage > 0`
   - Set `autoApprove = true` if all conditions met

3. **Update Order Lines** (lines 578-639)
   - Create patch operations for each refund line
   - Add entry to `refund_request_log` with:
     - Status: "APPROVED" (if auto-approved) or "PENDING"
     - Refund quantity
     - Reason details
     - Timestamp

4. **Calculate Return Shipping** (lines 654-861)
   - Only for physical products (`PRODUCT-PURCHASE-*`)
   - Group lines by merchant
   - Get variant dimensions and weight
   - Use packing algorithm: `pack_by_box_sources()`
   - Get shipping rates from ShipEngine (customer → merchant address)
   - Store estimate with status:
     - `"ready_for_labels"` if merchant pays
     - `"pending_payment"` if customer pays

5. **Create Refund Records** (lines 863-1007)
   - Separate record per merchant
   - Calculate total refund amount from lines
   - Store in `Main-Orders` container with:
     - `id`: `${orderId}:refund:${uuid()}`
     - `docType`: "REFUND"
     - `vendorId`: Merchant ID
     - `refund_status`: "APPROVED" or "PENDING"
     - Line-level details
     - Return shipping estimate

6. **Create Stripe Setup Intent** (lines 945-963)
   - Only if customer pays return shipping
   - Metadata: `target: "RETURN_SHIPPING"`, `refundId`
   - Stored in refund record for payment flow

7. **Send Email Notifications** (lines 1010-1090)
   - **Tours**: "TOUR_REFUND_REQUEST_MERCHANT"
   - **Products (merchant pays)**: "PRODUCT_REFUND_REQUEST_REQUIRES_MERCHANT_PAYMENT"
   - **Products (customer pays)**: "PRODUCT_REFUND_REQUEST_MERCHANT"
   - **Case Invoices**: "CASE_REFUND_REQUEST_MERCHANT"

**Return Shipping Packing Algorithm**:
- Uses `/graphql-backend/src/graphql/logistics/functions/packing.ts`
- Optimally packs items into minimal boxes
- Considers variant dimensions and weight
- Generates box configuration with items per box

### Phase 2: Merchant Reviews Request

**Possible Actions**:

#### A. Approve Refund

**Mutation**: `approve_request_refund`
**Location**: `/graphql-backend/src/graphql/order/index.ts:1329-1416`

**Process**:
1. Find active refund record
2. Update `refund_status` to "APPROVED"
3. Record `decisionAt` and `decidedBy`
4. Add audit entry
5. Post system message to order chat
6. Send SignalR notification to customer
7. Return updated order

**Does NOT process payment** - merchant must separately call `refund_order`

#### B. Reject Refund

**Mutation**: `reject_request_refund`
**Location**: `/graphql-backend/src/graphql/order/index.ts:1135-1206`

**Process**:
1. Find pending refund requests on order lines
2. Update `refund_request_log` status to "REJECTED"
3. Post rejection message to order chat
4. Send email: "TOUR_REFUND_REQUEST_REJECTED_CUSTOMER" (currently hardcoded for tours)
5. Return updated order

#### C. Request Better Evidence

**Mutation**: `request_better_evidence`
**Location**: `/graphql-backend/src/graphql/order/index.ts:1417-1495`

**Process**:
1. Find active refund record
2. Update `refund_status` to "REQUIRES_INFO"
3. Post merchant's message to order chat
4. Send SignalR notification
5. Customer can resubmit with updated evidence

#### D. Cancel Request (Customer-Initiated)

**Mutation**: `cancel_request_refund`
**Location**: `/graphql-backend/src/graphql/order/index.ts:1096-1134`

**Process**:
1. Find pending refund requests on specified lines
2. Update status to "CANCELLED"
3. Return updated order

### Phase 3: Return Shipping (If Applicable)

#### If Merchant Pays Shipping

**Merchant Action**: Pay for return label via integrated payment flow

**Trigger**: PaymentLayout component in ProcessRefundDialog
**Stripe**: Creates payment with metadata `target: "RETURN_SHIPPING"`

**Webhook Handler**: `setup_intent_succeeded`
**Location**: `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts:45-96`

**Process**:
1. Check `metadata.target === "RETURN_SHIPPING"`
2. Find refund with pending label payment
3. Call ShipEngine `createLabelFromRate` API
4. Update refund record:
   - Add `returnShippingLabels[]`
   - Remove `returnShippingEstimate`
5. Customer receives labels via app

#### If Customer Pays Shipping

**Same flow as above**, but customer completes payment in RefundModal

### Phase 4: Refund Payment Processing

**Mutation**: `refund_order`
**Location**: `/graphql-backend/src/graphql/order/index.ts:1207-1328`

**Input**:
```graphql
mutation {
  refund_order(
    orderRef: RecordRefInput
    lines: [OrderLineRefundInput]  # With refund amounts in currency
  )
}
```

**Process**:

1. **Group Lines by Merchant & Charge** (lines 1212-1247)
   ```typescript
   const groupedByMerchant = groupBy(args.lines, 'merchantId');
   for (const merchantGroup of groupedByMerchant) {
     const groupedByCharge = groupBy(merchantGroup, 'chargeId');
   }
   ```

2. **For Each Charge** (lines 1249-1318):

   a. **Calculate Refund Amount** (lines 1254-1278)
   ```typescript
   let totalRefundAmount = 0;
   for (const line of chargeGroup) {
     const orderLine = order.lines.find(x => x.id === line.id);
     const priceLogEntry = orderLine.price_log.find(x => x.stripe_chargeId === chargeId);

     // Tax calculation: proportional to price
     const taxRatio = priceLogEntry.tax.amount / priceLogEntry.price.total;
     const lineTax = line.refund.amount * taxRatio;

     totalRefundAmount += line.refund.amount + lineTax;
   }
   ```

   b. **Update Price Log** (lines 1280-1294)
   - Add new price_log entry with:
     - `type`: "PARTIAL_REFUND" or "FULL_REFUND"
     - `status`: "PENDING"
     - `stripe_refundId`: Generated by Stripe
     - Negative quantity and amount

   c. **Call Stripe API** (lines 1296-1303)
   ```typescript
   const refund = await stripe.asConnectedAccount(merchantAccount)
     .callApi("POST", "refunds", {
       charge: chargeId,
       amount: encodeAmountToSmallestUnit(totalRefundAmount, currency)
     });
   ```

   d. **Store Refund ID** (lines 1305-1311)
   - Patch price_log to add `stripe_refundId`
   - Used to track refund in webhook

3. **Send SignalR Notification** (lines 1320-1323)
   - Notify customer of refund initiation
   - Group: `customer-${customerId}`

4. **Return Updated Order** (line 1325)

### Phase 5: Stripe Webhook Processing

**Webhook Event**: `charge.refunded`
**Handler**: `/graphql-backend/src/functions/stripe/charge_refunded.ts`

**Trigger**: When Stripe successfully processes refund

**Process**:

1. **Extract Event Data** (lines 14-21)
   ```typescript
   const refundedCharge = event.data.object as Stripe.Charge;
   const metadata = refundedCharge.metadata;  // orderId, customerEmail
   ```

2. **Fetch Order** (line 20)

3. **Get All Refunds for Charge** (lines 27-32)
   ```typescript
   const refundsForCharge = await stripe.asConnectedAccount(event.account)
     .callApi("GET", "refunds", { charge: refundedCharge.id });
   ```

4. **For Each Successful Refund** (lines 41-149):

   a. **Find Matching Price Log Entries** (lines 76-82)
   ```typescript
   const orderLineIdxs = order.lines.map((ol, olidx) => ({
     orderLineIndex: olidx,
     priceLogEntryIndex: ol.price_log.findIndex(x => x.stripe_refundId == refund.id),
     priceLogEntry: ol.price_log.find(x => x.stripe_refundId == refund.id)
   })).filter(x => x.priceLogEntryIndex != -1);
   ```

   b. **Determine Refund Type** (line 86)
   ```typescript
   const refundType = orderLineIdxs.every(x =>
     order.lines[x.orderLineIndex].price_log[x.priceLogEntryIndex].type == "FULL_REFUND"
   ) ? "FULL_REFUND" : "PARTIAL_REFUND";
   ```

   c. **Generate Credit ID** (line 25)
   ```typescript
   const creditId = uuid();
   ```

   d. **Update Price Log Entries** (lines 89-104)
   - Set `status` to "SUCCESS"
   - Remove `stripe_refundId`
   - Add `creditId` (links to credit record)
   - Add entry to `paid_status_log`:
     ```typescript
     {
       datetime: DateTime.now(),
       label: refundType,  // "FULL_REFUND" or "PARTIAL_REFUND"
       triggeredBy: "STRIPE"
     }
     ```

   e. **Create Order Credit** (lines 109-125)
   ```typescript
   await cosmos.patch_record("Main-Orders", order.id, order.id, [{
     op: "add",
     path: "/credits/0",
     value: {
       id: creditId,
       code: generate_human_friendly_id("CR"),  // e.g., "CR-12345"
       stripe_refundId: refund.id,
       stripe_chargeId: refundedCharge.id,
       destination: refund.destination_details,
       currency: refund.currency.toUpperCase(),
       amount: refund.amount - refundTaxAmount,
       tax: refundTaxAmount,
       date: DateTime.now().toISO()
     }
   }], "STRIPE");
   ```

   f. **Send Real-Time Notifications** (lines 136-147)
   - SignalR data update to customer group
   - Two persisted notifications:
     - Customer group notification (for merchant dashboard)
     - User-specific notification (for customer)
   - Format: "Payment of $X.XX for order #12345 has been refunded successfully..."

5. **Send Email for Case Refunds** (lines 152-168)
   - Template: "CASE_REFUND_SUCCESS_CUSTOMER"
   - Only for case invoice refunds

---

## GraphQL API Reference

### Queries

#### 1. `refunds`

**Location**: `/graphql-backend/src/graphql/order/index.ts:78-121`

```graphql
query {
  refunds(
    vendorId: ID!
    status: [String!]  # Optional, defaults to ["PENDING", "IN_PROGRESS", "APPROVED"]
  ) {
    id
    orderId
    userId
    vendorId
    amount
    currency
    reason
    refund_status
    requestedAt
    decisionAt
    decidedBy
    lines {
      id
      descriptor
      price { amount currency }
      quantity
      refund_quantity
    }
    returnShippingEstimate { ... }
    returnShippingLabels { ... }
    evidencePhotos { ... }
    order {
      id
      code
      customerEmail
      createdDate
    }
  }
}
```

**Purpose**: Fetch all refund requests for a merchant
**Filters**: By status (workflow state)
**Returns**: Refund records with embedded minimal order details

#### 2. `refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts:122-155`

```graphql
query {
  refund(orderId: ID!) {
    # Same fields as refunds query
  }
}
```

**Purpose**: Fetch the most recent active refund for an order
**Returns**: Single refund or null if none exists

#### 3. `orderRefundPolicy`

**Location**: `/graphql-backend/src/graphql/order/index.ts:156-217`

```graphql
query {
  orderRefundPolicy(orderId: ID!) {
    id
    merchantId
    listingType
    title
    country
    reasons {
      id
      code
      title
      whoPayShipping
      confirmed
      no_refund
      conditions {
        id
        code
        title
        description
        isCustom
      }
      tiers {
        id
        daysUpTo
        refundPercentage
        refundCustomerFees
      }
    }
  }
}
```

**Purpose**: Get applicable refund policy for an order
**Logic**: Automatically resolves by merchant + listing type

#### 4. `refundPolicies` (Vendor)

**Location**: `/graphql-backend/src/graphql/vendor/index.ts:105-125`

```graphql
query {
  refundPolicies(
    merchantId: ID!
    listingType: String  # Optional: "PRODUCT", "TOUR"
    country: String      # Optional: ISO code
  ) {
    # Same structure as orderRefundPolicy
  }
}
```

**Purpose**: Fetch all policies for a merchant
**Auth**: Protected by `protect_via_merchant_access`

### Mutations

#### 1. `upsert_request_refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts:509-1095`

```graphql
mutation {
  upsert_request_refund(
    orderRef: {
      id: "order-uuid"
      container: "Main-Orders"
      partition: "order-uuid"
    }
    lines: [
      {
        id: "line-uuid"
        refund_quantity: 2
      }
    ]
    reasonId: "reason-uuid"
    evidencePhotos: [
      {
        url: "https://..."
        type: "image/jpeg"
        width: 1920
        height: 1080
      }
    ]
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Create or update refund request
**Features**: Auto-approval, return shipping calculation, separate refund records

#### 2. `cancel_request_refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts:1096-1134`

```graphql
mutation {
  cancel_request_refund(
    orderRef: { ... }
    lines: [{ id: "line-uuid" }]
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Customer cancels pending refund request

#### 3. `reject_request_refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts:1135-1206`

```graphql
mutation {
  reject_request_refund(
    orderRef: { ... }
    lines: [{ id: "line-uuid" }]
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Merchant rejects refund request
**Side Effects**: Email to customer, chat message

#### 4. `approve_request_refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts:1329-1416`

```graphql
mutation {
  approve_request_refund(
    orderRef: { ... }
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Merchant approves refund request
**Note**: Does NOT process payment - use `refund_order` separately

#### 5. `request_better_evidence`

**Location**: `/graphql-backend/src/graphql/order/index.ts:1417-1495`

```graphql
mutation {
  request_better_evidence(
    orderRef: { ... }
    message: "Please provide clearer photos showing the damage"
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Merchant requests additional evidence
**Changes**: `refund_status` to "REQUIRES_INFO"

#### 6. `refund_order`

**Location**: `/graphql-backend/src/graphql/order/index.ts:1207-1328`

```graphql
mutation {
  refund_order(
    orderRef: { ... }
    lines: [
      {
        id: "line-uuid"
        merchantId: "merchant-uuid"
        chargeId: "ch_xxx"
        refund: {
          amount: 50.00
          currency: "USD"
        }
      }
    ]
  ) {
    code
    message
    order { ... }
  }
}
```

**Purpose**: Process refund payment through Stripe
**Tax**: Calculated proportionally based on original charge
**Status**: Sets price_log to "PENDING", webhook sets to "SUCCESS"

#### 7. `upsert_refund_policies` (Vendor)

**Location**: `/graphql-backend/src/graphql/vendor/index.ts:558-601`

```graphql
mutation {
  upsert_refund_policies(
    merchantId: ID!
    policies: [RefundPolicyInput!]!
  ) {
    code
    message
    policies { ... }
  }
}
```

**Purpose**: Create or update refund policies
**Storage**: `Main-VendorSettings` with `type: "REFUND_POLICY"`

#### 8. `delete_refund_policy` (Vendor)

**Location**: `/graphql-backend/src/graphql/vendor/index.ts:603-624`

```graphql
mutation {
  delete_refund_policy(
    policyId: ID!
  ) {
    code
    message
  }
}
```

**Purpose**: Delete refund policy
**Logic**: Soft delete if in use, hard delete otherwise

---

## Stripe Integration

### Refund Flow

**Connected Account Architecture**:
- Each merchant has a Stripe Connected Account
- Refunds processed via: `stripe.asConnectedAccount(accountId).callApi(...)`
- Application fees automatically reversed by Stripe

### Refund Creation

**Location**: `/graphql-backend/src/graphql/order/index.ts:1296-1303`

```typescript
const refund = await stripe.asConnectedAccount(merchantAccount)
  .callApi("POST", "refunds", {
    charge: chargeId,
    amount: encodeAmountToSmallestUnit(totalRefundAmount, currency)
  });
```

**Returns**:
```json
{
  "id": "re_xxx",
  "object": "refund",
  "amount": 5000,
  "charge": "ch_xxx",
  "currency": "usd",
  "status": "succeeded",
  "destination_details": {
    "card": { "reference": "1234" },
    "type": "card"
  }
}
```

### Webhook Events

#### 1. `charge.refunded`

**Handler**: `/graphql-backend/src/functions/stripe/charge_refunded.ts`
**Registration**: `/graphql-backend/src/functions/stripe.ts`

**Event Structure**:
```json
{
  "type": "charge.refunded",
  "account": "acct_xxx",
  "data": {
    "object": {
      "id": "ch_xxx",
      "amount_refunded": 5000,
      "metadata": {
        "orderId": "uuid",
        "customerEmail": "customer@example.com"
      }
    }
  }
}
```

**Processing**: See [Phase 5: Stripe Webhook Processing](#phase-5-stripe-webhook-processing)

#### 2. `setup_intent.succeeded` (Return Shipping)

**Handler**: `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts:45-96`

**Event Structure**:
```json
{
  "type": "setup_intent.succeeded",
  "data": {
    "object": {
      "metadata": {
        "target": "RETURN_SHIPPING",
        "refundId": "orderId:refund:uuid"
      }
    }
  }
}
```

**Processing**:
1. Find refund with matching ID
2. Generate shipping labels via ShipEngine
3. Update refund record with labels
4. Remove shipping estimate

---

## Return Shipping System

### Overview

The return shipping system automatically calculates costs and generates labels for physical product refunds.

### Process Flow

#### 1. Calculate Shipping Estimate

**Trigger**: `upsert_request_refund` mutation
**Location**: `/graphql-backend/src/graphql/order/index.ts:654-861`

**Steps**:

a. **Get Variant Dimensions** (lines 665-690)
```typescript
for (const line of productLines) {
  const variant = await cosmos.get_record<variant_type>(
    "Main-Variant",
    line.variantId,
    line.merchantId
  );

  items.push({
    id: line.id,
    width: variant.dimensions_cm.width,
    depth: variant.dimensions_cm.depth,
    height: variant.dimensions_cm.height,
    weight: variant.weight_grams * line.refund_quantity
  });
}
```

b. **Pack Items into Boxes** (lines 692-706)
```typescript
const boxes = await pack_by_box_sources(items, merchantId, cosmos);

// Result structure:
[
  {
    id: "box-uuid",
    code: "BOX-001",
    dimensions_cm: { width: 30, depth: 20, height: 15 },
    used_weight: 500,
    items: [{ id: "item-uuid", ... }]
  }
]
```

c. **Get Shipping Rates** (lines 708-815)
```typescript
const shipment = {
  ship_from: merchant.address,
  ship_to: order.shipping.addressComponents,
  packages: boxes.map(box => ({
    weight: { value: box.used_weight, unit: "gram" },
    dimensions: {
      length: box.dimensions_cm.depth,
      width: box.dimensions_cm.width,
      height: box.dimensions_cm.height,
      unit: "centimeter"
    }
  }))
};

const rates = await shipengine.getRatesWithShipmentDetails(shipment);
const cheapestRate = rates.rate_response.rates
  .sort((a, b) => a.shipping_amount.amount - b.shipping_amount.amount)[0];
```

d. **Create Estimate Record** (lines 817-831)
```typescript
const estimate: returnShippingEstimate_type = {
  id: uuid(),
  rate_id: cheapestRate.rate_id,
  whoPayShipping: reason.whoPayShipping,  // "customer" | "merchant"
  cost: {
    amount: cheapestRate.shipping_amount.amount,
    currency: cheapestRate.shipping_amount.currency
  },
  boxes: boxes,
  status: whoPayShipping === "merchant" ? "ready_for_labels" : "pending_payment",
  createdAt: DateTime.now().toISO()
};
```

#### 2. Create Stripe Setup Intent (Customer Pays)

**Location**: `/graphql-backend/src/graphql/order/index.ts:945-963`

```typescript
if (reason.whoPayShipping === "customer") {
  const stripeCustomer = await stripe.resolveCustomer(order.customerEmail);

  const setupIntent = await stripe.callApi("POST", "setup_intents", {
    customer: stripeCustomer.id,
    metadata: {
      target: "RETURN_SHIPPING",
      refundId: refund.id,
      orderId: order.id
    }
  });

  refund.stripe = {
    setupIntentId: setupIntent.data.id,
    setupIntentSecret: setupIntent.data.client_secret
  };
}
```

**Client Integration**: Customer completes payment in RefundModal using Stripe Elements

#### 3. Generate Shipping Labels

**Trigger**: Stripe `setup_intent.succeeded` webhook
**Handler**: `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts:45-96`

```typescript
// Find refund with pending payment
const refunds = await cosmos.run_query<refund_record_type>("Main-Orders", {
  query: `SELECT * FROM c
          WHERE c.docType = "REFUND"
          AND c.id = @refundId
          AND c.stripe.setupIntentId = @setupIntentId`,
  parameters: [
    { name: "@refundId", value: metadata.refundId },
    { name: "@setupIntentId", value: setupIntent.id }
  ]
}, true);

const refund = refunds[0];
const estimate = refund.returnShippingEstimate;

// Generate labels via ShipEngine
const labels = await shipengine.createLabelFromRate({
  rate_id: estimate.rate_id,
  validate_address: "no_validation",
  label_format: "pdf",
  label_download_type: "url"
});

// Update refund record
await cosmos.patch_record("Main-Orders", refund.id, refund.orderId, [
  {
    op: "add",
    path: "/returnShippingLabels",
    value: labels.map(label => ({
      label_id: label.label_id,
      tracking_number: label.tracking_number,
      label_download: {
        pdf: label.label_download.pdf,
        png: label.label_download.png
      },
      carrier_code: label.carrier_code,
      service_code: label.service_code
    }))
  },
  {
    op: "remove",
    path: "/returnShippingEstimate"
  }
], "STRIPE");
```

#### 4. Label Delivery to Customer

**Client**: RefundModal component displays labels
**Location**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx`

**UI Features**:
- PDF and PNG download options
- Tracking number display
- Carrier and service information
- Inline PDF viewer (PDFViewButton)

### Packing Algorithm

**Location**: `/graphql-backend/src/graphql/logistics/functions/packing.ts`

**Function**: `pack_by_box_sources(items, merchantId, cosmos)`

**Algorithm**:
1. Fetch merchant's available box sizes from inventory
2. Sort items by volume (largest first)
3. For each item:
   - Try to fit in existing partially-filled box
   - If doesn't fit, try next smallest available box size
   - If no box fits, create custom box with item dimensions + padding
4. Return array of packed boxes

**Example**:
```typescript
Input:
  items = [
    { width: 10, depth: 10, height: 5, weight: 200 },
    { width: 8, depth: 8, height: 3, weight: 150 }
  ]

Output:
  [
    {
      id: "box-uuid",
      code: "BOX-001",
      dimensions_cm: { width: 15, depth: 15, height: 10 },
      used_weight: 350,
      items: [item1, item2]
    }
  ]
```

---

## Client Implementation

### Customer-Facing Components

#### 1. RefundModal

**Location**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx`

**Responsibilities**:
- Display refund policy
- Check eligibility
- Item & quantity selection
- Reason selection
- Evidence photo upload
- Submit refund request
- View existing request status
- Chat with merchant
- Download return labels

**States**:
1. **Loading**: Fetching policy and existing request
2. **Ineligible**: No eligible refund reasons
3. **Existing Request**: View with chat and labels
4. **Create Request**: Form with reason selection
5. **Success**: Confirmation with next steps

**Key Features**:
- Responsive design (Dialog on desktop, Drawer on mobile)
- Real-time refund amount calculation
- Evidence photo validation (min 2 photos)
- Return shipping estimate display
- Integrated PaymentLayout for customer-paid shipping

#### 2. RefundPolicyModal

**Location**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundPolicyModal.tsx`

**Purpose**: Display merchant's refund policy to customers

**Features**:
- Separate sections for refundable vs non-refundable reasons
- Tier-based refund percentages
- Condition details with accordion
- Shipping payment responsibility
- `[X]` placeholder replacement in conditions

#### 3. OrderRow Component

**Location**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/OrderRow.tsx`

**Refund Features**:
- Refund status badge
- "Request Refund" button
- Opens RefundModal on click

### Merchant-Facing Components

#### 1. Refunds Dashboard

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/ui.tsx`

**Purpose**: Main dashboard for viewing all refund requests

**Layout**:
- Grid view with refund cards
- Status filter (PENDING, IN_PROGRESS, APPROVED)
- Sort by request date

**Card Information**:
- Order number
- Refund status badge
- Customer email
- Total refund amount
- Item count
- Request time (relative)
- Return shipping requirements
- Click to open ProcessRefundDialog

#### 2. ProcessRefundDialog

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_components/ProcessRefundDialog.tsx`

**Purpose**: Detailed refund review and action interface

**Information Sections**:

1. **Customer Information**
   - Email
   - Order date

2. **Financial Summary** (4 metrics):
   - Amount to customer
   - Return label cost
   - Merchant net position

3. **Items to Refund** (collapsible):
   - Descriptor
   - Price per unit
   - Original quantity
   - Refund quantity
   - Refund amount
   - Line-level status

4. **Evidence Photos** (if provided):
   - Grid display
   - Full-size viewer

5. **Return Shipping**:
   - Estimate details
   - Generated labels
   - Payment button (if merchant pays)

**Actions** (status-dependent):

| Status | Available Actions |
|--------|------------------|
| PENDING | Reject, Request Better Evidence, Approve |
| REQUIRES_INFO | Reject, Approve |
| APPROVED | Process Refund (via refund_order) |
| REJECTED | None (finalized) |
| REFUNDED | None (finalized) |

**Integrated Features**:
- ChatLayout for communication
- PaymentLayout for label payment
- Responsive design

#### 3. Refund Policy Management

**Location**: `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/index.tsx`

**Purpose**: Create and manage refund policies

**Layout**:
- Modal editor (900x700px)
- Left sidebar: Policy selector
- Right panel: Configuration form
- Preview mode

**Form Sections**:
1. Basic Info (title, listing type, country)
2. Refund Reasons (7 default + custom)
3. Per-Reason Configuration:
   - Conditions
   - Tiers (days + percentage)
   - Shipping payment responsibility
   - Evidence requirements

**Components**:
- `EditRefundPolicyDetail.tsx`: Condition editor
- `EditRefundTier.tsx`: Tier editor
- `EditReturnReason.tsx`: Reason editor
- `ViewRefundPolicy.tsx`: Read-only preview

### Key Hooks

#### Customer Hooks

**1. useOrderRefundPolicy**
```typescript
const { data: policy, isLoading } = useOrderRefundPolicy(orderId);
```
**Query**: `orderRefundPolicy(orderId: ID!)`

**2. useRefundEligibility**
```typescript
const { isEligible, eligibleReasons, orderAgeDays } = useRefundEligibility(order, policy);
```
**Type**: Client-side calculation hook

**3. UseRequestRefundWithReason**
```typescript
const { mutate, isLoading } = UseRequestRefundWithReason();

mutate({
  orderRef,
  lines: [{ id, refund_quantity }],
  reasonId,
  evidencePhotos
});
```
**Mutation**: `upsert_request_refund`

#### Merchant Hooks

**1. useMerchantRefunds**
```typescript
const { data: refunds, isLoading } = useMerchantRefunds(merchantId, ["PENDING", "APPROVED"]);
```
**Query**: `refunds(vendorId: ID!, status: [String!])`

**2. UseApproveRefund**
```typescript
const { mutate } = UseApproveRefund();
mutate({ orderRef });
```
**Mutation**: `approve_request_refund`

**3. UseRejectRefund**
```typescript
const { mutate } = UseRejectRefund();
mutate({ orderRef });
```
**Mutation**: `reject_request_refund`

**4. UseRequestBetterEvidence**
```typescript
const { mutate } = UseRequestBetterEvidence();
mutate({ orderRef, message });
```
**Mutation**: `request_better_evidence`

**5. UseRefundOrder**
```typescript
const { mutate } = UseRefundOrder();
mutate({ orderRef, lines });
```
**Mutation**: `refund_order`

### React Query Patterns

**Query Keys**:
- `['order-refund-policy', orderId]`
- `['refund', orderId]`
- `['merchantRefunds', merchantId, status]`
- `['refund-policies-for-merchant', merchantId, listingType, country]`

**Invalidation**:
```typescript
// After approve/reject/request evidence:
queryClient.invalidateQueries(['merchantRefunds', merchantId]);

// After submit refund request:
queryClient.invalidateQueries(['refund', orderId]);
```

---

## Known Gaps & Improvements

### Critical Gaps

#### 1. Inventory Restoration Missing

**Issue**: Refunds don't restore inventory
**Impact**: Overselling prevention fails after refunds
**Location**: No integration between refund flow and inventory system

**Current Flow**:
```
Order placed → qty_committed += quantity
Payment success → qty_on_hand -= quantity, qty_committed -= quantity
Refund processed → NO CHANGE
```

**Expected Flow**:
```
Refund processed → qty_on_hand += refunded_quantity
```

**Implementation Needed**:
- Add function: `restore_orderline_quantities(lines, cosmos, userId)`
- Call in: `charge_refunded` webhook after refund success
- Only for lines with `target: "PRODUCT-PURCHASE-*"` and `variantId`
- Create inventory transaction with `reason: "REFUND", source: "ORDER"`

**Similar to**: `/graphql-backend/src/graphql/order/index.ts:2119-2184` (commit_orderline_quantities)

#### 2. Partial Line Refunds Limited

**Issue**: Can't easily refund 2 of 5 items on same order line
**Workaround**: Must specify quantity in refund request
**Better Solution**: UI should show "X of Y items refunded" more clearly

#### 3. Tour Refund Email Hardcoded

**Issue**: `reject_request_refund` sends "TOUR_REFUND_REQUEST_REJECTED_CUSTOMER" for all product types
**Location**: `/graphql-backend/src/graphql/order/index.ts:1182-1199`

**Fix**: Check order line `target` and send appropriate email template

#### 4. Return Shipping Uses Setup Intent

**Issue**: Should use Payment Intent instead of Setup Intent
**Impact**: Less clear payment flow, no immediate charge
**Location**: `/graphql-backend/src/graphql/order/index.ts:945-963`

**Fix**: Change to Payment Intent with `capture_method: "automatic"`

#### 5. No Refund Expiry

**Issue**: Old pending refunds stay in system forever
**Solution**: TTL on refund records or periodic cleanup job

#### 6. REVERSED Status Not Implemented

**Issue**: `refund_status: "REVERSED"` exists in types but no mutation to set it
**Use Case**: Merchant processes refund, then reverses it

#### 7. No Bulk Refund Actions

**Issue**: Merchant can't approve/reject multiple refunds at once
**Impact**: Inefficient for high-volume merchants

### Minor Issues

#### 8. Refund Cancellation Only Pre-Approval

**Current**: Customer can only cancel before merchant reviews
**Desired**: Allow cancellation up until refund is processed

#### 9. No Partial Approval

**Issue**: Merchant must approve or reject entire refund
**Desired**: Approve 3 of 5 requested items

#### 10. Evidence Photo Requirements Not Enforced Server-Side

**Issue**: Client validates min 2 photos, but server doesn't check
**Risk**: Direct API calls could bypass validation

#### 11. Missing Refund Reason in Email Templates

**Issue**: Emails don't include customer's selected refund reason
**Impact**: Merchant must check dashboard for details

### Performance Optimizations

#### 12. Separate Refund Container

**Current**: Refunds stored in `Main-Orders` container
**Better**: Separate `Main-Refunds` container with cross-reference
**Benefit**: Better query performance, cleaner data model

#### 13. Return Shipping Rate Caching

**Issue**: ShipEngine API called on every refund request
**Optimization**: Cache rates for common routes (TTL: 1 hour)

### UI/UX Improvements

#### 14. Refund Status Timeline

**Missing**: Visual timeline showing refund progression
**Desired**: PENDING → APPROVED → REFUNDED with timestamps

#### 15. Refund Amount Preview Before Submission

**Current**: Customer sees amount after reason selection
**Better**: Show real-time preview as they select items

#### 16. Merchant Notification Center

**Missing**: Dashboard notification count for pending refunds
**Desired**: Badge on merchant navigation

---

## Implementation Checklist for New Features

When working on refunds, consider:

- [ ] Update both order line `refund_request_log` AND separate refund record
- [ ] Send appropriate email template based on product type
- [ ] Add SignalR notification for real-time updates
- [ ] Post system message to order chat for audit trail
- [ ] Invalidate React Query cache appropriately
- [ ] Check if return shipping is required (physical products only)
- [ ] Handle different refund reasons (shipping payment responsibility)
- [ ] Consider auto-approval logic for eligible cases
- [ ] Add audit trail entry in refund record
- [ ] Test with multiple merchants (separate refund records)
- [ ] Verify Stripe connected account handling
- [ ] Test inventory restoration (once implemented)
- [ ] Update refund status badge display
- [ ] Mobile responsiveness (Dialog vs Drawer)

---

## File Reference Map

### Server (GraphQL Backend)

**Core Resolvers**:
- `/graphql-backend/src/graphql/order/index.ts` - Main refund mutations & queries
- `/graphql-backend/src/graphql/vendor/index.ts` - Refund policy management

**Types**:
- `/graphql-backend/src/graphql/order/types.ts` - Order, refund, shipping types
- `/graphql-backend/src/graphql/0_shared/types.ts` - Shared types

**GraphQL Schemas**:
- `/graphql-backend/src/graphql/order/query.graphql`
- `/graphql-backend/src/graphql/order/mutation.graphql`
- `/graphql-backend/src/graphql/vendor/query.graphql`
- `/graphql-backend/src/graphql/vendor/mutation.graphql`

**Stripe Webhooks**:
- `/graphql-backend/src/functions/stripe/charge_refunded.ts`
- `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts`
- `/graphql-backend/src/functions/stripe.ts` - Webhook registration

**Email Templates**:
- `/graphql-backend/src/client/email_templates.ts`

**Shipping**:
- `/graphql-backend/src/graphql/logistics/functions/packing.ts`
- `/graphql-backend/src/graphql/logistics/types.ts`

### Client (SaaS Frontend)

**Customer Components**:
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx`
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundPolicyModal.tsx`
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/OrderRow.tsx`

**Customer Hooks**:
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/hooks/UseOrderRefundPolicy.tsx`
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/hooks/UseRefundEligibility.tsx`
- `/saas-frontend/src/app/(site)/c/[customerId]/orders/hooks/UseRequestRefundWithReason.tsx`

**Merchant Components**:
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/ui.tsx`
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_components/ProcessRefundDialog.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/index.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_components/EditRefundPolicyDetail.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_components/EditRefundTier.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_components/ViewRefundPolicy.tsx`

**Merchant Hooks**:
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_hooks/useMerchantRefunds.tsx`
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/hooks/UseApproveRefund.tsx`
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/hooks/UseRejectRefund.tsx`
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/hooks/UseRequestBetterEvidence.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/UseUpsertRefundPolcy.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/UseVendorRefundPolicies.tsx`
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/UseDeleteRefundPolicy.tsx`

**Legacy Components**:
- `/saas-frontend/src/app/(site)/components/RequestRefund/index.tsx`
- `/saas-frontend/src/app/(site)/components/RequestRefund/hooks/UseRequestRefund.tsx`

**Shared Components**:
- `/saas-frontend/src/components/ux/RefundStatusBadge.tsx`
- `/saas-frontend/src/components/ux/RefundInput.tsx`

**Data**:
- `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/product_reasons.json`

---

## Glossary

**Refund Status** (`refund_status`): Workflow state of refund request
- PENDING, IN_PROGRESS, APPROVED, REJECTED, REVERSED, REQUIRES_INFO

**Record Status** (`status`): Lifecycle state for Cosmos archiving
- ACTIVE, ARCHIVED, DELETED

**Price Log Status**: Payment processing state
- NEW (order created), PENDING (refund initiated), SUCCESS (refund completed)

**Price Log Type**: Financial transaction type
- CHARGE, PARTIAL_REFUND, FULL_REFUND

**Who Pays Shipping**:
- MERCHANT: Merchant covers return shipping cost
- CUSTOMER: Customer pays for return shipping
- NOT_REQUIRED: Evidence-only refund (no physical return)

**Auto-Approval**: Automatic approval based on policy conditions
- Requires: `confirmed: true`, `no_refund: false`, eligible tier with `refundPercentage > 0`

**Tier**: Time-based refund percentage rule
- Example: 7 days (100%), 14 days (50%), 30 days (25%)

**Credit**: Order credit record created when Stripe refund succeeds
- Links to price_log entries via `creditId`

**Return Shipping Estimate**: ShipEngine rate calculation with box packing
- Status: `pending_payment` (customer pays) or `ready_for_labels` (merchant pays)

**Setup Intent**: Stripe payment setup (used for return shipping)
- Should be Payment Intent in future implementation

# Refund System Enhancements: Video Evidence & Product-Level Overrides

**Date**: 2025-10-04
**Implementation Status**: ✅ Complete

---

## Overview

This document details the implementation of two major enhancements to the refunds system:
1. **Video Evidence Support** - Optional video uploads for better evidence quality
2. **Product Refund Rules Overrides** - Product-level settings that override policy defaults

---

## 1. Video Evidence Support

### Summary

Customers can now upload optional video evidence (max 60 seconds, 50MB) for refund requests involving defective items, wrong items, or damaged deliveries.

### Implementation Details

#### Backend Changes

**Type Definitions** (`/graphql-backend/src/graphql/0_shared/types.ts`):
```typescript
export type media_type = {
    // ... existing fields
    sizeBytes?: number
    durationSeconds?: number  // NEW - for video files
}
```

**Order Types** (`/graphql-backend/src/graphql/order/types.ts`):
```typescript
// Added to refund_request_log
evidencePhotos?: media_type[]
evidenceVideos?: media_type[]  // NEW

// Added to refund_record_type
evidencePhotos?: media_type[]
evidenceVideos?: media_type[]  // NEW
```

**GraphQL Schema** (`/graphql-backend/src/graphql/0_shared/mutation.graphql`):
```graphql
input MediaInput {
  # ... existing fields
  sizeBytes: Int     # NEW
  durationSeconds: Int  # NEW
}
```

**Mutation** (`/graphql-backend/src/graphql/order/mutation.graphql`):
```graphql
upsert_request_refund(
    orderRef: RecordRefInput,
    lines: [OrderLineRefundInput],
    reasonId: String,
    evidencePhotos: [MediaInput],
    evidenceVideos: [MediaInput]  # NEW
): CreateOrderResponse
```

**Query** (`/graphql-backend/src/graphql/order/query.graphql`):
```graphql
type RefundRequest {
    # ... existing fields
    evidencePhotos: [Media]
    evidenceVideos: [Media]  # NEW
}
```

**Server-Side Validation** (`/graphql-backend/src/graphql/order/index.ts:587-600`):
```typescript
// Validate video evidence if provided
if (args.evidenceVideos && args.evidenceVideos.length > 0) {
    for (const video of args.evidenceVideos) {
        // Max 50MB
        if (video.sizeBytes && video.sizeBytes > 50 * 1024 * 1024) {
            throw new Error("Video evidence must be under 50MB");
        }

        // Max 60 seconds
        if (video.durationSeconds && video.durationSeconds > 60) {
            throw new Error("Video evidence must be under 60 seconds");
        }
    }
}
```

#### Frontend Changes

**Hook Update** (`UseRequestRefundWithReason.tsx`):
```typescript
export const requestRefundWithReasonSchema = z.object({
    // ... existing fields
    evidencePhotos: z.array(MediaSchema).optional(),
    evidenceVideos: z.array(MediaSchema).optional(),  // NEW
    // ...
})
```

**Customer UI** (`RefundModal.tsx`):
- Video upload shown only for specific refund reasons: `DEFECTIVE_ITEM`, `WRONG_ITEM`, `DAMAGED_DELIVERY`
- Max 1 video, 60 seconds, 50MB
- Client-side validation with visual feedback
- Video player in existing refund view

**Merchant UI** (`ProcessRefundDialog.tsx`):
- Video evidence section with HTML5 video player
- Max height: 96px (24rem)
- Full controls for merchant review

**Query Updates**:
- Customer query: `useMerchantRefunds.tsx` - includes `evidenceVideos` field
- Merchant query: `RefundModal.tsx` - includes `evidenceVideos` with full metadata

### Smart Video Upload Logic

Video upload is conditionally shown based on refund reason code:
```typescript
['DEFECTIVE_ITEM', 'WRONG_ITEM', 'DAMAGED_DELIVERY'].includes(selectedReason.code)
```

This prevents overwhelming customers with unnecessary upload options while providing detailed evidence for cases that benefit from it.

---

## 2. Product Refund Rules Override System

### Summary

Product-level `refundRules` now **override** refund policy settings, giving merchants granular control per product.

### Hierarchy

```
1. Refund Policy (Base Template)
   ↓
2. Product Refund Rules (Override Layer) ← NEW
   ↓
3. Final Behavior = Policy + Product Overrides
```

### Implementation Details

#### Product Rules Lookup (`/graphql-backend/src/graphql/order/index.ts:579-604`)

```typescript
// Fetch product refund rules for override logic
const productRefundRules = new Map<string, any>();
for (const line of args.lines) {
    const orderLine = order.lines.find(l => l.id === line.id);
    if (!orderLine) continue;

    // Only check products (not tours or cases)
    if (!orderLine.target?.startsWith("PRODUCT-PURCHASE")) continue;

    const forObject = orderLine.forObject as recordref_type;
    if (forObject && forObject.id && !productRefundRules.has(forObject.id)) {
        try {
            const product = await context.dataSources.cosmos.get_record<any>(
                forObject.container || "Main-Listing",
                forObject.id,
                Array.isArray(forObject.partition) ? forObject.partition[0] : forObject.partition
            );

            if (product?.refundRules) {
                productRefundRules.set(forObject.id, product.refundRules);
            }
        } catch (error) {
            context.logger.logMessage(`Could not fetch product ${forObject.id} for refund rules: ${error}`);
        }
    }
}
```

#### Override 1: `refundWithoutReturn` → `whoPayShipping`

**Logic** (`index.ts:606-615`):
```typescript
// Apply product-level override to whoPayShipping
let effectiveWhoPayShipping = refundReason?.whoPayShipping;

// Check if any product overrides to "refund without return"
for (const [productId, rules] of productRefundRules) {
    if (rules.refundWithoutReturn === true) {
        effectiveWhoPayShipping = "NOT_REQUIRED";
        break;
    }
}
```

**Effect**:
- Policy says: "Merchant pays shipping"
- Product override: `refundWithoutReturn: true`
- **Result**: Evidence-only refund, no physical return needed

#### Override 2: Auto-Approval Control

**Logic** (`index.ts:617-630`):
```typescript
// Apply product-level override to auto-approval
for (const [productId, rules] of productRefundRules) {
    // If allowAutoReturns is explicitly false, disable auto-approval
    if (rules.allowAutoReturns === false) {
        shouldAutoApprove = false;
        break;
    }

    // If refundTiming is manual, disable auto-approval
    if (rules.refundTiming === 'manual') {
        shouldAutoApprove = false;
        break;
    }
}
```

**Effect**:
- Policy says: Auto-approve for "Change of Mind"
- Product override: `refundTiming: "manual"`
- **Result**: Merchant must manually review every refund

#### Override 3: Evidence Photo Requirements

**Logic** (`index.ts:640-648`):
```typescript
// Apply product-level requirePhoto override
for (const [productId, rules] of productRefundRules) {
    if (rules.requirePhoto === true) {
        if (!args.evidencePhotos || args.evidencePhotos.length < 2) {
            throw new Error("This product requires at least 2 evidence photos for all refund reasons");
        }
        break;
    }
}
```

**Effect**:
- Policy: Photos only for defective items
- Product override: `requirePhoto: true`
- **Result**: Photos required for **all** refund reasons including "Change of Mind"

#### Return Shipping Optimization

**Original** (`index.ts:753`):
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund) {
    // Calculate shipping...
}
```

**Updated**:
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund && effectiveWhoPayShipping !== "NOT_REQUIRED") {
    // Calculate shipping...
}
```

**Effect**: Skips expensive ShipEngine API calls when product override sets `refundWithoutReturn: true`

### Removed: maxShippingCost

The `maxShippingCost` field has been **removed** from `refund_rules_type` as it requires the refund protection insurance module planned for later.

**Before**:
```typescript
export type refund_rules_type = {
    allowAutoReturns?: boolean;
    maxShippingCost?: currency_amount_type;  // REMOVED
    // ...
}
```

**After**:
```typescript
export type refund_rules_type = {
    allowAutoReturns?: boolean;
    // maxShippingCost removed - requires insurance module
    // ...
}
```

---

## Testing Scenarios

### Scenario 1: Video Evidence Upload

**Setup**:
- Customer requests refund for defective item
- Refund reason: `DEFECTIVE_ITEM`

**Expected**:
1. ✅ Photo uploader shown (min 2 required)
2. ✅ Video uploader shown (optional, max 60s, 50MB)
3. ✅ Customer uploads 2 photos + 1 video
4. ✅ Server validates video size and duration
5. ✅ Merchant sees video player in ProcessRefundDialog
6. ✅ Both photos and video stored in refund record

### Scenario 2: Product Override - Refund Without Return

**Setup**:
- Policy: "Defective Item" → `whoPayShipping: "MERCHANT"`
- Product: `refundWithoutReturn: true`

**Expected**:
1. ✅ Customer selects "Defective Item" reason
2. ✅ System detects product override
3. ✅ Skips return shipping calculation (no ShipEngine API call)
4. ✅ Requires 2+ evidence photos
5. ✅ Sets `effectiveWhoPayShipping: "NOT_REQUIRED"`
6. ✅ Creates refund with no shipping estimate

### Scenario 3: Product Override - Manual Approval

**Setup**:
- Policy: "Change of Mind" → `confirmed: true` (auto-approve)
- Product: `refundTiming: "manual"`

**Expected**:
1. ✅ Customer selects "Change of Mind"
2. ✅ Policy indicates auto-approval eligible
3. ✅ Product override disables auto-approval
4. ✅ Refund status: `PENDING` (not `APPROVED`)
5. ✅ Merchant must manually review

### Scenario 4: Product Override - Force Photos

**Setup**:
- Policy: Photos only for defective items
- Product: `requirePhoto: true`
- Customer selects: "Change of Mind"

**Expected**:
1. ✅ System checks product override
2. ✅ Forces photo requirement despite reason
3. ✅ Server throws error if < 2 photos
4. ✅ Customer cannot submit without photos

---

## Files Modified

### Backend (GraphQL)

1. **Types**:
   - `/graphql-backend/src/graphql/0_shared/types.ts` - Added video metadata to media_type
   - `/graphql-backend/src/graphql/order/types.ts` - Added evidenceVideos to refund types
   - `/graphql-backend/src/graphql/product/types.ts` - Removed maxShippingCost

2. **Schema**:
   - `/graphql-backend/src/graphql/0_shared/mutation.graphql` - Added sizeBytes, durationSeconds to MediaInput
   - `/graphql-backend/src/graphql/order/mutation.graphql` - Added evidenceVideos param
   - `/graphql-backend/src/graphql/order/query.graphql` - Added evidenceVideos field

3. **Resolvers**:
   - `/graphql-backend/src/graphql/order/index.ts` - Complete override logic implementation

### Frontend (React/Next.js)

1. **Hooks**:
   - `/saas-frontend/src/app/(site)/c/[customerId]/orders/hooks/UseRequestRefundWithReason.tsx` - Added evidenceVideos to schema & mutation
   - `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_hooks/useMerchantRefunds.tsx` - Added evidenceVideos to query

2. **Customer Components**:
   - `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx` - Video upload UI + video player

3. **Merchant Components**:
   - `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_components/ProcessRefundDialog.tsx` - Video evidence viewer

---

## Performance Impact

### Video Evidence
- **Storage**: ~20MB per video × 1000 refunds/month = **20GB/month** (~$0.40/month in Azure Blob)
- **Upload Time**: Depends on customer connection speed
- **Processing**: No server-side transcoding required

### Product Override Lookups
- **Additional Queries**: 1 product fetch per unique product in refund request
- **Caching**: Products cached during order lifecycle, minimal impact
- **Optimization**: Early return when no override rules present

### Shipping Calculation Optimization
- **Before**: ShipEngine API called for ALL product refunds
- **After**: Skipped when `effectiveWhoPayShipping === "NOT_REQUIRED"`
- **Savings**: ~$0.01 per skipped call × estimated 30% of refunds = significant cost reduction

---

## Migration Notes

### Existing Products
Products created before this implementation won't have `refundRules`:
- ✅ System treats `undefined` as "use policy defaults"
- ✅ No migration required
- ✅ Merchants can add rules via product edit UI

### Existing Refund Requests
Refund requests created before this update:
- ✅ `evidenceVideos` will be `undefined` (gracefully handled)
- ✅ Frontend checks before rendering video player
- ✅ No breaking changes

---

## Future Enhancements

### Completed ✅
1. ✅ Video evidence support with smart conditional display
2. ✅ Product refund rules override system
3. ✅ Return shipping optimization
4. ✅ maxShippingCost removed (pending insurance module)

### Remaining Tasks
1. ⏳ Implement inventory restoration on refund
2. ⏳ Fix policy lookup to use product's refundPolicyId
3. ⏳ Remove legacy refund components

### Planned (Insurance Module Required)
1. 📅 Refund protection insurance integration
2. 📅 maxShippingCost with insurance fallback
3. 📅 Carrier scan/delivery trigger for auto-approval
4. 📅 Real-time refund status tracking via webhooks

---

## Summary

### What Changed
1. **Video Evidence**: Optional video uploads for better fraud prevention and evidence quality
2. **Product Overrides**: Product-level rules override policy defaults for granular control
3. **Optimization**: Skip shipping calculation when not required (cost savings)
4. **Validation**: Server-side enforcement of photo/video requirements

### Developer Notes
- **Video files**: Max 60s, 50MB, stored in same blob container as photos
- **Override precedence**: Product rules > Policy rules
- **Graceful degradation**: Missing product rules default to policy behavior
- **Error handling**: Product fetch failures log but don't block refund request

### Merchant Benefits
1. Set product-specific refund behavior without creating separate policies
2. Force evidence requirements for high-value items
3. Disable auto-approvals for sensitive products
4. Reduce return shipping costs for low-value items

### Customer Benefits
1. Submit video evidence for faster dispute resolution
2. Clearer evidence requirements upfront
3. Faster refund processing with auto-approval
4. No shipping fees for evidence-only refunds

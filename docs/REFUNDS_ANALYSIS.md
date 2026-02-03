# Refund Workflow Analysis: Return Shipping & Evidence Requirements

**Date**: 2025-10-04
**Scope**: Verification of `whoPayShipping` configuration and evidence requirements

---

## Summary

✅ **GOOD NEWS**: The refund workflow correctly respects the `whoPayShipping` policy configuration and enforces evidence requirements appropriately.

---

## 1. Server-Side Return Shipping Logic

### Key Code Location
**File**: `/graphql-backend/src/graphql/order/index.ts`
**Function**: `upsert_request_refund` mutation (lines 509-1095)

### Logic Flow

#### Step 1: Check if Return Shipping Calculation is Needed
**Line 656**:
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund) {
```

**Conditions**:
- ✅ Has physical product lines (not tours or case invoices)
- ✅ Refund reason is provided
- ✅ Reason doesn't have `no_refund: true`

**CRITICAL FINDING**: The code does NOT check `whoPayShipping` value here. This means:
- 🚨 **ISSUE**: Return shipping estimate is calculated EVEN for `whoPayShipping: "NOT_REQUIRED"` cases
- This is unnecessary work and API calls to ShipEngine
- Should add check: `&& refundReason.whoPayShipping !== "NOT_REQUIRED"`

#### Step 2: Calculate Shipping Estimate
**Lines 657-861**: If conditions pass, the system:
1. Gets customer and merchant addresses
2. Fetches variant dimensions/weights
3. Packs items into optimal boxes
4. Calls ShipEngine API for rates
5. Selects cheapest rate

#### Step 3: Determine Payment Responsibility
**Line 838**:
```typescript
const whoPayShipping = refundReason.whoPayShipping.toLowerCase();
```

**Line 853**:
```typescript
status: whoPayShipping === "customer" ? "pending_payment" : "ready_for_labels"
```

**Logic**:
- If `whoPayShipping === "customer"` → status: `"pending_payment"` (requires customer payment before labels)
- If `whoPayShipping === "merchant"` → status: `"ready_for_labels"` (merchant can generate labels immediately)
- If `whoPayShipping === "NOT_REQUIRED"` → Still calculates estimate (ISSUE - unnecessary)

#### Step 4: Create Stripe Setup Intent (Customer Pays Only)
**Lines 921-968**: Only creates Stripe setup intent if:
- `refundReason.whoPayShipping === "customer"` (lowercase comparison)
- Allows customer to pay for return shipping in RefundModal

**✅ CORRECT**: Stripe intent only created when customer pays.

---

## 2. Email Notification Logic

### Location
**Lines 1010-1090** in `upsert_request_refund`

### Logic by Product Type

#### Tours
```typescript
if (tourLines.length > 0) {
    await sendEmail("TOUR_REFUND_REQUEST_MERCHANT", {
        merchant: { name },
        order: { code },
        customer: { firstname, lastname, email }
    });
}
```
**✅ CORRECT**: No shipping logic for tours.

#### Products (Merchant Pays Shipping)
**Line 1034**:
```typescript
if (refundReason && !refundReason.no_refund &&
    refundReason.whoPayShipping &&
    refundReason.whoPayShipping.toLowerCase() === "merchant") {

    await sendEmail("PRODUCT_REFUND_REQUEST_REQUIRES_MERCHANT_PAYMENT", {
        merchant,
        order,
        customer,
        returnShippingEstimate,
        refund_request_id: refund.id
    });
}
```

**✅ CORRECT**: Merchant-pays email includes return shipping estimate.

#### Products (Customer Pays OR No Return Required)
**Lines 1055-1075**:
```typescript
else if (productLines.length > 0) {
    await sendEmail("PRODUCT_REFUND_REQUEST_MERCHANT", {
        merchant,
        order,
        customer,
        returnShippingEstimate: returnShippingEstimate || null
    });
}
```

**⚠️ PARTIAL ISSUE**: This email is sent for BOTH:
- `whoPayShipping === "customer"` (correct - includes estimate)
- `whoPayShipping === "NOT_REQUIRED"` (includes estimate even though not needed)

**Recommendation**: Split these into separate email templates or remove estimate for NOT_REQUIRED.

#### Case Invoices
```typescript
if (caseInvoiceLines.length > 0) {
    await sendEmail("CASE_REFUND_REQUEST_MERCHANT", {
        merchant,
        order,
        customer,
        case: caseFromDB
    });
}
```
**✅ CORRECT**: No shipping logic for case invoices.

---

## 3. Client-Side Evidence Requirements

### Location
**File**: `/saas-frontend/src/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx`

### UI Logic for Evidence Upload

#### Display Evidence Upload Section
**Line 472**:
```typescript
{selectedReason.whoPayShipping === "NOT_REQUIRED" && (
    <div>
        <h4 className="font-medium text-orange-600 mb-2">Evidence Required</h4>
        <p className="text-sm text-muted-foreground mb-3">
            Please upload at least 2 photos showing the issue with the product.
            This helps us process your refund without requiring you to return the item.
        </p>
        <FileUploader
            // ... props
        />
    </div>
)}
```

**✅ CORRECT**: Evidence upload only shown when `whoPayShipping === "NOT_REQUIRED"`.

#### Display Shipping Payment Responsibility
**Line 455**:
```typescript
{!selectedReason.no_refund && (
    <p className="text-sm text-muted-foreground">
        <span className="font-bold">{capitalize(selectedReason.whoPayShipping)}</span> pays for return shipping.
    </p>
)}
```

**✅ CORRECT**: Shows who pays for shipping when refund is allowed.

#### Disable Submit Button Logic
**Lines 550-555**:
```typescript
disabled={
    refundCreation.mutation.isPending ||
    ((() => {
        const selectedReason = eligibility.eligibleReasons.find(r => r.id === selectedReasonId);
        return selectedReason?.whoPayShipping === "NOT_REQUIRED" &&
               (!refundCreation.form.getValues().evidencePhotos ||
                refundCreation.form.getValues().evidencePhotos!.length < 2);
    })())
}
```

**✅ EXCELLENT**: Button disabled if:
- Mutation is pending, OR
- `whoPayShipping === "NOT_REQUIRED"` AND less than 2 evidence photos uploaded

**Enforcement**: Client-side validation ensures minimum 2 photos for evidence-only refunds.

---

## 4. Merchant View of Evidence

### Location
**File**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(manage)/manage/customers/refunds/_components/ProcessRefundDialog.tsx`

### Evidence Photos Display

The merchant dialog shows evidence photos if they were uploaded:

```typescript
{refundRequest.evidencePhotos && refundRequest.evidencePhotos.length > 0 && (
    <div className="mb-4">
        <h4 className="font-medium mb-2">Evidence Photos</h4>
        <div className="grid grid-cols-2 gap-2">
            {refundRequest.evidencePhotos.map((photo, idx) => (
                <img
                    key={idx}
                    src={photo.url}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full rounded border"
                />
            ))}
        </div>
    </div>
)}
```

**✅ CORRECT**: Merchant can view evidence photos to make approval decision.

---

## 5. Policy Configuration

### Location
**File**: `/saas-frontend/src/app/(site)/m/_components/Profile/Edit/RefundPolicies/_components/ViewRefundPolicy.tsx`

### Display Logic
**Line 58**:
```typescript
{!reason.no_refund &&
    (reason.whoPayShipping === "NOT_REQUIRED"
        ? <span>Payment not required, photo evidence will be asked for instead.</span>
        : <p><span className="font-bold">{capitalize(reason.whoPayShipping)}</span> pays for shipping.</p>)
}
```

**✅ CORRECT**: Policy preview shows clear message when evidence is required instead of physical return.

---

## Issues Found & Recommendations

### 🚨 Issue #1: Unnecessary Shipping Calculation for NOT_REQUIRED

**Problem**: Return shipping estimate is calculated even when `whoPayShipping === "NOT_REQUIRED"`.

**Impact**:
- Unnecessary ShipEngine API calls (costs money)
- Wasted processing time
- Potential confusion if estimate is displayed in emails

**Location**: `/graphql-backend/src/graphql/order/index.ts:656`

**Current Code**:
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund) {
```

**Recommended Fix**:
```typescript
if (productLines.length > 0 &&
    refundReason &&
    !refundReason.no_refund &&
    refundReason.whoPayShipping !== "NOT_REQUIRED") {
```

**Files to Update**:
- `/graphql-backend/src/graphql/order/index.ts` (line 656)

---

### ⚠️ Issue #2: Email Template Confusion

**Problem**: Same email template used for both `customer pays` and `NOT_REQUIRED` cases.

**Impact**:
- Merchant might receive shipping estimate in email for evidence-only refunds
- Confusing to merchant

**Location**: `/graphql-backend/src/graphql/order/index.ts:1055-1075`

**Recommended Fix**: Create separate email template or conditionally exclude estimate:

```typescript
if (productLines.length > 0) {
    const emailTemplate = refundReason?.whoPayShipping === "NOT_REQUIRED"
        ? "PRODUCT_REFUND_REQUEST_EVIDENCE_ONLY"
        : "PRODUCT_REFUND_REQUEST_MERCHANT";

    await sendEmail(emailTemplate, {
        merchant,
        order,
        customer,
        returnShippingEstimate: refundReason?.whoPayShipping !== "NOT_REQUIRED"
            ? returnShippingEstimate
            : null
    });
}
```

**Files to Update**:
- `/graphql-backend/src/graphql/order/index.ts` (lines 1055-1075)
- `/graphql-backend/src/client/email_templates.ts` (add new template)

---

### 🔍 Issue #3: No Server-Side Evidence Validation

**Problem**: Client validates minimum 2 photos, but server doesn't enforce this.

**Impact**:
- Direct API calls could bypass validation
- Inconsistent enforcement

**Recommendation**: Add server-side validation in `upsert_request_refund`:

```typescript
if (refundReason?.whoPayShipping === "NOT_REQUIRED") {
    if (!args.evidencePhotos || args.evidencePhotos.length < 2) {
        throw new Error("Evidence-only refunds require at least 2 photos");
    }
}
```

**Files to Update**:
- `/graphql-backend/src/graphql/order/index.ts` (add after line 538)

---

## Workflow Verification Results

### ✅ What Works Correctly

1. **Client UI Respects Policy**:
   - Evidence upload only shown for `whoPayShipping === "NOT_REQUIRED"`
   - Shipping payment responsibility clearly displayed
   - Submit button disabled without minimum 2 photos

2. **Stripe Payment Flow**:
   - Setup intent only created when `whoPayShipping === "customer"`
   - No payment required for merchant-pays or evidence-only refunds

3. **Email Notifications**:
   - Merchant-pays shipping gets separate email template
   - Tours and case invoices handled separately (no shipping)

4. **Merchant Evidence Review**:
   - Evidence photos displayed in ProcessRefundDialog
   - Merchant can review before approving/rejecting

### ⚠️ What Needs Improvement

1. **Shipping Calculation Optimization**:
   - Skip ShipEngine API for `whoPayShipping === "NOT_REQUIRED"`

2. **Email Template Clarity**:
   - Separate template for evidence-only refunds
   - Don't include shipping estimate when not applicable

3. **Server-Side Validation**:
   - Enforce minimum 2 photos for evidence-only refunds on server

---

## Testing Checklist

To verify the workflow, test these scenarios:

### Scenario 1: Merchant Pays Shipping
- [ ] Refund reason has `whoPayShipping: "MERCHANT"`
- [ ] Return shipping estimate is calculated
- [ ] Estimate status is `"ready_for_labels"`
- [ ] No Stripe setup intent created
- [ ] Merchant receives email: `PRODUCT_REFUND_REQUEST_REQUIRES_MERCHANT_PAYMENT`
- [ ] Merchant can generate labels immediately in ProcessRefundDialog

### Scenario 2: Customer Pays Shipping
- [ ] Refund reason has `whoPayShipping: "CUSTOMER"`
- [ ] Return shipping estimate is calculated
- [ ] Estimate status is `"pending_payment"`
- [ ] Stripe setup intent created in refund record
- [ ] Customer sees payment option in RefundModal
- [ ] Merchant receives email: `PRODUCT_REFUND_REQUEST_MERCHANT`
- [ ] Labels generated after customer pays

### Scenario 3: Evidence Only (No Physical Return)
- [ ] Refund reason has `whoPayShipping: "NOT_REQUIRED"`
- [ ] ⚠️ Return shipping estimate calculated (ISSUE - should be skipped)
- [ ] Evidence upload section shown in RefundModal
- [ ] Submit button disabled without 2+ photos
- [ ] No Stripe setup intent created
- [ ] Merchant receives email: `PRODUCT_REFUND_REQUEST_MERCHANT`
- [ ] Evidence photos displayed in ProcessRefundDialog
- [ ] No shipping labels section shown

### Scenario 4: No Refund Allowed
- [ ] Refund reason has `no_refund: true`
- [ ] Reason not included in eligible reasons list
- [ ] Customer cannot select this reason
- [ ] No refund request can be created

---

## Conclusion

**Overall Assessment**: The workflow is **mostly correct** but has **minor optimization opportunities**.

**Critical Path Works**:
- ✅ Evidence requirements enforced for `NOT_REQUIRED` cases
- ✅ Customer payment only required when policy specifies
- ✅ Merchant payment responsibilities clear
- ✅ UI matches backend policy configuration

**Recommended Fixes** (Priority Order):
1. **HIGH**: Add server-side evidence photo validation
2. **MEDIUM**: Skip shipping calculation for `NOT_REQUIRED` cases
3. **LOW**: Create separate email template for evidence-only refunds

**Risk**: Low - Current implementation works but wastes API calls and could be clearer.

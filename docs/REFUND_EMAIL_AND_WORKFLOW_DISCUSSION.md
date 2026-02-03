# Refund Email Templates & Workflow Protection Discussion

**Date**: 2025-10-06
**Status**: Ready to Implement
**Decision**: Implement Option E (Combination A + D) - APPROVED ✅

---

## Summary

We identified a critical workflow issue where customers can pay for return shipping labels but merchants may never process the refund, leaving customers out of pocket.

---

## Changes Implemented Today

### 1. Fixed Email Notification Timing

**Problem**: Customers were being notified immediately when submitting refund requests, even if they hadn't paid for the return label yet.

**Solution**:
- `/graphql-backend/src/graphql/order/index.ts:1185-1205` - Only send email if `returnShippingEstimate.status !== "pending_payment"`
- `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts:98-118` - Send email after customer pays for label

**Result**: Merchants only see refund requests that are ready for review.

---

## Email Templates Needed in SendGrid

### Templates to Create:

1. **PRODUCT_REFUND_REQUEST_MERCHANT** (Customer notification)
   - **When**: After customer pays for label OR immediately if no shipping/merchant pays
   - **Recipient**: Customer
   - **Payload**:
     ```typescript
     {
         order: { code: string },
         products: [{ name: string, quantity: number }]
     }
     ```
   - **Content considerations**:
     - Two scenarios: auto-approved vs pending review
     - Must clarify merchant still needs to process refund after receiving item

2. **CASE_REFUND_REQUEST_MERCHANT** (Customer notification)
   - **When**: Immediately when case refund submitted
   - **Recipient**: Customer
   - **Payload**:
     ```typescript
     {
         order: { code: string },
         cases: [{ description: string, interactionId: string }]
     }
     ```

### After Creating:
Add template IDs to `/graphql-backend/src/client/email_templates.ts`

---

## Critical Workflow Issue Identified

### The Problem

**Current flow for "Bought by mistake" (customer pays shipping):**

1. Customer submits refund (auto-approved)
2. Customer pays $15 for return label
3. Customer ships item back
4. **Merchant must manually call `refund_order` mutation**
5. **Risk**: Merchant never processes refund → Customer loses $15 + original purchase

### Current System Behavior

- **Auto-approval**: Sets `refund_status = "APPROVED"` based on policy
- **Label generation**: Customer pays, gets label via `setup_intent_succeeded` webhook
- **Refund processing**: `approve_request_refund` mutation **"Does NOT process payment"** (line 469 in REFUNDS.md)
- **Manual step required**: Merchant must call `refund_order` mutation separately

### Why This Is a Problem

Customer has financial exposure with no guarantee:
- ✅ Paid for label
- ✅ Shipped item
- ❌ No automatic refund
- ❌ Merchant can ghost them

---

## Solution Options to Discuss Tomorrow

### Option A: Refund Protection Window ⭐
- Set 30-day deadline when label generated
- Cron job checks daily for unprocessed refunds
- Auto-refund label cost if merchant doesn't process in time
- Escalate to customer support

**Pros**: Customer protected, merchant has control
**Cons**: Requires cron job infrastructure

### Option B: Merchant Deposit/Bond
- Merchant must maintain balance to cover pending refunds
- Platform holds merchant payout until refunds processed

**Pros**: Financial guarantee
**Cons**: May discourage merchant onboarding

### Option C: Customer Service Escalation Only
- Customer can flag unprocessed refund after X days
- Manual support investigation

**Pros**: Simple to implement
**Cons**: Not proactive, poor customer experience

### Option D: Auto-Process After Delivery ⚠️
- ShipEngine webhook detects delivery
- Wait 7 days for merchant inspection
- Auto-call `refund_order` mutation

**Pros**: Fully automated
**Cons**: Merchant can't verify item condition, fraud risk

### Option E: Combination (A + D) ⭐⭐
1. Customer pays for label when ready
2. Item delivered → **7-day inspection window**
3. After 7 days → **Auto-process refund** automatically
4. If merchant doesn't process within **30 days** → **Refund label cost** + escalate

**Pros**: Balances customer protection + merchant control
**Cons**: Most complex to implement

---

## Questions to Answer Tomorrow

1. **Which protection mechanism do we want?** (Recommendation: Option E)

2. **Should we differentiate auto-approved vs pending refunds?**
   - Auto-approved: Customer can pay for label immediately
   - Pending: Must wait for merchant approval before paying

3. **What happens if merchant rejects after customer paid for label?**
   - Should we auto-refund the label cost?

4. **Do we need separate email templates for:**
   - Auto-approved refunds ("Approved! Pay for label to proceed")
   - Pending refunds ("Under review, you'll be notified")

5. **Should delivery confirmation trigger auto-refund countdown?**
   - Integrate with existing ShipEngine tracking webhook
   - Add 7-day inspection period before auto-processing

---

## Technical Implementation Notes

### Current Code Flow

**Refund submission** (`upsert_request_refund`):
```typescript
// Line 395-403: Auto-approval check
if (reason.confirmed && !reason.no_refund && withinTier) {
    shouldAutoApprove = true;
}

// Line 408: Set initial status
refund_status: shouldAutoApprove ? "APPROVED" : "PENDING"

// Line 983: Mark shipping status
status: whoPayShipping === "customer" ? "pending_payment" : "ready_for_labels"
```

**Label payment** (`setup_intent_succeeded` webhook):
```typescript
// Generate label from rate
const label = await shipEngine.createLabelFromRate({ rate_id });

// Send email notification (NEW - added today)
await sendgrid.sendEmail(..., "PRODUCT_REFUND_REQUEST_MERCHANT", ...);
```

**Refund processing** (`refund_order` mutation):
```typescript
// Merchant must manually call this
// Groups by charge, calls Stripe API
const refund = await stripe.callApi("POST", "refunds", { charge, amount });
```

### To Implement Auto-Refund Safety:

1. **Track label payment timestamp**
   ```typescript
   returnShippingLabels: [{
       paid_at: DateTime,  // NEW
       deadline: DateTime  // paid_at + 30 days
   }]
   ```

2. **Add delivery tracking**
   ```typescript
   returnShippingLabels: [{
       delivered_at: DateTime,  // NEW - from ShipEngine webhook
       inspection_deadline: DateTime  // delivered_at + 7 days
   }]
   ```

3. **Create cron job** (`/graphql-backend/src/functions/refund_protection_cron.ts`)
   - Run daily
   - Query refunds with `status = "APPROVED"` + has labels + past deadline
   - Auto-call `refund_order` OR refund label cost

4. **Update ShipEngine webhook** (`/graphql-backend/src/functions/shipengine/track.ts`)
   - On delivery confirmation, set `delivered_at`
   - Schedule auto-refund for 7 days later

---

## Files Modified Today

1. `/graphql-backend/src/graphql/order/index.ts` - Conditional email logic
2. `/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts` - Email after label payment
3. `/graphql-backend/src/graphql/0_shared/query.graphql` - Added `durationSeconds` to Media type (unrelated bug fix)

---

## Next Steps for Tomorrow ✅ APPROVED

### Implementation Plan: Option E (A + D Combined)

**Approved Flow:**
1. Customer pays for label when ready (current behavior - keep as is)
2. Item delivered → **7-day inspection window** for merchant
3. After 7 days → **Auto-process refund** (call `refund_order` automatically)
4. If merchant doesn't process within **30 days total** → **Refund label cost** + escalate to support

### Tasks:

1. **Add tracking fields to refund records**
   - `returnShippingLabels[].paid_at` - Timestamp when label paid
   - `returnShippingLabels[].delivered_at` - Timestamp from ShipEngine webhook
   - `returnShippingLabels[].auto_refund_deadline` - 7 days after delivery
   - `returnShippingLabels[].label_cost_refund_deadline` - 30 days after payment

2. **Update ShipEngine tracking webhook**
   - Location: `/graphql-backend/src/functions/shipengine/track.ts`
   - On delivery confirmation (status "DE"), set `delivered_at`
   - Calculate and store `auto_refund_deadline` (delivered_at + 7 days)

3. **Create auto-refund cron job**
   - New file: `/graphql-backend/src/functions/refund_protection_cron.ts`
   - Run daily (Azure Timer Trigger)
   - Query refunds where:
     - `refund_status = "APPROVED"`
     - `auto_refund_deadline < now()`
     - No existing refund processed
   - Call `refund_order` mutation automatically
   - Send notification to merchant + customer

4. **Create label cost refund job**
   - Same cron or separate function
   - Query refunds where:
     - `label_cost_refund_deadline < now()`
     - Still status "PENDING" or "APPROVED" but not processed
   - Refund label cost via Stripe
   - Escalate to support team (send internal notification)

5. **Design email template content**
   - Auto-approved: "Approved! Pay for label. After delivery, refund processed within 7 days."
   - Pending: "Under review. You'll be notified if approved."

6. **Create SendGrid templates and add IDs**

7. **Test end-to-end flow**

---

## Resources

- **Main docs**: `/mnt/e/SpiriGroup/Spiriverse/docs/REFUNDS.md`
- **Implementation docs**: `/mnt/e/SpiriGroup/Spiriverse/docs/REFUNDS_VIDEO_AND_OVERRIDES_IMPLEMENTATION.md`
- **Email templates**: `/graphql-backend/src/client/email_templates.ts`
- **Order resolver**: `/graphql-backend/src/graphql/order/index.ts`
- **Stripe webhooks**: `/graphql-backend/src/functions/stripe/`

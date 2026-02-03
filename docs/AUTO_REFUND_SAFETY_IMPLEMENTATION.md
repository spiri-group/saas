# Auto-Refund Safety Feature Implementation

**Date**: 2025-10-07
**Status**: ✅ Implemented
**Feature**: Automatic customer protection for return shipping refunds

---

## Overview

This feature protects customers who pay for return shipping labels but merchants fail to process refunds. It implements a two-tier safety net:

1. **7-day auto-refund window**: Automatically processes refund after merchant has 7 days to inspect returned item
2. **30-day label cost refund**: Refunds label cost and escalates to support if merchant never processes refund

---

## Problem Statement

**Previous Risk**:
- Customer requests refund (auto-approved for "bought by mistake")
- Customer pays $15 for return label
- Customer ships item back to merchant
- Merchant receives item but never processes refund
- **Result**: Customer loses $15 + original purchase price

---

## Solution: Two-Tier Protection

### Tier 1: Auto-Process Refund (7 days after delivery)

**When**: Item delivered to merchant
**Wait**: 7 days for merchant to inspect
**Action**: Automatically process full refund if merchant hasn't done so
**Notification**: Email to customer and merchant

### Tier 2: Label Cost Refund + Escalation (30 days after payment)

**When**: 30 days since customer paid for label
**Condition**: Refund still not processed
**Action**: Refund the label cost to customer + escalate to support team
**Notification**: Email to customer and internal support escalation

---

## Implementation Details

### 1. Schema Changes

#### Label Info Type (`/graphql-backend/src/graphql/logistics/types.ts:237-241`)

```typescript
export type label_info_type = {
  // ... existing fields

  // Auto-refund safety tracking
  paid_at?: string; // ISO timestamp when customer paid for label
  delivered_at?: string; // ISO timestamp when carrier confirmed delivery
  auto_refund_deadline?: string; // ISO timestamp: delivered_at + 7 days
  label_cost_refund_deadline?: string; // ISO timestamp: paid_at + 30 days
};
```

#### GraphQL Schema (`/graphql-backend/src/graphql/logistics/query.graphql:207-210`)

```graphql
type LabelInfo {
  # ... existing fields

  # Auto-refund safety tracking
  paid_at: DateTime
  delivered_at: DateTime
  auto_refund_deadline: DateTime
  label_cost_refund_deadline: DateTime
}
```

### 2. Webhook Updates

#### Setup Intent Succeeded (`/graphql-backend/src/functions/stripe/setup_intent_succeeded.ts:77-95`)

**When**: Customer pays for return label

**Action**:
- Sets `paid_at` timestamp
- Calculates `label_cost_refund_deadline` (paid_at + 30 days)

```typescript
const paidAt = new Date().toISOString();
const labelCostRefundDeadline = DateTime.fromISO(paidAt).plus({ days: 30 }).toISO();

const returnShippingLabels = [{
  // ... label details
  paid_at: paidAt,
  label_cost_refund_deadline: labelCostRefundDeadline
}];
```

#### ShipEngine Tracking Webhook (`/graphql-backend/src/functions/shipengine/track.ts:183-242`)

**When**: Return item delivered (status code "DE")

**Action**:
- Sets `delivered_at` timestamp
- Calculates `auto_refund_deadline` (delivered_at + 7 days)

```typescript
const deliveredAt = new Date().toISOString();
const autoRefundDeadline = DateTime.fromISO(deliveredAt).plus({ days: 7 }).toISO();

await cosmos.patch_record("Main-Orders", refund.id, refund.id, [
  { op: "set", path: `/returnShippingLabels/${labelIndex}/delivered_at`, value: deliveredAt },
  { op: "set", path: `/returnShippingLabels/${labelIndex}/auto_refund_deadline`, value: autoRefundDeadline }
], "shipengine-webhook");
```

### 3. Shared Refund Processing Utility

**Location**: `/graphql-backend/src/graphql/order/refund_utils.ts`

**Purpose**: Extract refund logic into reusable function for both:
- Manual merchant-initiated refunds (`refund_order` mutation)
- Automatic customer protection refunds (cron job)

**Function**: `process_refund()`

```typescript
export const process_refund = async (
  orderId: string,
  lines: RefundLineInput[],
  cosmos: CosmosDataSource,
  stripe: StripeDataSource,
  triggeredBy: string = "MERCHANT"
): Promise<ProcessRefundResult>
```

**Returns**:
```typescript
{
  success: boolean;
  refundedAmount: number;
  currency: string;
  stripeRefundIds: string[];
  error?: string;
}
```

### 4. Auto-Refund Cron Job (Azure Timer Trigger)

**Location**: `/graphql-backend/src/functions/refund_protection.ts`

**Schedule**: Daily at 2 AM UTC (`"0 0 2 * * *"`)

**Task 1: Auto-Process Refunds (7-day window)**

Query:
```sql
SELECT * FROM c
WHERE c.docType = "REFUND"
AND c.status = "ACTIVE"
AND c.refund_status = "APPROVED"
AND EXISTS(
  SELECT VALUE label
  FROM label IN c.returnShippingLabels
  WHERE label.auto_refund_deadline <= @now
  AND NOT IS_DEFINED(label.auto_processed)
)
```

Action:
- Calls `process_refund()` with `triggeredBy: "AUTO_REFUND_CRON"`
- Marks label as `auto_processed: true`
- Sends notification to customer and merchant

**Task 2: Refund Label Costs (30-day safety net)**

Query:
```sql
SELECT * FROM c
WHERE c.docType = "REFUND"
AND c.status = "ACTIVE"
AND EXISTS(
  SELECT VALUE label
  FROM label IN c.returnShippingLabels
  WHERE label.label_cost_refund_deadline <= @now
  AND NOT IS_DEFINED(label.label_cost_refunded)
)
```

Action:
- Refunds label shipping cost to customer via Stripe
- Marks label as `label_cost_refunded: true`
- Escalates to support team via email

### 5. Refund Order Mutation Update

**Location**: `/graphql-backend/src/graphql/order/index.ts:1344-1366`

**Change**: Now uses shared `process_refund()` utility

```typescript
refund_order: async (_: any, args: { ... }, context: serverContext) => {
  const result = await process_refund(
    args.orderRef.id,
    args.lines,
    context.dataSources.cosmos,
    context.dataSources.stripe,
    context.userId
  );

  if (!result.success) {
    throw new Error(result.error || "Failed to process refund");
  }
  // ... rest of mutation
}
```

---

## Email Templates

**Location**: `/graphql-backend/src/client/email_templates.ts`

### Templates Added (TODO: Create in SendGrid)

1. **REFUND_AUTO_PROCESSED_CUSTOMER**
   - When: Refund auto-processed after 7-day window
   - Recipient: Customer
   - Data: `{ order: { code }, refundAmount, currency }`

2. **REFUND_AUTO_PROCESSED_MERCHANT**
   - When: Refund auto-processed after 7-day window
   - Recipient: Merchant
   - Data: `{ order: { code }, refundAmount, currency }`

3. **REFUND_ESCALATION_SUPPORT**
   - When: Label cost refunded after 30 days (escalation)
   - Recipient: Support team (`support@spiriverse.com`)
   - Data: `{ refundId, orderId, orderCode, customerEmail, vendorId, daysOverdue }`

4. **LABEL_COST_REFUNDED_CUSTOMER**
   - When: Label cost refunded to customer
   - Recipient: Customer
   - Data: `{ order: { code }, labelCost, currency }`

---

## Customer Journey Flow

### Happy Path (Merchant Processes Refund)

```
1. Customer requests refund (auto-approved)
2. Customer pays for return label ✅
   → paid_at set
   → label_cost_refund_deadline = paid_at + 30 days

3. Customer ships item back

4. Item delivered to merchant ✅
   → delivered_at set
   → auto_refund_deadline = delivered_at + 7 days

5. Merchant inspects and processes refund within 7 days ✅
   → Manual refund_order mutation called
   → Customer receives refund
   → Process complete
```

### Auto-Refund Path (Merchant Doesn't Act)

```
1-4. [Same as happy path]

5. Merchant doesn't process refund

6. 7 days pass after delivery ⚠️
   → Cron job detects auto_refund_deadline passed
   → Automatically calls process_refund()
   → Refund processed to customer
   → Notifications sent to customer + merchant

7. [Optional] If cron also failed somehow...

8. 30 days pass since label payment ⚠️⚠️
   → Cron detects label_cost_refund_deadline passed
   → Refunds label cost to customer
   → Escalates to support team
   → Support investigates and resolves
```

---

## Edge Cases & Error Handling

### 1. Multiple Return Labels

**Scenario**: Customer gets multiple labels for multi-box return

**Handling**: Each label tracked independently with own deadlines

### 2. Partial Deliveries

**Scenario**: Only some boxes delivered

**Handling**: Each label has own `delivered_at` and deadline

### 3. Webhook Failures

**Scenario**: ShipEngine delivery webhook never arrives

**Handling**:
- `auto_refund_deadline` never set
- Falls back to 30-day label cost refund
- Support escalation catches it

### 4. Merchant Processes Just Before Deadline

**Scenario**: Merchant processes on day 6, but cron runs and auto-processes

**Handling**:
- Cron marks label as `auto_processed` before calling refund
- If refund already processed, Stripe will reject duplicate
- Error logged but doesn't block cron

### 5. Cron Job Failure

**Scenario**: Azure function down during scheduled run

**Handling**:
- Next day's run catches overdue refunds (deadline comparison uses `<=`)
- Multiple days can be caught up in single run

---

## Testing Checklist

### Unit Tests Needed

- [ ] `process_refund()` with valid order
- [ ] `process_refund()` with invalid order ID
- [ ] `process_refund()` with already refunded order
- [ ] `handle_return_label_delivery()` with valid tracking number
- [ ] `handle_return_label_delivery()` with invalid tracking number

### Integration Tests Needed

- [ ] Full refund flow: payment → delivery → auto-refund
- [ ] Label cost refund after 30 days
- [ ] Duplicate auto-refund prevention
- [ ] Webhook delivery tracking updates

### Manual Testing Scenarios

1. **Happy Path**:
   - Create refund request
   - Pay for label
   - Verify `paid_at` and `label_cost_refund_deadline` set
   - Manually trigger ShipEngine delivery webhook
   - Verify `delivered_at` and `auto_refund_deadline` set
   - Manually trigger cron (change schedule to `*/5 * * * *` for testing)
   - Verify refund processed

2. **30-Day Safety Net**:
   - Create refund with `paid_at` set to 31 days ago
   - No delivery tracking
   - Run cron
   - Verify label cost refunded and support escalated

3. **Manual Override**:
   - Create refund with auto-refund deadline passed
   - Merchant manually processes before cron runs
   - Run cron
   - Verify no duplicate refund attempted

---

## Deployment Checklist

### Code Deployment

- [x] Update label_info_type schema
- [x] Update GraphQL schema
- [x] Update setup_intent_succeeded webhook
- [x] Update ShipEngine track webhook
- [x] Create refund_utils.ts
- [x] Update refund_order mutation
- [x] Create refund_protection.ts cron job
- [x] Add email template placeholders

### Post-Deployment

- [ ] Create SendGrid email templates
- [ ] Update email_templates.ts with real template IDs
- [ ] Test cron job manually (set schedule to run in 5 mins)
- [ ] Monitor Azure logs for cron execution
- [ ] Test full flow with staging environment
- [ ] Document cron job monitoring in runbook

### Configuration

- [ ] Verify Azure Timer Trigger schedule: `"0 0 2 * * *"`
- [ ] Configure support email: `support@spiriverse.com`
- [ ] Set up alerting for cron job failures

---

## Monitoring & Observability

### Metrics to Track

1. **Auto-refunds processed**: Count per day
2. **Label cost refunds issued**: Count per day
3. **Average time to auto-refund**: delivery → auto-process
4. **Escalations to support**: Count per day

### Logs to Monitor

1. **Cron execution logs**: `/functions/refund_protection.ts`
2. **Refund processing errors**: `process_refund()` failures
3. **Webhook failures**: ShipEngine delivery tracking misses

### Alerts to Configure

1. **Cron job failure**: No execution in 25 hours
2. **High escalation rate**: >10 support escalations per day
3. **Refund processing failures**: >5% failure rate

---

## Future Enhancements

### Phase 2 Improvements

1. **Merchant Notification Before Auto-Refund**
   - Send reminder email on day 5 (2 days before auto-refund)
   - Give merchant chance to inspect and process manually

2. **Customer Self-Service Dashboard**
   - Show refund status and deadlines
   - Display countdown to auto-refund
   - Show escalation status

3. **Merchant Dashboard Alerts**
   - Show pending returns with days remaining
   - Highlight urgent refunds (< 2 days)

4. **Configurable Deadlines**
   - Allow merchants to set custom inspection window (3-14 days)
   - Platform-wide configuration for safety net window

5. **Analytics Dashboard**
   - Merchant refund performance metrics
   - Customer protection activation rate
   - Support escalation trends

---

## Related Documentation

- **Refund System**: `/docs/REFUNDS.md`
- **Refund Workflow**: `/docs/REFUND_EMAIL_AND_WORKFLOW_DISCUSSION.md`
- **Inventory Integration**: `/CLAUDE.md` (Orderline Quantity Tracking)

---

## FAQ

**Q: What if merchant disputes the auto-refund?**
A: Merchant can contact support. Support reviews delivery tracking and timeline. If merchant can prove item wasn't delivered or was damaged, support can issue chargeback to merchant's favor.

**Q: Can merchant extend the 7-day window?**
A: Not in MVP. Future enhancement to allow configurable windows per merchant.

**Q: What if customer lies about not receiving refund?**
A: All refunds tracked in `price_log` with Stripe refund IDs. Support can verify Stripe transaction history.

**Q: Does this work for merchant-paid return shipping?**
A: No labels generated when merchant pays. No auto-refund needed as customer doesn't pay anything upfront.

**Q: What about partial refunds?**
A: Works the same. Auto-refund processes the approved refund amount, whether full or partial.

---

**End of Implementation Documentation**

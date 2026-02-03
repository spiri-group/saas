# Product Refund Rules Override Implementation Plan

**Date**: 2025-10-04
**Objective**: Enable product-level `refundRules` to override refund policy settings

---

## Design Pattern: Policy as Template, Product as Override

### Hierarchy
```
1. Refund Policy (Base Template)
   └─ Defines reasons, tiers, default whoPayShipping per reason

2. Product Refund Rules (Override Layer)
   └─ Can override specific behaviors for this product

3. Final Behavior = Policy + Product Overrides
```

---

## Product Refund Rules Schema

**Location**: `/graphql-backend/src/graphql/product/types.ts:191-200`

```typescript
export type refund_rules_type = {
    allowAutoReturns?: boolean;          // Override auto-approval behavior
    maxShippingCost?: currency_amount_type;  // Cap merchant shipping payment
    productCost?: currency_amount_type;      // For cost-based decisions
    refundWithoutReturn?: boolean;           // OVERRIDE: Force no physical return
    useDefaultAddress?: boolean;
    customAddress?: refund_address_type;
    requirePhoto?: boolean;                  // OVERRIDE: Force photo evidence
    refundTiming?: 'immediate' | 'carrier_scan' | 'delivered' | 'manual';  // OVERRIDE: When to release funds
}
```

---

## Override Logic Mapping

### Override #1: `refundWithoutReturn` → `whoPayShipping`

**Client Setting**: "Do you want the item sent back?"
- `refundWithoutReturn: false` → YES, require return → Use policy's `whoPayShipping`
- `refundWithoutReturn: true` → NO, refund without return → Force `whoPayShipping: "NOT_REQUIRED"`

**Server Logic**:
```typescript
// Determine effective whoPayShipping
let effectiveWhoPayShipping: string;

if (product.refundRules?.refundWithoutReturn === true) {
  // Product override: no physical return needed
  effectiveWhoPayShipping = "NOT_REQUIRED";
} else {
  // Use policy reason's default
  effectiveWhoPayShipping = refundReason.whoPayShipping;
}

// Only calculate return shipping if physical return required
if (effectiveWhoPayShipping !== "NOT_REQUIRED") {
  // ... existing shipping calculation logic
}
```

### Override #2: `requirePhoto` → Evidence Requirements

**Client Setting**: "Require photo proof?"
- `requirePhoto: false` → Photos only for damaged/faulty (policy decides)
- `requirePhoto: true` → Photos required for ALL refund reasons

**Server Logic**:
```typescript
// Check if evidence photos required
const photoRequired = product.refundRules?.requirePhoto === true ||
                     refundReason.whoPayShipping === "NOT_REQUIRED";

if (photoRequired && (!args.evidencePhotos || args.evidencePhotos.length < 2)) {
  throw new Error("This product requires at least 2 evidence photos for refunds");
}
```

### Override #3: `refundTiming` → Auto-Approval Logic

**Client Setting**: "When should the refund be released?"
- `immediate` → Auto-approve immediately
- `carrier_scan` → Auto-approve when carrier picks up return
- `delivered` → Auto-approve when return delivered
- `manual` → NEVER auto-approve, always require merchant approval

**Server Logic**:
```typescript
// Check if auto-approval allowed
let autoApprove = false;

if (product.refundRules?.refundTiming === 'manual') {
  // Product override: force manual approval
  autoApprove = false;
} else {
  // Check policy-based auto-approval conditions
  if (refundReason?.confirmed && !refundReason?.no_refund) {
    // Check tiers for auto-approval
    const orderAgeDays = Math.abs(DateTime.fromISO(order.createdDate).diffNow('days').days);
    const applicableTier = refundReason.tiers
      .sort((a, b) => a.daysUpTo - b.daysUpTo)
      .find(tier => orderAgeDays <= tier.daysUpTo);

    if (applicableTier && applicableTier.refundPercentage > 0) {
      autoApprove = true;
    }
  }
}

// Set refund status based on auto-approval
const refundStatus = autoApprove ? "APPROVED" : "PENDING";
```

### Override #4: `allowAutoReturns` → Auto-Approval Toggle

**Client Setting**: "Allow automatic returns?"
- `allowAutoReturns: false` → ALL refunds require manual approval
- `allowAutoReturns: true` → Policy controls auto-approval

**Server Logic**:
```typescript
if (product.refundRules?.allowAutoReturns === false) {
  // Product override: disable all auto-approvals
  autoApprove = false;
}
```

### Override #5: `maxShippingCost` → Shipping Cost Cap

**Client Setting**: "Max return shipping cost for automatic returns"
- If return shipping > `maxShippingCost` → Fall back to refundWithoutReturn logic

**Server Logic**:
```typescript
// After calculating return shipping estimate
if (product.refundRules?.maxShippingCost &&
    returnShippingEstimate.cost.amount > product.refundRules.maxShippingCost.amount) {

  // Check if we should refund without return instead
  if (product.refundRules.refundWithoutReturn === true) {
    // Switch to evidence-only refund
    returnShippingEstimate = null;
    effectiveWhoPayShipping = "NOT_REQUIRED";
  } else {
    // Require manual approval for expensive returns
    autoApprove = false;
  }
}
```

---

## Implementation Steps

### Step 1: Add Product Lookup to `upsert_request_refund`

**Location**: `/graphql-backend/src/graphql/order/index.ts` (after line 530)

```typescript
// After fetching order and customer, get product details for overrides
const productOverrides = new Map<string, refund_rules_type>();

for (const line of args.lines) {
  const orderLine = order.lines.find(l => l.id === line.id);
  if (!orderLine || orderLine.target.startsWith("TOUR") || orderLine.target.startsWith("CASE")) {
    continue; // Skip non-product lines
  }

  const forObject = orderLine.forObject as recordref_type;

  // Check if we already fetched this product
  if (!productOverrides.has(forObject.id)) {
    const product = await context.dataSources.cosmos.get_record<product_type>(
      forObject.container,
      forObject.id,
      forObject.partition
    );

    if (product.refundRules) {
      productOverrides.set(forObject.id, product.refundRules);
    }
  }
}
```

### Step 2: Apply Override Logic in Return Shipping Calculation

**Location**: `/graphql-backend/src/graphql/order/index.ts:656`

**Current**:
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund) {
```

**New**:
```typescript
// Check if any product overrides require no return
const anyProductRequiresNoReturn = productLines.some(line => {
  const forObject = line.forObject as recordref_type;
  const rules = productOverrides.get(forObject.id);
  return rules?.refundWithoutReturn === true;
});

// Determine effective shipping requirement
let effectiveWhoPayShipping = refundReason?.whoPayShipping;

if (anyProductRequiresNoReturn) {
  effectiveWhoPayShipping = "NOT_REQUIRED";
}

// Only calculate shipping if physical return required
if (productLines.length > 0 &&
    refundReason &&
    !refundReason.no_refund &&
    effectiveWhoPayShipping !== "NOT_REQUIRED") {
  // ... existing shipping calculation
}
```

### Step 3: Apply Override Logic in Auto-Approval

**Location**: `/graphql-backend/src/graphql/order/index.ts:538-576`

**Add after policy-based auto-approval check**:
```typescript
// Check policy-based auto-approval first
if (refundReason?.confirmed && !refundReason?.no_refund) {
  // ... existing tier checking logic
  autoApprove = true;
}

// Apply product-level overrides
for (const line of args.lines) {
  const orderLine = order.lines.find(l => l.id === line.id);
  if (!orderLine) continue;

  const forObject = orderLine.forObject as recordref_type;
  const rules = productOverrides.get(forObject.id);

  if (!rules) continue;

  // Override: Disable auto-returns entirely
  if (rules.allowAutoReturns === false) {
    autoApprove = false;
    break;
  }

  // Override: Force manual approval timing
  if (rules.refundTiming === 'manual') {
    autoApprove = false;
    break;
  }
}
```

### Step 4: Add Server-Side Photo Evidence Validation

**Location**: `/graphql-backend/src/graphql/order/index.ts` (after line 576)

```typescript
// Check if evidence photos required by product override
let evidenceRequired = false;

for (const line of args.lines) {
  const orderLine = order.lines.find(l => l.id === line.id);
  if (!orderLine) continue;

  const forObject = orderLine.forObject as recordref_type;
  const rules = productOverrides.get(forObject.id);

  // Product requires photos, OR refund without return requires photos
  if (rules?.requirePhoto === true ||
      rules?.refundWithoutReturn === true) {
    evidenceRequired = true;
    break;
  }
}

// Also check policy reason
if (refundReason?.whoPayShipping === "NOT_REQUIRED") {
  evidenceRequired = true;
}

// Validate evidence photos
if (evidenceRequired && (!args.evidencePhotos || args.evidencePhotos.length < 2)) {
  throw new Error("This refund requires at least 2 evidence photos");
}
```

### Step 5: Apply Max Shipping Cost Override

**Location**: `/graphql-backend/src/graphql/order/index.ts` (after line 856)

```typescript
// After calculating return shipping estimate, check max cost
if (returnShippingEstimate) {
  for (const line of productLines) {
    const forObject = line.forObject as recordref_type;
    const rules = productOverrides.get(forObject.id);

    if (rules?.maxShippingCost &&
        returnShippingEstimate.cost.amount > rules.maxShippingCost.amount) {

      context.logger.logMessage(
        `Return shipping (${returnShippingEstimate.cost.amount}) exceeds product max (${rules.maxShippingCost.amount})`
      );

      // Check if we should refund without return instead
      if (rules.refundWithoutReturn === true) {
        context.logger.logMessage("Switching to refund without return");
        returnShippingEstimate = null;
        effectiveWhoPayShipping = "NOT_REQUIRED";
      } else {
        // Require manual approval for expensive returns
        context.logger.logMessage("Forcing manual approval due to high shipping cost");
        autoApprove = false;
      }

      break;
    }
  }
}
```

---

## Email Template Updates

### When Product Overrides "Refund Without Return"

**New Template**: `PRODUCT_REFUND_REQUEST_EVIDENCE_ONLY`

**To**: Merchant
**Subject**: `Refund Request for Order #{order.code} - Evidence Only`

**Body**:
```
A customer has requested a refund for order #{order.code}.

This product is configured to allow refunds without physical return.
The customer has provided evidence photos for your review.

Items:
- {line.descriptor} x {refund_quantity}

Refund Amount: ${amount}

Evidence Photos: {count} photos attached

Please review the evidence and approve or reject this refund request.

[View Evidence & Approve/Reject]
```

---

## GraphQL Schema Updates

### Ensure Product Type Includes RefundRules

**Location**: `/graphql-backend/src/graphql/product/query.graphql`

```graphql
type Product {
  id: ID!
  name: String!
  # ... other fields
  refundRules: RefundRules
}

type RefundRules {
  allowAutoReturns: Boolean
  maxShippingCost: CurrencyAmount
  productCost: CurrencyAmount
  refundWithoutReturn: Boolean
  useDefaultAddress: Boolean
  customAddress: RefundAddress
  requirePhoto: Boolean
  refundTiming: RefundTiming
}

enum RefundTiming {
  immediate
  carrier_scan
  delivered
  manual
}

type RefundAddress {
  street: String
  city: String
  state: String
  postcode: String
  country: String
}
```

---

## Testing Strategy

### Test Case 1: Product Override "Refund Without Return"

**Setup**:
- Policy: "Defective Item" → `whoPayShipping: "MERCHANT"`
- Product: `refundWithoutReturn: true`

**Expected Behavior**:
1. Customer selects "Defective Item" reason
2. System checks product override
3. Skips return shipping calculation
4. Requires 2+ evidence photos
5. Creates refund with `whoPayShipping: "NOT_REQUIRED"`
6. Sends evidence-only email to merchant

**Test**:
```graphql
mutation {
  upsert_request_refund(
    orderRef: { id: "order-uuid", ... }
    lines: [{ id: "line-uuid", refund_quantity: 1 }]
    reasonId: "defective-reason-id"
    evidencePhotos: [
      { url: "photo1.jpg", ... },
      { url: "photo2.jpg", ... }
    ]
  ) {
    order {
      lines {
        refund_request_log {
          returnShippingEstimate { whoPayShipping }
        }
      }
    }
  }
}
```

**Verify**:
- ✅ No `returnShippingEstimate` created
- ✅ Evidence photos required (server validation)
- ✅ Email sent to merchant with evidence

### Test Case 2: Product Override "Manual Approval"

**Setup**:
- Policy: "Change of Mind" → `confirmed: true` (auto-approve)
- Product: `refundTiming: "manual"`

**Expected Behavior**:
1. Customer selects "Change of Mind" reason
2. Policy says auto-approve
3. Product override says manual approval
4. Product override wins
5. Refund status: `PENDING` (not `APPROVED`)

**Test**:
```graphql
mutation {
  upsert_request_refund(
    orderRef: { id: "order-uuid", ... }
    lines: [{ id: "line-uuid", refund_quantity: 1 }]
    reasonId: "change-of-mind-reason-id"
  ) {
    order {
      lines {
        refund_request_log {
          status  # Should be PENDING, not APPROVED
        }
      }
    }
  }
}
```

**Verify**:
- ✅ Refund status: `PENDING`
- ✅ Merchant must manually approve

### Test Case 3: Max Shipping Cost Exceeded

**Setup**:
- Policy: "Wrong Item" → `whoPayShipping: "MERCHANT"`
- Product: `maxShippingCost: { amount: 500, currency: "USD" }` ($5.00)
- Product: `refundWithoutReturn: true`
- Actual shipping cost: $12.00

**Expected Behavior**:
1. Customer requests refund
2. System calculates shipping: $12.00
3. Exceeds product max: $5.00
4. Product has `refundWithoutReturn: true`
5. Switches to evidence-only refund
6. No return shipping

**Test**:
```graphql
mutation {
  upsert_request_refund(
    orderRef: { id: "order-uuid", ... }
    lines: [{ id: "line-uuid", refund_quantity: 1 }]
    reasonId: "wrong-item-reason-id"
    evidencePhotos: [
      { url: "photo1.jpg", ... },
      { url: "photo2.jpg", ... }
    ]
  ) {
    order {
      lines {
        refund_request_log {
          returnShippingEstimate  # Should be null
        }
      }
    }
  }
}
```

**Verify**:
- ✅ Return shipping NOT created despite merchant-pays policy
- ✅ Evidence photos required
- ✅ Refund processed without physical return

### Test Case 4: Multiple Products with Different Rules

**Setup**:
- Order has 2 products:
  - Product A: `refundWithoutReturn: true`
  - Product B: `refundWithoutReturn: false` (require return)
- Customer requests refund for both

**Expected Behavior**:
- Product A: Evidence-only refund
- Product B: Requires physical return

**Edge Case**: How to handle mixed requirements?

**Recommendation**: Create separate refund records per product type
- One refund record for evidence-only products
- One refund record for return-required products

---

## Edge Cases & Considerations

### Edge Case 1: Partial Refund with Mixed Products

**Scenario**: Order has products with different `refundWithoutReturn` settings

**Solution**: Group refund lines by effective shipping requirement
```typescript
// Group by effective whoPayShipping
const linesByShipping = {
  NOT_REQUIRED: [],  // Evidence-only products
  CUSTOMER: [],      // Customer pays return
  MERCHANT: []       // Merchant pays return
};

for (const line of args.lines) {
  const rules = productOverrides.get(line.forObject.id);
  const effective = rules?.refundWithoutReturn === true
    ? "NOT_REQUIRED"
    : refundReason.whoPayShipping;

  linesByShipping[effective].push(line);
}

// Create separate refund records for each group
```

### Edge Case 2: Product Rules vs Policy Reason Conflict

**Scenario**:
- Policy reason: `whoPayShipping: "NOT_REQUIRED"` (evidence-based)
- Product: `refundWithoutReturn: false` (require return)

**Resolution**: **Policy reason wins** - if reason requires evidence only, product can't override to require return

**Logic**:
```typescript
// Policy reason takes precedence for evidence-only
if (refundReason.whoPayShipping === "NOT_REQUIRED") {
  effectiveWhoPayShipping = "NOT_REQUIRED";
} else if (product.refundRules?.refundWithoutReturn === true) {
  effectiveWhoPayShipping = "NOT_REQUIRED";
} else {
  effectiveWhoPayShipping = refundReason.whoPayShipping;
}
```

### Edge Case 3: Evidence Photos Required But Not Provided

**Scenario**: Product requires photos but customer didn't upload any

**Current Behavior**: Client blocks submission (line 550-555 in RefundModal)

**Server Validation**: Add explicit server-side check (see Step 4 above)

---

## Migration Considerations

### Existing Products Without RefundRules

**Issue**: Products created before this implementation won't have `refundRules`

**Solution**: Treat `undefined` as "use policy defaults"

```typescript
const rules = productOverrides.get(forObject.id);

// Only apply override if explicitly set
if (rules?.refundWithoutReturn === true) {
  // Override to evidence-only
} else if (rules?.refundWithoutReturn === false) {
  // Override to require return
} else {
  // Undefined → use policy default
}
```

---

## Summary of Changes Required

### Backend Files

1. **`/graphql-backend/src/graphql/order/index.ts`**
   - Add product lookup logic (Step 1)
   - Apply `refundWithoutReturn` override (Step 2)
   - Apply `refundTiming` and `allowAutoReturns` overrides (Step 3)
   - Add evidence photo validation (Step 4)
   - Apply `maxShippingCost` override (Step 5)

2. **`/graphql-backend/src/client/email_templates.ts`**
   - Add `PRODUCT_REFUND_REQUEST_EVIDENCE_ONLY` template

3. **`/graphql-backend/src/graphql/product/query.graphql`**
   - Ensure `refundRules` field returned in product queries

### Frontend Files

**No changes required** - UI already collects the data correctly!

The issue was purely server-side (data collected but not used).

---

## Implementation Priority

### Phase 1: Core Override Logic (High Priority)
- ✅ Product lookup in refund request
- ✅ `refundWithoutReturn` → `whoPayShipping` override
- ✅ Skip shipping calculation for evidence-only

### Phase 2: Auto-Approval Overrides (Medium Priority)
- ✅ `refundTiming: "manual"` override
- ✅ `allowAutoReturns: false` override

### Phase 3: Advanced Features (Low Priority)
- ✅ `maxShippingCost` override
- ✅ `requirePhoto` override
- ✅ Evidence-only email template

### Phase 4: Edge Cases (Optional)
- Mixed product refunds (group by shipping requirement)
- Policy vs product conflict resolution
- Migration for existing products

---

## Rollout Strategy

1. **Week 1**: Implement Phase 1 (core override)
2. **Week 2**: Add comprehensive tests
3. **Week 3**: Implement Phases 2 & 3
4. **Week 4**: Beta test with select merchants
5. **Week 5**: Full rollout

---

## Success Criteria

- ✅ Product with `refundWithoutReturn: true` skips return shipping calculation
- ✅ Product with `refundTiming: "manual"` never auto-approves
- ✅ Product with `allowAutoReturns: false` always requires manual approval
- ✅ Product with `maxShippingCost` cap switches to evidence-only when exceeded
- ✅ Product with `requirePhoto: true` requires photos for all refund reasons
- ✅ All existing tests still pass
- ✅ No breaking changes to existing refund flows

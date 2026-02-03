# Product Creation & Refund Policy Integration Analysis

**Date**: 2025-10-04
**Scope**: How refund policies are assigned to products during creation

---

## Overview

The product creation flow includes a **two-tier refund system**:
1. **Policy-level**: Merchants select a refund policy (or opt-out)
2. **Product-level**: Merchants configure product-specific refund rules

This creates a **potential disconnect** between what's configured at product creation and what's actually used during the refund request flow.

---

## Product Creation Flow

### Step 1: Basic Details & Policy Selection

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/index.tsx:382-437`

**UI Elements**:

1. **Refund Policy Dropdown** (Required)
   ```tsx
   <FormField name="refundPolicyId">
     <ComboBox
       disabled={form.watch('noRefunds')}
       onChange={(value) => {
         field.onChange(value.id);
         if (form.watch('noRefunds')) {
           form.setValue('noRefunds', false);
         }
       }}
     />
   </FormField>
   ```

2. **"No Refunds" Checkbox**
   ```tsx
   <FormField name="noRefunds">
     <Checkbox
       checked={field.value || false}
       onCheckedChange={(checked) => {
         field.onChange(checked);
         if (checked) {
           // Clear refund policy when no refunds is selected
           form.setValue('refundPolicyId', undefined);
         }
       }}
     />
   </FormField>
   ```

**Mutual Exclusion Logic** (lines 61-77):
```tsx
// Watch for changes in noRefunds and refundPolicyId
const noRefunds = form.watch('noRefunds')
const refundPolicyId = form.watch('refundPolicyId')

useEffect(() => {
  if (noRefunds && refundPolicyId) {
    // When noRefunds is checked, clear refundPolicyId
    form.setValue('refundPolicyId', undefined, { shouldValidate: true })
  }
}, [noRefunds])

useEffect(() => {
  // When refundPolicyId is selected, clear noRefunds
  if (refundPolicyId && noRefunds) {
    form.setValue('noRefunds', false, { shouldValidate: true })
  }
}, [refundPolicyId])
```

**✅ Works Correctly**: User can either select a policy OR opt-out, not both.

### Step 2: Product-Specific Refund Rules

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/index.tsx:440-488`

**Shown Only If**: `!values.noRefunds` (refunds are allowed)

**Questions Asked**:

#### A. Do you want the item sent back?
```tsx
<FormField name="refundRules.refundWithoutReturn">
  <Select
    value={field.value === false ? "yes" : "no"}
    onValueChange={(value) => field.onChange(value === "no")}
  >
    <SelectItem value="yes">Yes - require return</SelectItem>
    <SelectItem value="no">No - refund without return</SelectItem>
  </Select>
</FormField>
```

**Mapping**:
- `"yes"` → `refundWithoutReturn: false` → Item must be returned
- `"no"` → `refundWithoutReturn: true` → Refund without physical return

#### B. When should the refund be released?
```tsx
<FormField name="refundRules.refundTiming">
  <Select value={field.value} onValueChange={field.onChange}>
    <SelectItem value="immediate">Immediately</SelectItem>
    <SelectItem value="carrier_scan">When carrier scans return</SelectItem>
    <SelectItem value="delivered">When return is delivered</SelectItem>
    <SelectItem value="manual">Manual approval</SelectItem>
  </Select>
</FormField>
```

**Options**:
- `immediate` - Refund when approved
- `carrier_scan` - Refund when carrier picks up return
- `delivered` - Refund when return arrives
- `manual` - Merchant manually releases funds

### Enhanced Refund Rules Dialog

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/component/RefundRulesDialog.tsx`

**Note**: This appears to be a **more detailed version** of refund rules that may not be currently integrated in the main flow.

**Questions in Enhanced Dialog**:

1. **Allow Automatic Returns?** (line 164-205)
   - Yes → Auto-approve valid returns
   - No → Manual review for each return

2. **Max Return Shipping Cost** (line 208-260)
   - Only shown if auto-returns enabled
   - Sets maximum merchant will pay for return shipping
   - Includes smart calculations based on product cost/profit

3. **Refund Without Return?** (line 263-304)
   - If return shipping > product value, refund anyway?
   - Yes → Customer keeps item
   - No → Always require physical return

4. **Require Photo Proof?** (line 307-367)
   - Always required for damaged/faulty items
   - This controls if photos needed for other reasons (wrong size, changed mind)
   - If enabled, forces `refundTiming: "manual"`

5. **Refund Timing** (line 370-433)
   - Same options as simple version
   - Disabled/locked to "manual" if photo proof required

**Default Values** (lines 83-99):
```tsx
setValue('refundRules.allowAutoReturns', true)
setValue('refundRules.maxShippingCost', { amount: 1000, currency: merchantCurrency }) // $10
setValue('refundRules.requirePhoto', false)
setValue('refundRules.refundTiming', 'carrier_scan')
setValue('refundRules.refundWithoutReturn', true)
```

---

## Data Schema

### CreateProductSchema

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/hooks/UseCreateProduct.tsx:23-83`

```typescript
export const CreateProductSchema = z.object({
  soldFromLocationId: z.string().uuid(),
  refundPolicyId: z.string().uuid().optional(),
  noRefunds: z.boolean().optional(),
  // ... other fields
  refundRules: z.object({
    allowAutoReturns: z.boolean().optional(),
    maxShippingCost: CurrencyAmountSchema.optional(),
    productCost: CurrencyAmountSchema.optional(),
    refundWithoutReturn: z.boolean(),
    useDefaultAddress: z.boolean().optional(),
    customAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional()
    }).optional(),
    requirePhoto: z.boolean().optional(),
    refundTiming: z.enum(['immediate', 'carrier_scan', 'delivered', 'manual'])
  }).optional(),
}).refine((data) => {
  // Either refundPolicyId or noRefunds must be provided
  return !!(data.refundPolicyId || data.noRefunds);
}, {
  message: "Either select a refund policy or check 'No refunds'",
  path: ["refundPolicyId"]
}).refine((data) => {
  // If refunds are enabled, refund rules must be provided
  if (!data.noRefunds) {
    return !!(data.refundRules?.refundWithoutReturn !== undefined &&
             data.refundRules?.refundTiming);
  }
  return true;
}, {
  message: "Please complete the refund settings",
  path: ["refundRules"]
})
```

**Validation Rules**:
1. Must have `refundPolicyId` OR `noRefunds = true`
2. If `noRefunds = false`, must have `refundRules.refundWithoutReturn` and `refundRules.refundTiming`

---

## Critical Analysis: The Disconnect

### Problem: Two Separate Systems

**At Product Creation**:
- ✅ Merchant selects a **refund policy** (defines reasons, tiers, who pays shipping)
- ✅ Merchant configures **product-specific rules** (return required?, when to refund?)

**At Refund Request** (`upsert_request_refund`):
- ❌ Uses **refund policy reasons** to determine `whoPayShipping`
- ❌ Uses **refund policy tiers** to calculate refund percentage
- ❌ **IGNORES** product-level `refundRules` completely

### Where Product Refund Rules Are (Not) Used

#### Searched for `refundRules` usage:
```bash
# Server-side (GraphQL backend)
❌ Not found in refund mutations
❌ Not found in refund queries
❌ Not found in webhook handlers
```

**Conclusion**: Product-level `refundRules` appear to be **stored but never used**.

### What Actually Determines Refund Behavior

**Location**: `/graphql-backend/src/graphql/order/index.ts` (upsert_request_refund)

**Line 538-576**: Auto-approval check
```typescript
if (args.reasonId) {
  const policy = await dataSources.cosmos.run_query("Main-VendorSettings", {
    query: `SELECT * FROM c WHERE c.type = "REFUND_POLICY" AND c.id = @policyId`,
    parameters: [{ name: "@policyId", value: refundPolicyId }]
  });

  const reason = policy.reasons.find(r => r.id === args.reasonId);

  // Auto-approve if:
  // - reason.confirmed === true
  // - reason.no_refund === false
  // - Order age matches a tier with refundPercentage > 0
}
```

**Line 656**: Return shipping calculation
```typescript
if (productLines.length > 0 && refundReason && !refundReason.no_refund) {
  // Uses refundReason.whoPayShipping from policy
  // NOT product.refundRules.refundWithoutReturn
}
```

**Line 838**: Who pays shipping
```typescript
const whoPayShipping = refundReason.whoPayShipping.toLowerCase();
// From POLICY reason, not product refundRules
```

---

## Issues & Recommendations

### 🚨 Issue #1: Product Refund Rules Not Applied

**Problem**: The `refundRules` configured during product creation are never consulted during refund processing.

**Impact**:
- Merchant sets "No - refund without return" but system still calculates shipping
- Merchant sets "Manual approval" but system auto-approves based on policy
- Confusing UX - merchants think they're controlling behavior but they're not

**Recommended Fix Options**:

#### Option A: Remove Product-Level Rules (Simplify)
- Remove `refundRules` from product creation entirely
- Only use refund policies
- Clearer mental model: policies control everything

**Files to Update**:
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/index.tsx` (remove lines 440-488)
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/hooks/UseCreateProduct.tsx` (remove refundRules from schema)
- `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/component/RefundRulesDialog.tsx` (remove entire component)

#### Option B: Integrate Product-Level Rules (Complex)
- Use product `refundRules` to **override** policy settings
- Check product rules first, fall back to policy
- More flexible but much more complex

**Implementation**:
```typescript
// In upsert_request_refund mutation
const product = await cosmos.get_record("Main-Listing", productId, merchantId);

// Check product-level override
if (product.refundRules?.refundWithoutReturn === true) {
  // Skip return shipping calculation
  whoPayShipping = "NOT_REQUIRED";
} else {
  // Use policy reason's whoPayShipping
  whoPayShipping = refundReason.whoPayShipping;
}
```

**Files to Update**:
- `/graphql-backend/src/graphql/order/index.ts` (lines 509-1095, add product rules lookup)
- `/graphql-backend/src/graphql/product/types.ts` (ensure refundRules stored on product)
- Refund approval logic to respect `requirePhoto` and `refundTiming`

#### Option C: Use Product Rules for Policy-Less Refunds
- If merchant selects "No refunds" but later wants to issue one-off refund
- Use product `refundRules` as fallback policy

**Use Case**: Emergency refunds for products marked "no refunds"

---

### ⚠️ Issue #2: Enhanced Dialog Not Integrated

**Problem**: `RefundRulesDialog.tsx` (600+ line component) is a more detailed version with:
- Auto-returns toggle
- Max shipping cost calculator
- Product cost/profit analytics
- Photo proof requirements

**Status**: Appears to be built but not integrated in main product creation flow

**Questions**:
1. Is this an **incomplete feature**?
2. Was it **replaced** with the simpler version?
3. Is it used in **edit mode** but not create mode?

**Recommendation**:
- If intended to be used: Integrate it and ensure data is respected server-side
- If deprecated: Remove the file to avoid confusion

---

### 🔍 Issue #3: Refund Policy Lookup During Refund Request

**Location**: `/graphql-backend/src/graphql/order/index.ts:156-217` (orderRefundPolicy query)

**How It Works**:
```typescript
// Get order
const order = await cosmos.get_record("Main-Orders", orderId);

// Get merchant from first line
const merchantId = order.lines[0].merchantId;

// Get listing to determine type
const listing = await cosmos.get_record("Main-Listing", forObjectRef.id, forObjectRef.partition);

// Query for policy
const policies = await cosmos.run_query("Main-VendorSettings", {
  query: `SELECT * FROM c
          WHERE c.vendorId = @merchantId
          AND c.type = 'REFUND_POLICY'
          AND c.listingType = @listingType`,
  parameters: [
    { name: "@merchantId", value: merchantId },
    { name: "@listingType", value: listing.type }  // "PRODUCT" or "TOUR"
  ]
});
```

**The Gap**:
- Product creation stores `refundPolicyId` on the product
- Refund request queries for policy by `listingType` + `merchantId`
- **Never uses the specific `refundPolicyId` from the product**

**This Could Cause Issues If**:
- Merchant has multiple policies for same listing type
- Wrong policy gets selected
- Product was created with policy A, but system finds policy B

**Recommended Fix**:
```typescript
// In orderRefundPolicy query
const listing = await cosmos.get_record("Main-Listing", forObjectRef.id, forObjectRef.partition);

// Use the product's specific policy if available
if (listing.refundPolicyId) {
  const policy = await cosmos.get_record("Main-VendorSettings", listing.refundPolicyId, merchantId);
  return policy;
}

// Fall back to generic lookup
// ... existing logic
```

**Files to Update**:
- `/graphql-backend/src/graphql/order/index.ts:156-217`

---

### 🔍 Issue #4: Country-Specific Policy Selection

**Location**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/index.tsx:44`

```typescript
const soldFrom = form.watch('soldFromLocationId')
const location = merchant_locations.data?.find(l => l.id == soldFrom)
const refund_policies = useVendorRefundPolicies(
  merchantId,
  "PRODUCT",
  location?.address.components.country  // Filters by country
)
```

**Good**: Policies are country-specific (e.g., different rules for US vs AU)

**Issue**: If product's `soldFromLocationId` changes after creation, the policy might not match anymore.

**Example**:
1. Product created with soldFrom: "Sydney, AU" → uses AU refund policy
2. Product later changed to soldFrom: "Los Angeles, US" → still linked to AU policy
3. Customer refund uses old AU policy rules

**Recommendation**:
- Store `soldFromCountry` snapshot with `refundPolicyId`
- OR re-validate policy matches soldFrom location during refund request

---

## Flow Comparison: Expected vs. Actual

### Expected Flow (Based on UI)

```
Product Creation
  ├─ Merchant selects Refund Policy → [Policy A: PRODUCT, US]
  ├─ Merchant sets "No - refund without return" → refundRules.refundWithoutReturn = true
  └─ Merchant sets "Manual approval" → refundRules.refundTiming = "manual"

Customer Refund Request
  ├─ System looks up product → finds refundRules
  ├─ Sees refundWithoutReturn = true → skips return shipping
  ├─ Sees refundTiming = "manual" → requires merchant approval
  └─ Processes refund without physical return

✅ Expected: Product rules override/enhance policy
```

### Actual Flow (What Really Happens)

```
Product Creation
  ├─ Merchant selects Refund Policy → [Policy A: PRODUCT, US]
  ├─ Merchant sets "No - refund without return" → ❌ Stored but ignored
  └─ Merchant sets "Manual approval" → ❌ Stored but ignored

Customer Refund Request
  ├─ System looks up refund policy (by listingType + merchantId)
  ├─ Finds Policy A with reasons:
  │   └─ "Defective Item" → whoPayShipping: "MERCHANT"
  ├─ Customer selects "Defective Item" reason
  ├─ System calculates return shipping (merchant pays)
  └─ Auto-approves if reason.confirmed === true

❌ Actual: Product rules completely ignored, policy controls everything
```

---

## Recommendations Priority

### 🔥 High Priority

1. **Clarify Product Rules Usage**
   - **Decision needed**: Use them or remove them?
   - If using: Implement integration in refund flow
   - If removing: Clean up UI and schema

2. **Fix Policy Lookup**
   - Use product's specific `refundPolicyId` instead of generic query
   - Prevents wrong policy from being selected

### 🟡 Medium Priority

3. **Validate RefundRulesDialog Integration**
   - Determine if enhanced dialog should be used
   - Remove if deprecated to avoid confusion

4. **Country-Specific Policy Validation**
   - Ensure policy matches current soldFrom location
   - Handle location changes after creation

### 🟢 Low Priority

5. **Documentation**
   - Update merchant help docs to clarify what controls what
   - Clear explanation: "Refund policies control reasons and who pays. Product rules are for..."

---

## Testing Checklist

### Scenario 1: Product with "Refund Without Return"
- [ ] Create product with policy + set `refundWithoutReturn = true`
- [ ] Customer requests refund
- [ ] **Expected**: No return shipping calculated
- [ ] **Actual**: Return shipping calculated anyway (BUG)

### Scenario 2: Product with "Manual Approval"
- [ ] Create product with policy + set `refundTiming = "manual"`
- [ ] Customer requests refund with auto-approved reason
- [ ] **Expected**: Merchant must manually approve
- [ ] **Actual**: Auto-approved based on policy (BUG)

### Scenario 3: Product with Specific Policy ID
- [ ] Merchant has 2 PRODUCT policies (A and B)
- [ ] Create product and select Policy A
- [ ] Store `refundPolicyId = "policy-A-uuid"` on product
- [ ] Customer requests refund
- [ ] **Expected**: Uses Policy A
- [ ] **Actual**: May use Policy B if query finds it first (BUG)

### Scenario 4: Country Change After Creation
- [ ] Create product soldFrom: AU, refundPolicyId: "AU-policy"
- [ ] Change product soldFrom: US
- [ ] Customer requests refund
- [ ] **Expected**: Use US policy or error
- [ ] **Actual**: Still uses AU policy (POTENTIAL BUG)

---

## Conclusion

**Summary**: Product creation collects detailed refund rules (`refundRules`) that are **stored but never used**. All refund behavior is controlled by **refund policies** (reasons, tiers, whoPayShipping).

**Immediate Action Required**:
1. Decide: Should product-level rules override/enhance policies?
2. If yes → Implement integration server-side
3. If no → Remove product-level refund rules from UI/schema

**Risk**: Merchant confusion - UI suggests product rules control refunds, but they don't.

# Refunds System - Remaining Implementation Tasks

**Date Created**: 2025-10-04
**Date Updated**: 2025-10-05

---

## Overview

This document outlines the remaining critical tasks for the refunds system implementation. All tasks are essential for a complete, production-ready refund workflow.

---

## Task 1: Fix Policy Lookup to Use Product's refundPolicyId

### Priority: 🟡 **HIGH**

### Problem Statement

**Current Behavior** (`/graphql-backend/src/graphql/order/index.ts:156-217`):
```typescript
// orderRefundPolicy query
const policies = await cosmos.run_query("Main-VendorSettings", {
    query: `SELECT * FROM c
            WHERE c.vendorId = @merchantId
            AND c.type = 'REFUND_POLICY'
            AND c.listingType = @listingType`,
    parameters: [
        { name: "@merchantId", value: merchantId },
        { name: "@listingType", value: listing.type }  // Generic lookup
    ]
});

return policies[0]; // ❌ Returns first match - could be wrong policy!
```

**Problem**:
- Merchant has 2 PRODUCT policies (Policy A and Policy B)
- Product created with `refundPolicyId: "policy-A-uuid"`
- Query finds Policy B first (wrong!)
- Customer gets wrong refund rules

### Expected Behavior

Product stores specific `refundPolicyId` during creation → System should use that exact policy, not search by type.

### Implementation

#### Location
`/graphql-backend/src/graphql/order/index.ts:156-217` (orderRefundPolicy query)

#### Updated Logic

```typescript
// Query: orderRefundPolicy
orderRefundPolicy: async (_: any, args: { orderId: string }, context: serverContext) => {
    const order = await context.dataSources.cosmos.get_record("Main-Orders", args.orderId, args.orderId);

    const firstLine = order.lines[0];
    const merchantId = firstLine.merchantId;
    const forObjectRef = firstLine.forObject as recordref_type;

    // Get the product/listing
    const listing = await context.dataSources.cosmos.get_record(
        forObjectRef.container || "Main-Listing",
        forObjectRef.id,
        Array.isArray(forObjectRef.partition) ? forObjectRef.partition[0] : forObjectRef.partition
    );

    // ✅ NEW: Check if product has a specific refund policy assigned
    if (listing.refundPolicyId) {
        try {
            const policy = await context.dataSources.cosmos.get_record(
                "Main-VendorSettings",
                listing.refundPolicyId,
                merchantId
            );

            if (policy && policy.type === "REFUND_POLICY") {
                return policy; // ✅ Return the specific policy
            }
        } catch (error) {
            context.logger.logMessage(`Could not find policy ${listing.refundPolicyId}, falling back to generic lookup`);
        }
    }

    // ⚠️ Fallback: Generic lookup (existing logic)
    const policies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
        query: `SELECT * FROM c
                WHERE c.vendorId = @merchantId
                AND c.type = 'REFUND_POLICY'
                AND (c.listingType = @listingType OR c.listingType = 'ALL' OR IS_NULL(c.listingType))`,
        parameters: [
            { name: "@merchantId", value: merchantId },
            { name: "@listingType", value: listing.type }
        ]
    }, true);

    // Return first match as fallback
    return policies[0] || null;
}
```

#### Product Type Update

Ensure product type includes `refundPolicyId`:

**File**: `/graphql-backend/src/graphql/product/types.ts`
```typescript
export type product_type = {
    id: string;
    name: string;
    // ... other fields
    refundPolicyId?: string;  // ✅ Ensure this exists
    noRefunds?: boolean;
    refundRules?: refund_rules_type;
    // ...
}
```

#### GraphQL Schema Update

**File**: `/graphql-backend/src/graphql/product/query.graphql`
```graphql
type Product {
    id: ID!
    name: String!
    # ... other fields
    refundPolicyId: ID  # ✅ Ensure this is exposed
    noRefunds: Boolean
    refundRules: RefundRules
    # ...
}
```

#### Testing Checklist

- [ ] Create 2 refund policies for same merchant (Policy A, Policy B)
- [ ] Create product with `refundPolicyId: "policy-A-uuid"`
- [ ] Customer requests refund on that product
- [ ] **Verify**: `orderRefundPolicy` query returns Policy A (not Policy B)
- [ ] Delete Policy A
- [ ] Request refund again
- [ ] **Verify**: Fallback to generic lookup, returns Policy B
- [ ] Create product with `noRefunds: true` (no policy assigned)
- [ ] **Verify**: `orderRefundPolicy` returns null
- [ ] Create product with invalid `refundPolicyId`
- [ ] **Verify**: Falls back to generic lookup, returns appropriate policy

#### Migration Considerations

**Existing Products** (created before this fix):
- ✅ Will have `refundPolicyId: undefined`
- ✅ System falls back to generic lookup (current behavior)
- ✅ **No breaking changes**

**New Products** (created after this fix):
- ✅ Will store specific `refundPolicyId`
- ✅ System uses exact policy
- ✅ More predictable behavior

---

## Task 2: Remove Legacy Refund Components

### Priority: 🟢 **MEDIUM** (Cleanup/Tech Debt)

### Problem Statement

Legacy refund request components exist in the codebase that are no longer used. These create confusion and maintenance burden.

### Files to Remove

#### 1. Legacy Request Refund Components
**Directory**: `/saas-frontend/src/app/(site)/components/RequestRefund/`

**Files**:
- `index.tsx` - Old refund request component
- `hooks/UseRequestRefund.tsx` - Old mutation hook
- `hooks/UseRequestCancelRefund.tsx` - Old cancel hook
- `hooks/UseRejectRequestRefund.tsx` - Old reject hook

**Why Safe to Delete**:
- ✅ All in Git history (can recover if needed)
- ✅ New implementation in `/app/(site)/c/[customerId]/orders/_components/RefundModal.tsx`
- ✅ New hooks in `/app/(site)/c/[customerId]/orders/hooks/`

#### 2. Legacy Refund Rules Dialog
**File**: `/saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/component/RefundRulesDialog.tsx`

**Why Safe to Delete**:
- ✅ 600+ line component not integrated
- ✅ Duplicate of functionality in main product creation flow
- ✅ Appears to be an abandoned enhanced version

#### 3. Unused Request Order Component
**File**: `/saas-frontend/src/app/(site)/components/RequestOrder/index.tsx`

**Check if this is used** - search for imports:
```bash
grep -r "RequestOrder" saas-frontend/src --include="*.tsx" --include="*.ts"
```

If no imports found (besides self), safe to delete.

### Verification Steps Before Deletion

**Step 1: Search for imports**
```bash
# From saas-frontend directory
grep -r "components/RequestRefund" src --include="*.tsx" --include="*.ts"
grep -r "RefundRulesDialog" src --include="*.tsx" --include="*.ts"
grep -r "components/RequestOrder" src --include="*.tsx" --include="*.ts"
```

**Step 2: Verify replacement exists**
- [ ] RefundModal.tsx has all features of old RequestRefund
- [ ] Product creation has refund rules section
- [ ] All mutations work with new hooks

**Step 3: Delete files**
```bash
# Only run after verification
rm -rf saas-frontend/src/app/(site)/components/RequestRefund
rm saas-frontend/src/app/(site)/m/[merchant_slug]/(site)/product/_components/Create/component/RefundRulesDialog.tsx
# rm RequestOrder if confirmed unused
```

**Step 4: Test refund flow**
- [ ] Customer can request refund
- [ ] Merchant can approve/reject
- [ ] Evidence upload works
- [ ] Return shipping works
- [ ] No console errors

### Alternative: Archive Instead of Delete

If uncertain, create archive directory:
```bash
mkdir -p saas-frontend/src/_archived/2025-10-04
mv saas-frontend/src/app/(site)/components/RequestRefund saas-frontend/src/_archived/2025-10-04/
mv saas-frontend/src/app/(site)/m/.../RefundRulesDialog.tsx saas-frontend/src/_archived/2025-10-04/
```

Update `.gitignore`:
```
# Archived code - do not import
src/_archived/
```

---

## Implementation Order

### Next Session:
1. ✅ **Task 1: Policy Lookup Fix** (1-2 hours)
   - Update `orderRefundPolicy` query
   - Verify product schema includes `refundPolicyId`
   - Test with multiple policies

2. ✅ **Task 2: Remove Legacy Components** (30 min - 1 hour)
   - Search for imports
   - Verify replacement exists
   - Delete or archive old components
   - Test refund flow

---

## Validation Checklist

After completing all tasks:

### Policy Lookup
- [ ] Products with specific policyId use that policy
- [ ] Products without policyId fall back to generic lookup
- [ ] Invalid policyId falls back gracefully
- [ ] Multi-policy merchants get correct policy per product

### Legacy Cleanup
- [ ] No import errors after deletion
- [ ] Refund flow works end-to-end
- [ ] Product creation works
- [ ] No console warnings

---

## Critical Notes

### Reference Files:
- Order refund policy query: `/graphql-backend/src/graphql/order/index.ts:177-217`
- Product types: `/graphql-backend/src/graphql/product/types.ts`
- Legacy components: `/saas-frontend/src/app/(site)/components/RequestRefund/`

---

## Success Criteria

✅ **Task 1 Complete When**:
- Products use their assigned refund policy
- Fallback works when policy missing
- No policy lookup errors in logs

✅ **Task 2 Complete When**:
- Legacy components removed (or archived)
- No broken imports
- Refund flow fully functional
- Codebase cleaner and easier to maintain

---

**Ready for next session! 🚀**

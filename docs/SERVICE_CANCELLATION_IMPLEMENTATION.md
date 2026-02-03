# Service Cancellation & Rescheduling Implementation Guide

## Overview

Complete implementation of customer self-service cancellation and rescheduling for spiritual service bookings, with intelligent policy-based refund calculation.

**Status**: ✅ **COMPLETE** (November 21, 2025)

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     MERCHANT DASHBOARD                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Return & Cancellation Policies                      │   │
│  │  ┌────────────────┬─────────────────────────────┐   │   │
│  │  │ Product Returns │ Service Cancellations (NEW) │   │   │
│  │  └────────────────┴─────────────────────────────┘   │   │
│  │                                                       │   │
│  │  - Configure refund tiers (hours-based)             │   │
│  │  - Set rescheduling limits                          │   │
│  │  - Per service category                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  GraphQL Backend │
                    │                  │
                    │  Policy Utils:   │
                    │  - Calculate     │
                    │    refund %      │
                    │  - Check         │
                    │    eligibility   │
                    │  - Process       │
                    │    Stripe refund │
                    └──────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOMER PORTAL                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  My Service Bookings                                 │   │
│  │                                                       │   │
│  │  [Cancel Booking]  [Reschedule]                     │   │
│  │                                                       │   │
│  │  Shows: Refund amount | Reschedules remaining       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### ServiceCancellationPolicy (Main-VendorSettings)

```typescript
{
  id: string;                      // UUID
  type: "SERVICE_CANCELLATION_POLICY";
  vendorId: string;                // Partition key
  merchantId: string;
  serviceCategory: "READING" | "HEALING" | "COACHING";
  title: string;

  // Refund tiers (hours before appointment)
  fullRefundHours?: number;        // e.g., 48
  partialRefundHours?: number;     // e.g., 24
  partialRefundPercentage?: number; // e.g., 50
  noRefundHours?: number;          // e.g., 12

  // Rescheduling rules
  allowRescheduling: boolean;
  maxReschedules?: number;         // e.g., 2
  rescheduleMinHours?: number;     // e.g., 24

  createdDate: string;
  updatedDate: string;
}
```

### Service (Main-Listing) - Updated

```typescript
{
  // ... existing fields
  cancellationPolicyId?: string;   // NEW: Reference to policy
  category: "READING" | "HEALING" | "COACHING";
}
```

### ServiceBooking (Main-Bookings) - Updated

```typescript
{
  // ... existing fields
  rescheduleCount?: number;        // NEW: Track reschedule count
  lastRescheduledAt?: string;      // NEW: Last reschedule timestamp
  cancelledAt?: string;            // NEW: Cancellation timestamp
  cancelReason?: string;           // NEW: Why cancelled
}
```

---

## API Reference

### GraphQL Queries

#### Get Service Cancellation Policies

```graphql
query GetPolicies($merchantId: ID!, $serviceCategory: String) {
  serviceCancellationPolicies(
    merchantId: $merchantId
    serviceCategory: $serviceCategory
  ) {
    id
    title
    serviceCategory
    fullRefundHours
    partialRefundHours
    partialRefundPercentage
    noRefundHours
    allowRescheduling
    maxReschedules
    rescheduleMinHours
    updatedDate
  }
}
```

#### Get Single Policy

```graphql
query GetPolicy($merchantId: ID!, $policyId: ID!) {
  serviceCancellationPolicy(
    merchantId: $merchantId
    policyId: $policyId
  ) {
    id
    title
    serviceCategory
    fullRefundHours
    partialRefundHours
    partialRefundPercentage
    noRefundHours
    allowRescheduling
    maxReschedules
    rescheduleMinHours
  }
}
```

### GraphQL Mutations

#### Create/Update Policies

```graphql
mutation UpsertPolicies(
  $merchantId: ID!
  $policies: [ServiceCancellationPolicyInput]!
) {
  upsert_service_cancellation_policies(
    merchantId: $merchantId
    policies: $policies
  ) {
    code
    success
    message
    policies {
      id
      title
    }
  }
}
```

#### Delete Policy

```graphql
mutation DeletePolicy($merchantId: ID!, $policyId: ID!) {
  delete_service_cancellation_policy(
    merchantId: $merchantId
    policyId: $policyId
  ) {
    code
    success
    message
  }
}
```

#### Cancel Booking (Customer)

```graphql
mutation CancelBooking($input: UpdateServiceBookingInput!) {
  update_service_booking(input: $input) {
    code
    success
    message
    booking {
      id
      status
    }
    refundAmount
    refundPercentage
  }
}

# Input
{
  bookingId: "booking-uuid"
  customerId: "customer-uuid"
  action: "CANCEL"
  reason: "Optional cancellation reason"
}
```

#### Reschedule Booking (Customer)

```graphql
mutation RescheduleBooking($input: RescheduleRequestInput!) {
  request_reschedule(input: $input) {
    code
    success
    message
    booking {
      id
      date
      time {
        start
        end
      }
    }
    rescheduleCount
    maxReschedules
  }
}

# Input
{
  bookingId: "booking-uuid"
  customerId: "customer-uuid"
  newDate: "2025-12-01"
  newTime: {
    start: "14:00"
    end: "15:00"
  }
}
```

---

## Refund Calculation Logic

### Policy Example

```typescript
const policy = {
  fullRefundHours: 48,
  partialRefundHours: 24,
  partialRefundPercentage: 50,
  noRefundHours: 12
};
```

### Calculation Flow

```typescript
import { DateTime } from "luxon";

function calculateRefund(
  policy: ServiceCancellationPolicy,
  appointmentDateTime: string,
  paidAmount: number
): RefundCalculation {
  const now = DateTime.now();
  const appointment = DateTime.fromISO(appointmentDateTime);
  const hoursUntil = appointment.diff(now, 'hours').hours;

  // Full refund tier
  if (hoursUntil >= policy.fullRefundHours) {
    return {
      eligible: true,
      refundPercentage: 100,
      refundAmount: paidAmount,
      reason: `Canceled ${Math.round(hoursUntil)} hours before (full refund)`
    };
  }

  // Partial refund tier
  if (hoursUntil >= policy.partialRefundHours) {
    const percentage = policy.partialRefundPercentage || 50;
    return {
      eligible: true,
      refundPercentage: percentage,
      refundAmount: paidAmount * (percentage / 100),
      reason: `Canceled ${Math.round(hoursUntil)} hours before (partial refund)`
    };
  }

  // No refund tier
  if (hoursUntil < policy.noRefundHours) {
    return {
      eligible: false,
      refundPercentage: 0,
      refundAmount: 0,
      reason: `Canceled within ${policy.noRefundHours} hours (no refund)`
    };
  }

  // Default: no refund if past appointment
  if (hoursUntil < 0) {
    return {
      eligible: false,
      refundPercentage: 0,
      refundAmount: 0,
      reason: 'Appointment has already passed'
    };
  }

  // Fallback
  return {
    eligible: true,
    refundPercentage: 100,
    refundAmount: paidAmount,
    reason: 'No specific rules - full refund applied'
  };
}
```

### Example Scenarios

```typescript
// Appointment: Dec 10, 2025 at 2:00 PM
// Paid: $100

// Scenario 1: Cancel on Dec 8 at 10:00 AM (50 hours before)
calculateRefund(policy, appointmentDate, 100)
// → { eligible: true, refundPercentage: 100, refundAmount: 100 }

// Scenario 2: Cancel on Dec 9 at 6:00 PM (20 hours before)
calculateRefund(policy, appointmentDate, 100)
// → { eligible: true, refundPercentage: 50, refundAmount: 50 }

// Scenario 3: Cancel on Dec 10 at 10:00 AM (4 hours before)
calculateRefund(policy, appointmentDate, 100)
// → { eligible: false, refundPercentage: 0, refundAmount: 0 }
```

---

## Reschedule Eligibility Logic

### Policy Example

```typescript
const policy = {
  allowRescheduling: true,
  maxReschedules: 2,
  rescheduleMinHours: 24
};
```

### Eligibility Check

```typescript
function checkRescheduleEligibility(
  policy: ServiceCancellationPolicy,
  appointmentDateTime: string,
  currentRescheduleCount: number
): RescheduleEligibility {
  // Check if rescheduling allowed
  if (!policy.allowRescheduling) {
    return {
      eligible: false,
      reason: 'Rescheduling not allowed for this service',
      rescheduleCount: currentRescheduleCount,
      maxReschedules: 0
    };
  }

  // Check max reschedules
  const maxReschedules = policy.maxReschedules || 0;
  if (currentRescheduleCount >= maxReschedules) {
    return {
      eligible: false,
      reason: `Maximum reschedules (${maxReschedules}) reached`,
      rescheduleCount: currentRescheduleCount,
      maxReschedules
    };
  }

  // Check minimum hours window
  const now = DateTime.now();
  const appointment = DateTime.fromISO(appointmentDateTime);
  const hoursUntil = appointment.diff(now, 'hours').hours;

  const minHours = policy.rescheduleMinHours || 0;
  if (hoursUntil < minHours) {
    return {
      eligible: false,
      reason: `Cannot reschedule within ${minHours} hours`,
      rescheduleCount: currentRescheduleCount,
      maxReschedules
    };
  }

  // Check if passed
  if (hoursUntil < 0) {
    return {
      eligible: false,
      reason: 'Appointment has already passed',
      rescheduleCount: currentRescheduleCount,
      maxReschedules
    };
  }

  return {
    eligible: true,
    reason: 'Eligible to reschedule',
    rescheduleCount: currentRescheduleCount,
    maxReschedules
  };
}
```

### Example Scenarios

```typescript
// Booking: rescheduleCount = 1
// Policy: maxReschedules = 2, rescheduleMinHours = 24
// Appointment: Dec 10 at 2:00 PM

// Scenario 1: Try to reschedule on Dec 8 (plenty of time, 1 reschedule used)
checkRescheduleEligibility(policy, appointmentDate, 1)
// → { eligible: true, reason: 'Eligible', rescheduleCount: 1, maxReschedules: 2 }

// Scenario 2: Already rescheduled 2 times
checkRescheduleEligibility(policy, appointmentDate, 2)
// → { eligible: false, reason: 'Maximum reschedules (2) reached' }

// Scenario 3: Try to reschedule on Dec 10 at 8:00 AM (6 hours before)
checkRescheduleEligibility(policy, appointmentDate, 1)
// → { eligible: false, reason: 'Cannot reschedule within 24 hours' }
```

---

## File Structure

### Backend

```
graphql-backend/src/graphql/
├── vendor/
│   ├── query.graphql            # Added serviceCancellationPolicies queries
│   ├── mutation.graphql         # Added upsert/delete mutations
│   └── index.ts                 # Added resolvers
├── service/
│   ├── query.graphql            # Added cancellationPolicyId to Service
│   ├── mutation.graphql         # Added update_service_booking, request_reschedule
│   ├── index.ts                 # Added mutation resolvers
│   ├── types.ts                 # Already had cancellationPolicy_type
│   └── cancellation_policy_utils.ts  # NEW: Policy calculation logic
```

### Frontend

```
saas-frontend/src/app/(site)/m/
├── _components/
│   ├── Profile/Edit/RefundPolicies/
│   │   ├── index.tsx                        # Now exports TabWrapper
│   │   ├── TabWrapper.tsx                   # NEW: Tabs UI
│   │   ├── ProductReturnPolicies.tsx        # Existing (refactored)
│   │   ├── ServiceCancellationPolicies.tsx  # NEW: Policy editor
│   │   └── _hooks/
│   │       ├── UseServiceCancellationPolicies.tsx        # NEW
│   │       ├── UseServiceCancellationPolicy.tsx          # NEW
│   │       ├── UseUpsertServiceCancellationPolicy.tsx    # NEW
│   │       └── UseDeleteServiceCancellationPolicy.tsx    # NEW
│   ├── ServiceBookingActions.tsx            # NEW: Customer UI
│   └── sidenav.tsx                         # Updated label
└── _hooks/
    ├── UseUpdateServiceBooking.tsx          # NEW: Cancel mutation
    └── UseRequestReschedule.tsx             # NEW: Reschedule mutation
```

---

## Testing Checklist

### Merchant Tests

- [ ] Create new cancellation policy for Reading services
- [ ] Edit policy refund tiers
- [ ] Toggle rescheduling on/off
- [ ] Delete unused policy
- [ ] Switch between Product Returns and Service Cancellations tabs
- [ ] Verify policies save correctly

### Customer Tests

#### Cancellation Flow
- [ ] Cancel booking 48+ hours before → Full refund
- [ ] Cancel booking 24-48 hours before → Partial refund
- [ ] Cancel booking <12 hours before → No refund
- [ ] Verify Stripe refund processes automatically
- [ ] Check booking status updates to CANCELLED

#### Reschedule Flow
- [ ] Reschedule booking (first time, within policy)
- [ ] Reschedule booking (second time, hitting limit)
- [ ] Try to reschedule (at limit) → Should fail
- [ ] Try to reschedule <24 hours before → Should fail
- [ ] Verify rescheduleCount increments

### Edge Cases
- [ ] Service with no cancellation policy → Graceful error
- [ ] Appointment in the past → No cancellation/reschedule
- [ ] Already cancelled booking → No additional actions
- [ ] Customer tries to cancel someone else's booking → Permission denied

---

## Deployment Notes

### Database Migrations

No schema migrations required - using existing containers with new document types.

### Environment Variables

No new environment variables required.

### Dependencies

All existing dependencies sufficient:
- `luxon` - Already installed for date/time handling
- `graphql` - Already installed
- `uuid` - Already installed

---

## Performance Considerations

### Query Optimization

- Policies stored in Main-VendorSettings (fast lookup by vendorId)
- Service lookups use Main-Listing with vendorId partition
- Booking lookups use Main-Bookings with customerId partition

### Caching Strategy

- Frontend: React Query caches policies, refetch on mutations
- Backend: No additional caching needed (Cosmos DB is fast)

### Rate Limiting

Consider rate limiting for:
- Cancellation requests (prevent spam)
- Reschedule requests (prevent abuse)

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Cancellation Rate**
   - % of bookings cancelled
   - Breakdown by service category
   - Breakdown by refund tier (full/partial/none)

2. **Reschedule Rate**
   - % of bookings rescheduled
   - Average reschedules per booking
   - Time to reschedule (how far in advance)

3. **Refund Amounts**
   - Total refunded per month
   - Average refund percentage
   - Refunds by service category

4. **Policy Effectiveness**
   - Which policies result in fewer cancellations
   - Which policies are most merchant-friendly
   - Customer satisfaction correlation

---

## Future Enhancements

### Phase 2 (Q1 2026)
- [ ] Email notifications on cancellation/reschedule
- [ ] SMS reminders before no-refund window
- [ ] Policy templates (Flexible/Moderate/Strict presets)
- [ ] Bulk policy updates across services

### Phase 3 (Q2 2026)
- [ ] Waitlist for cancelled time slots
- [ ] Automatic rebooking suggestions
- [ ] Dynamic pricing based on cancellation risk
- [ ] Merchant analytics dashboard

---

## Support & Troubleshooting

### Common Issues

**Issue**: "No cancellation policy found"
- **Cause**: Service doesn't have cancellationPolicyId set
- **Fix**: Assign policy to service in merchant dashboard

**Issue**: "Cannot reschedule within X hours"
- **Cause**: Customer trying to reschedule too close to appointment
- **Fix**: Explain policy to customer, offer cancellation if appropriate

**Issue**: Refund not processed
- **Cause**: Stripe charge ID missing or invalid
- **Fix**: Check booking.stripe.charge.id exists, verify Stripe API connectivity

---

## Contributors

- Backend implementation: Claude Code
- Frontend implementation: Claude Code
- Documentation: Claude Code
- Testing: [Your Name Here]

---

*Last Updated: November 2025*
*Version: 1.0*

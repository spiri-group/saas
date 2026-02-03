# Test Data Cleanup Strategy

## Overview

Automated tests create real data in the database. This document explains our cleanup strategy to prevent database pollution.

## Current Status

✅ **Backend delete mutations implemented!**

The GraphQL backend now has mutations for:
- `delete_user(userId: ID!): MutationResponse`
- `delete_vendor(vendorId: ID!): MutationResponse`

Automatic cleanup is now **fully functional**.

## Naming Convention

All test entities use the prefix `TEST-{timestamp}`:

```typescript
// Merchant slugs
TEST-1234567890-merchant
TEST-1234567891-signup

// Merchant names
TEST 1234567890 Merchant
TEST 1234567891 My Business
```

This makes test data easy to identify and clean up manually.

## Using Test Email

Tests use **travis.sansome@gmail.com** for OTP authentication.

### Why One Email?

1. **Real OTPs**: We need a real email to receive OTP codes
2. **Simplicity**: One inbox to check during test runs
3. **No Pollution**: User account is reused, not recreated

### Important Notes

- The user account for this email will accumulate test merchants
- **You must manually check the email for OTP codes during test runs**
- Test runs are semi-automated (you provide OTP, test continues)

## Cleanup Process

### Automated Cleanup (NOW AVAILABLE!)

Backend mutations are implemented! Cleanup runs automatically:

```typescript
// Runs after all tests
test.afterAll(async ({ page }) => {
  const auth = await getAuthFromPage(page);
  await cleanupAllTestData(auth);
  console.log(generateCleanupReport());
});
```

This automatically deletes:
- ✅ Test merchants (slug starts with `TEST-`)
- ✅ Test users (when needed)

### Manual Cleanup (Fallback)

If automatic cleanup fails, you can manually delete test data:

**Via GraphQL:**
```graphql
mutation DeleteTestMerchant {
  delete_vendor(vendorId: "xxx") {
    success
    message
  }
}

mutation DeleteTestUser {
  delete_user(userId: "yyy") {
    success
    message
  }
}
```

**Via Azure Cosmos DB:**
```sql
SELECT * FROM c
WHERE c.docType = "VENDOR"
AND STARTSWITH(c.slug, "test-")
```

## Test Entity Tracking

The cleanup system tracks all created entities:

```typescript
import { registerTestMerchant, registerTestUser } from '../utils/test-cleanup';

// When creating test merchant
registerTestMerchant({
  id: merchant.id,
  slug: merchant.slug,
  name: merchant.name,
});

// When creating test user (if creating new ones)
registerTestUser({
  id: user.id,
  email: user.email,
});
```

## Writing Tests with Cleanup

### Good Test Pattern

```typescript
import { TEST_CONFIG, generateTestMerchantSlug } from '../fixtures/test-config';
import { registerTestMerchant } from '../utils/test-cleanup';

test('should create merchant', async ({ page }) => {
  const merchantData = {
    name: generateTestMerchantName('signup'),
    slug: generateTestMerchantSlug('signup'),
    email: TEST_CONFIG.TEST_EMAIL,
    // ... other fields
  };

  await merchantPage.completeMerchantSignup(merchantData);

  // Register for cleanup
  registerTestMerchant({
    id: /* merchant ID from response */,
    slug: merchantData.slug,
    name: merchantData.name,
  });
});
```

### Anti-Patterns to Avoid

❌ **Don't use random emails** (creates orphaned user accounts)
```typescript
const email = `test-${Date.now()}@example.com`; // NO!
```

✅ **Do use the test email**
```typescript
const email = TEST_CONFIG.TEST_EMAIL; // YES!
```

❌ **Don't create merchants without TEST prefix**
```typescript
const slug = 'my-merchant'; // NO! Hard to identify as test data
```

✅ **Do use generateTestMerchantSlug**
```typescript
const slug = generateTestMerchantSlug('description'); // YES!
```

## CI/CD Integration

In CI pipelines:

```yaml
- name: Run E2E Tests
  run: yarn test

- name: Cleanup Test Data
  if: always()  # Run even if tests fail
  run: yarn test:cleanup
```

Add to `package.json`:
```json
{
  "scripts": {
    "test:cleanup": "node scripts/cleanup-test-data.js"
  }
}
```

## Monitoring Test Data

### Query Test Entities

```typescript
import { queryTestEntities, getAuthFromPage } from './utils/test-cleanup';

test('check test data', async ({ page }) => {
  const auth = await getAuthFromPage(page);
  const entities = await queryTestEntities(auth);

  console.log('Test merchants:', entities.merchants.length);
});
```

### Bulk Cleanup Script

When you want to clean up all test data:

```bash
# Future script (when delete mutations exist)
yarn test:cleanup --all
```

## FAQ

**Q: Why not use a test database?**
A: We test against the real integration (Stripe, Azure, etc.). A test database wouldn't catch integration issues.

**Q: Will test merchants appear in production?**
A: No, they're tied to the test user account which isn't a real customer. They're effectively isolated.

**Q: What if I forget to clean up?**
A: The `TEST-` prefix makes them easy to find and bulk delete later. They don't affect real users.

**Q: Can I use my own email for testing?**
A: Yes! Update `TEST_CONFIG.TEST_EMAIL` in `tests/fixtures/test-config.ts`. You'll receive the OTP codes.

**Q: What about failed tests that didn't complete?**
A: Partially created entities will still have the `TEST-` prefix and can be identified in the cleanup report.

## Summary

**Current State:**
- ✅ Naming convention prevents confusion
- ✅ Cleanup report shows what needs deletion
- ⚠️ Manual cleanup required
- ✅ Test email reused (no account pollution)

**Future State (when delete mutations exist):**
- ✅ Automatic cleanup after tests
- ✅ CI/CD cleanup integration
- ✅ Zero manual intervention

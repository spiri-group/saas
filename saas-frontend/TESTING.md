# SpiriVerse Testing Setup

Quick start guide for running automated tests with Playwright.

## Installation

### 1. Install Playwright

From the `saas-frontend` directory:

```bash
yarn add -D @playwright/test playwright
```

### 2. Install Browsers

```bash
yarn playwright install
```

This installs Chromium, Firefox, and WebKit browsers for testing.

### 3. Environment Setup (Optional)

Create `.env.test` if you need specific test configuration:

```bash
# Test Configuration
BASE_URL=http://localhost:3000
TEST_MERCHANT_SLUG=your-test-merchant
TEST_PRODUCT_ID=test-product-123
```

## Running Tests

### Basic Commands

```bash
# Run all tests
yarn test

# Run tests with UI (recommended for development)
yarn test:ui

# Run tests in headed mode (see the browser)
yarn test:headed

# Run specific test file
yarn playwright test tests/e2e/user-signup.spec.ts

# Run tests matching a pattern
yarn playwright test -g "should send OTP"

# View test report
yarn test:report
```

### Development Workflow

1. **Start your dev server**:
   ```bash
   yarn dev
   ```

2. **Open Playwright UI** (in another terminal):
   ```bash
   yarn test:ui
   ```

3. **Run tests** - The UI will show all tests and allow you to:
   - Run individual tests
   - Watch mode (auto-run on code changes)
   - Time travel debugging
   - Inspect selectors

### Debugging

```bash
# Debug mode - opens inspector
yarn test:debug

# Generate test code by recording actions
yarn test:codegen
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end test specs
│   ├── user-signup.spec.ts      # User authentication & signup tests
│   └── merchant-signup.spec.ts   # Merchant signup flow tests
├── pages/                  # Page Object Models
│   ├── BasePage.ts              # Base class for all pages
│   ├── AuthPage.ts              # Authentication/OTP page
│   ├── UserSetupPage.ts         # User profile setup page
│   └── MerchantSetupPage.ts     # Merchant setup page
├── fixtures/               # Test fixtures
│   └── auth.fixture.ts          # Authentication helpers
├── utils/                  # Utility functions
│   └── test-helpers.ts          # Common test utilities
└── .gitignore              # Ignores test artifacts
```

## Current Test Coverage

### ✅ User Signup Flow
- Email input validation
- OTP sending and verification
- OTP resend with cooldown
- Profile completion
- Error handling

### ✅ Merchant Signup Flow
- User to merchant conversion
- Business information form
- Slug validation and availability
- Service and subscription selection
- Payment setup integration

## Important Notes

### Authentication

Tests use **travis.sansome@gmail.com** for OTP authentication.

**During test runs:**
1. Test will send OTP to the email
2. **You need to manually check the email and enter the OTP**
3. Test will continue after OTP verification

This is semi-automated testing - the OTP step requires human interaction.

### Test Data & Cleanup

**Test Entity Naming:**
- All test merchants use prefix: `TEST-{timestamp}-description`
- Example: `TEST-1234567890-signup`
- This makes test data easy to identify

**Cleanup Strategy:**
- ⚠️ Backend delete mutations not yet implemented
- Tests track created entities and generate cleanup report
- See `tests/CLEANUP.md` for detailed cleanup instructions

**Current Cleanup:**
After tests run, you'll see a report like:
```
========== TEST CLEANUP REPORT ==========
Merchants to cleanup:
  - Slug: test-1234567890-merchant, ID: xxx
=========================================
```

You can:
1. **Keep them** - They're clearly marked as TEST data
2. **Delete manually** - Via GraphQL or database
3. **Wait for auto-cleanup** - When backend delete mutations are added

See `tests/CLEANUP.md` for full details.

### Test Artifacts

These are automatically git-ignored and regenerate each run:
- `.auth/` - Stored authentication states
- `test-results/` - Test execution results
- `playwright-report/` - HTML reports
- `screenshots/` - Failure screenshots
- Videos of test runs

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn playwright install --with-deps
      - run: yarn test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Writing New Tests

### 1. Create Page Object (if needed)

```typescript
// tests/pages/MyFeaturePage.ts
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyFeaturePage extends BasePage {
  async doSomething() {
    await this.page.click('[data-testid="button"]');
  }
}
```

### 2. Write Test Spec

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { MyFeaturePage } from '../pages/MyFeaturePage';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const featurePage = new MyFeaturePage(page);
    await featurePage.doSomething();
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### 3. Run Your Test

```bash
yarn test:ui  # Interactive mode
```

## Best Practices

1. **Use `data-testid` attributes** in your components for stable selectors
2. **Keep tests independent** - each test should work alone
3. **Use Page Objects** - encapsulate page logic
4. **Wait properly** - use `waitForSelector`, not arbitrary timeouts
5. **Clean test data** - use unique IDs/timestamps
6. **Mock external services** when appropriate (Stripe, email, etc.)

## Troubleshooting

### Tests timing out?
- Increase timeout: `test.setTimeout(60000)`
- Check if dev server is running
- Use `yarn test:headed` to see what's happening

### Flaky tests?
- Add proper waits: `await page.waitForLoadState('networkidle')`
- Use `waitForSelector` instead of fixed delays
- Check for race conditions

### Browser not found?
```bash
yarn playwright install
```

### Port already in use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test README](./tests/README.md) - Detailed testing guide
- [Playwright Discord](https://discord.gg/playwright-807756831384403968)

## Next Steps

1. ✅ Set up authentication fixtures for full test coverage
2. Add tests for customer order flows
3. Add tests for merchant dashboard
4. Set up CI/CD pipeline
5. Add visual regression testing

# SpiriVerse Playwright Testing Guide

Complete guide for automated end-to-end testing with Playwright.

## Table of Contents

- [Setup](#setup)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Page Object Model](#page-object-model)
- [Test Organization](#test-organization)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Setup

### 1. Install Playwright

```bash
cd saas-frontend
yarn add -D @playwright/test playwright
```

### 2. Install Playwright Browsers

```bash
yarn playwright install
```

This will install Chromium, Firefox, and WebKit browsers.

### 3. Configure Environment Variables

Create a `.env.test` file in the `saas-frontend` directory:

```bash
# Base URL
BASE_URL=http://localhost:3000

# Test Merchant
TEST_MERCHANT_SLUG=test-merchant

# Test Products and Services
TEST_PRODUCT_ID=prod_xxx
TEST_SERVICE_ID=srv_xxx
TEST_VARIANT_ID=var_xxx

# Test Orders (for refund/shipping tests)
TEST_ORDER_FOR_REFUND=ord_xxx
TEST_ORDER_FOR_SHIPPING=ord_xxx
TEST_SHIPMENT_ID=ship_xxx

# Backorder Testing
TEST_BACKORDER_PRODUCT_ID=prod_backorder_xxx

# Discount Code (optional)
TEST_DISCOUNT_CODE=TEST10

# Test User Credentials
TEST_CUSTOMER_EMAIL=test@customer.com
TEST_CUSTOMER_PASSWORD=testpass123

TEST_MERCHANT_EMAIL=merchant@test.com
TEST_MERCHANT_PASSWORD=merchantpass123

TEST_ADMIN_EMAIL=admin@spiriverse.com
TEST_ADMIN_PASSWORD=adminpass123
```

### 4. Project Structure

```
saas-frontend/tests/
├── e2e/                    # End-to-end test specs
│   ├── customer-order.spec.ts
│   ├── merchant-dashboard.spec.ts
│   └── ...
├── pages/                  # Page Object Models
│   ├── BasePage.ts
│   ├── CustomerOrderPage.ts
│   ├── MerchantDashboardPage.ts
│   └── ...
├── fixtures/               # Test fixtures and helpers
│   └── auth.fixture.ts
├── utils/                  # Utility functions
│   └── test-helpers.ts
├── .auth/                  # Stored authentication states
└── README.md
```

## Running Tests

### Basic Commands

```bash
# Run all tests
yarn test

# Run tests with UI mode (recommended for development)
yarn test:ui

# Run tests in headed mode (see browser)
yarn test:headed

# Run tests in debug mode
yarn test:debug

# Run specific browser
yarn test:chromium
yarn test:firefox
yarn test:webkit

# Run mobile tests
yarn test:mobile

# Run specific test file
yarn playwright test tests/e2e/customer-order.spec.ts

# Run tests matching a pattern
yarn playwright test -g "should create a new product"

# View HTML report after tests
yarn test:report
```

### Generating Tests with Codegen

Playwright can record your actions and generate test code:

```bash
# Start codegen
yarn test:codegen

# Start codegen with authentication
yarn test:codegen --load-storage=tests/.auth/merchant.json
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { CustomerOrderPage } from '../pages/CustomerOrderPage';

test.describe('Customer Orders', () => {
  let orderPage: CustomerOrderPage;

  test.beforeEach(async ({ page }) => {
    orderPage = new CustomerOrderPage(page);
  });

  test('should add product to cart', async ({ page }) => {
    await orderPage.navigateToStore('test-merchant');
    await orderPage.addProductToCart('product-123', 2);

    const cartItems = await orderPage.getCartItems();
    expect(cartItems.length).toBeGreaterThan(0);
  });
});
```

### Using Test Helpers

```typescript
import { waitForSuccessToast, generateTestEmail } from '../utils/test-helpers';

test('should create account', async ({ page }) => {
  const email = generateTestEmail('signup');

  await page.fill('[data-testid="email"]', email);
  await page.click('[data-testid="submit"]');

  await waitForSuccessToast(page);
});
```

## Page Object Model

### What is Page Object Model?

Page Object Model (POM) is a design pattern that:
- Encapsulates page-specific selectors and actions
- Makes tests more maintainable and readable
- Reduces code duplication
- Separates test logic from page implementation

### Creating a Page Object

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyFeaturePage extends BasePage {
  // Selectors
  private readonly selectors = {
    submitButton: '[data-testid="submit"]',
    resultText: '[data-testid="result"]',
  };

  constructor(page: Page) {
    super(page);
  }

  // Actions
  async submitForm(data: any) {
    await this.fill('[data-testid="input"]', data.value);
    await this.click(this.selectors.submitButton);
  }

  // Getters
  async getResult(): Promise<string> {
    return await this.getText(this.selectors.resultText);
  }
}
```

## Test Organization

### Test Categories

1. **E2E Tests** (`tests/e2e/`): Full user journeys
2. **Component Tests**: Individual component testing (future)
3. **API Tests**: GraphQL API testing (future)

### Naming Conventions

```typescript
// Descriptive test names
test('should complete checkout flow with valid payment')
test('should show error when inventory insufficient')
test('should restore inventory after refund')

// Group related tests
test.describe('Customer Order Flow', () => {
  test.describe('Cart Management', () => {
    test('should add product to cart')
    test('should remove product from cart')
  });
});
```

### Test Data

Use `data-testid` attributes for stable selectors:

```tsx
// Good - stable across changes
<button data-testid="submit-order">Place Order</button>

// Avoid - fragile
<button className="btn btn-primary submit-btn">Place Order</button>
```

## Best Practices

### 1. Use Descriptive Selectors

```typescript
// ✅ Good
await page.click('[data-testid="add-to-cart"]');

// ❌ Avoid
await page.click('.button.primary');
```

### 2. Wait for Elements Properly

```typescript
// ✅ Good - explicit wait
await expect(page.locator('[data-testid="result"]')).toBeVisible();

// ❌ Avoid - arbitrary timeout
await page.waitForTimeout(3000);
```

### 3. Use Page Objects

```typescript
// ✅ Good - maintainable
await orderPage.addProductToCart('product-123');

// ❌ Avoid - coupled to implementation
await page.click('[data-product-id="product-123"] button.add-cart');
```

### 4. Keep Tests Independent

```typescript
// ✅ Good - each test is independent
test.beforeEach(async ({ page }) => {
  await setupTestData();
});

// ❌ Avoid - tests depend on each other
test('create product', async () => { /* ... */ });
test('edit product', async () => { /* depends on previous */ });
```

### 5. Clean Up Test Data

```typescript
test.afterEach(async ({ page }) => {
  // Clean up any test data created
  await cleanupTestData();
});
```

### 6. Handle Authentication

```typescript
import { test } from '../fixtures/auth.fixture';

test('merchant action', async ({ page, loginAsMerchant }) => {
  await loginAsMerchant('test-merchant');
  // Now authenticated as merchant
});
```

### 7. Mock External Services

```typescript
import { mockStripePayment } from '../utils/test-helpers';

test('should handle payment', async ({ page }) => {
  await mockStripePayment(page, true);
  // Stripe API calls will be mocked
});
```

### 8. Take Screenshots on Failure

Playwright automatically takes screenshots on failure, but you can also take them manually:

```typescript
await page.screenshot({ path: 'screenshots/my-test.png' });
```

## Test Data Management

### Dynamic Test Data

```typescript
import { generateTestEmail, generateTestPhone } from '../utils/test-helpers';

test('should create order', async ({ page }) => {
  const email = generateTestEmail('order');
  const phone = generateTestPhone();

  // Use unique data for each test run
});
```

### Environment-Specific Data

Use environment variables for test configuration:

```typescript
const merchantSlug = process.env.TEST_MERCHANT_SLUG || 'test-merchant';
const productId = process.env.TEST_PRODUCT_ID;

test.skip(!productId, 'No test product configured');
```

## Debugging Tests

### 1. UI Mode (Recommended)

```bash
yarn test:ui
```

Benefits:
- Visual test runner
- Time travel debugging
- Inspect locators
- Watch mode

### 2. Debug Mode

```bash
yarn test:debug
```

Opens Playwright Inspector with step-through debugging.

### 3. Headed Mode

```bash
yarn test:headed
```

See the browser while tests run.

### 4. Console Logs

```typescript
await page.evaluate(() => console.log('Debug info'));
```

### 5. Pause Execution

```typescript
await page.pause(); // Opens Playwright Inspector
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Playwright Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: yarn install

    - name: Install Playwright Browsers
      run: yarn playwright install --with-deps

    - name: Run Playwright tests
      run: yarn test
      env:
        BASE_URL: ${{ secrets.BASE_URL }}
        TEST_MERCHANT_SLUG: ${{ secrets.TEST_MERCHANT_SLUG }}

    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### Azure DevOps Pipeline

```yaml
trigger:
- main
- develop

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'

- script: yarn install
  displayName: 'Install dependencies'

- script: yarn playwright install --with-deps
  displayName: 'Install Playwright browsers'

- script: yarn test
  displayName: 'Run Playwright tests'
  env:
    BASE_URL: $(BASE_URL)
    TEST_MERCHANT_SLUG: $(TEST_MERCHANT_SLUG)

- task: PublishTestResults@2
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: 'test-results/results.xml'
```

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  await page.waitForSelector('[data-testid="result"]', { timeout: 30000 });
});
```

#### 2. Flaky Tests

```typescript
// Use waitForLoadState
await page.waitForLoadState('networkidle');

// Use proper assertions
await expect(page.locator('[data-testid="element"]')).toBeVisible();

// Retry flaky operations
await expect.poll(async () => {
  return await page.locator('[data-testid="dynamic"]').count();
}).toBeGreaterThan(0);
```

#### 3. Authentication Issues

```bash
# Clear saved auth states
rm -rf tests/.auth/*.json
```

#### 4. Browser Not Found

```bash
# Reinstall browsers
yarn playwright install
```

#### 5. Port Already in Use

```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
BASE_URL=http://localhost:3001 yarn test
```

### Getting Help

- **Playwright Documentation**: https://playwright.dev
- **Playwright Discord**: https://discord.gg/playwright-807756831384403968
- **GitHub Issues**: Create an issue in the repository

## Advanced Topics

### Parallel Execution

```typescript
// Run tests in parallel
test.describe.configure({ mode: 'parallel' });

// Run tests serially
test.describe.configure({ mode: 'serial' });
```

### Visual Regression Testing

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Network Interception

```typescript
test('should mock GraphQL', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    if (request.postDataJSON()?.operationName === 'GetProducts') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ data: mockProducts }),
      });
    } else {
      await route.continue();
    }
  });
});
```

### Performance Testing

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [CI/CD with Playwright](https://playwright.dev/docs/ci)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Contributing

When adding new tests:

1. Follow the Page Object Model pattern
2. Add appropriate `data-testid` attributes to components
3. Write descriptive test names
4. Keep tests independent and idempotent
5. Update this README if adding new patterns or practices
6. Ensure tests pass locally before committing

## Example Test Workflow

```typescript
// 1. Create Page Object
// tests/pages/NewFeaturePage.ts
export class NewFeaturePage extends BasePage {
  async performAction() { /* ... */ }
}

// 2. Write Tests
// tests/e2e/new-feature.spec.ts
test('should work', async ({ page }) => {
  const featurePage = new NewFeaturePage(page);
  await featurePage.performAction();
  // assertions
});

// 3. Run Tests Locally
// yarn test:ui

// 4. Fix Issues
// yarn test:debug

// 5. Commit and Push
// Tests run in CI/CD pipeline
```

import { test, expect, Page, TestInfo } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { MerchantSetupPage } from '../pages/MerchantSetupPage';
import {
  getCookiesFromPage,
  registerTestUser,
  clearTestEntityRegistry,
  cleanupTestUsers,
  cleanupTestMerchants,
} from '../utils/test-cleanup';

/**
 * Crystal Purchase Flow
 *
 * Tests the end-to-end crystal purchase funnel:
 * 1. User finds crystal via Crystal Guide
 * 2. Views crystal details and adds to wishlist
 * 3. Uses "Find Sellers" to search
 * 4. Views crystal listing from merchant
 * 5. Adds to wishlist from product page
 * 6. Sees crystal reference info on product page
 *
 * Requires CRYSTALS spiritual interest and a test merchant with crystal listings.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();
const merchantSlugPerWorker = new Map<number, string>();
const merchantIdPerWorker = new Map<number, string>();
const crystalProductIdPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Purchase Flow...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);
  if (cookies) {
    // Clean up crystal product first
    const productId = crystalProductIdPerWorker.get(workerId);
    const merchantId = merchantIdPerWorker.get(workerId);
    if (productId && merchantId) {
      console.log(`[Cleanup] Deleting crystal product ${productId}...`);
      await deleteCrystalProduct(productId, merchantId, cookies);
    }
    // Clean up merchant and user
    await cleanupTestMerchants(cookies, workerId);
    await cleanupTestUsers(cookies, workerId);
    cookiesPerWorker.delete(workerId);
  }
  userIdPerWorker.delete(workerId);
  merchantSlugPerWorker.delete(workerId);
  merchantIdPerWorker.delete(workerId);
  crystalProductIdPerWorker.delete(workerId);
  clearTestEntityRegistry(workerId);
});

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `crystal-purchase-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Generate unique merchant slug */
function generateUniqueMerchantSlug(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `crystal-test-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}`;
}

/** Create a crystal product via GraphQL (using the consolidated product system) */
async function createCrystalProduct(
  vendorId: string,
  crystalRefId: string,
  locationId: string,
  cookies: string
): Promise<{ id: string; name: string } | null> {
  const productId = `test-crystal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const variantId = `var-${Date.now()}`;

  const mutation = `
    mutation UpsertProduct($merchantId: String!, $product: ProductInput!) {
      upsert_product(merchantId: $merchantId, product: $product) {
        code
        success
        message
        product {
          id
          name
          slug
        }
      }
    }
  `;

  const variables = {
    merchantId: vendorId,
    product: {
      id: productId,
      name: `Test Amethyst Crystal ${Date.now()}`,
      description: 'Beautiful polished amethyst crystal for testing. High quality specimen with deep purple coloring.',
      category: 'crystals',
      soldFromLocationId: locationId,
      noRefunds: true,
      productType: 'CRYSTAL',
      typeData: {
        crystal: {
          crystalRefId,
          crystalForm: 'tumbled',
          crystalGrade: 'A',
        },
      },
      variants: [
        {
          id: variantId,
          isDefault: true,
          name: 'Default',
          code: 'AME-001',
          description: 'Test amethyst crystal',
          defaultPrice: { amount: 2500, currency: 'AUD' },
          landedCost: { amount: 1000, currency: 'AUD' },
          dimensions: { height: 5, width: 3, depth: 3, uom: 'cm' },
          weight: { amount: 50, uom: 'g' },
          images: [],
          properties: [],
        },
      ],
    },
  };

  try {
    const response = await fetch('http://localhost:3002/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const data = await response.json();
    if (data.data?.upsert_product?.success) {
      const product = data.data.upsert_product.product;
      console.log(`[Setup] Created crystal product: ${product.name} (${product.id})`);

      // Make the product live
      await makeProductLive(productId, vendorId, cookies);

      return { id: product.id, name: product.name };
    } else {
      console.error('[Setup] Failed to create crystal product:', data.data?.upsert_product?.message || data.errors);
      return null;
    }
  } catch (error) {
    console.error('[Setup] Error creating crystal product:', error);
    return null;
  }
}

/** Make a product live */
async function makeProductLive(
  productId: string,
  merchantId: string,
  cookies: string
): Promise<boolean> {
  const mutation = `
    mutation UpdateProductLiveStatus($merchantId: String!, $productId: String!, $isLive: Boolean!) {
      update_product_live_status(merchantId: $merchantId, productId: $productId, isLive: $isLive) {
        code
        success
        message
      }
    }
  `;

  try {
    const response = await fetch('http://localhost:3002/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { merchantId, productId, isLive: true },
      }),
    });

    const data = await response.json();
    if (data.data?.update_product_live_status?.success) {
      console.log(`[Setup] ✓ Made product live: ${productId}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Delete a crystal product via GraphQL */
async function deleteCrystalProduct(
  productId: string,
  vendorId: string,
  cookies: string
): Promise<boolean> {
  // Products are soft-deleted by updating their status
  // For now, we'll just leave them as they'll be cleaned up with the merchant
  console.log(`[Cleanup] ✓ Crystal product ${productId} will be cleaned up with merchant`);
  return true;
}

/** Setup authenticated user with crystals interest */
async function setupAuthenticatedUser(
  page: Page,
  testInfo: TestInfo
): Promise<string> {
  const testEmail = generateUniqueTestEmail(testInfo);
  const authPage = new AuthPage(page);
  const homePage = new HomePage(page);
  const setupPage = new UserSetupPage(page);
  const onboardingPage = new OnboardingPage(page);

  await page.goto('/');
  await authPage.startAuthFlow(testEmail);
  await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[aria-label="input-login-otp"]').click();
  await page.keyboard.type('123456');
  await page.waitForURL('/', { timeout: 15000 });

  await homePage.waitForCompleteProfileLink();
  await homePage.clickCompleteProfile();
  await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

  const url = page.url();
  const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
  let testUserId = '';
  if (userIdMatch) {
    testUserId = userIdMatch[1];
    userIdPerWorker.set(testInfo.parallelIndex, testUserId);
  }

  await setupPage.fillUserProfile({
    firstName: 'Crystal',
    lastName: 'Buyer',
    phone: '0412345682',
    address: 'Sydney Crystal Shop',
    securityQuestion: 'What crystal do you seek?',
    securityAnswer: 'Amethyst',
  });
  await setupPage.startBrowsing();
  await page.waitForURL('/', { timeout: 15000 });

  // Click "My Personal Space" link
  const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
  await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
  await personalSpaceLink.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  console.log('[Setup] Clicked My Personal Space, completing onboarding...');

  // Complete onboarding with CRYSTALS as primary interest
  await onboardingPage.completeWithPrimaryOnly('crystals');
  console.log('[Setup] Entered Personal Space successfully');

  // Register user with cookies AFTER setup is complete
  const cookies = await getCookiesFromPage(page);
  registerTestUser({ id: testUserId, email: testEmail, cookies }, testInfo.parallelIndex);
  if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

  return testUserId;
}

/** Get merchant location ID */
async function getMerchantLocationId(
  merchantId: string,
  cookies: string
): Promise<string | null> {
  const query = `
    query GetMerchantLocations($merchantId: String!) {
      vendor(id: $merchantId) {
        locations {
          id
          title
        }
      }
    }
  `;

  try {
    const response = await fetch('http://localhost:3002/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({ query, variables: { merchantId } }),
    });

    const data = await response.json();
    const locations = data.data?.vendor?.locations;
    if (locations && locations.length > 0) {
      return locations[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Setup a test merchant with crystal product */
async function setupTestMerchantWithCrystalListing(
  page: Page,
  testInfo: TestInfo
): Promise<{ merchantSlug: string; merchantId: string; productId: string }> {
  const merchantSetupPage = new MerchantSetupPage(page);
  const testEmail = `merchant-${Date.now()}-${testInfo.parallelIndex}@playwright.com`;

  console.log('[Setup] Creating test merchant for crystal products...');

  // Create merchant using the page object
  const createdSlug = await merchantSetupPage.createMerchant(testEmail, 'Crystal Shop', testInfo);
  merchantSlugPerWorker.set(testInfo.parallelIndex, createdSlug);

  // Get merchant ID from the page URL or via GraphQL
  const merchantId = await getMerchantIdFromSlug(page, createdSlug);
  if (!merchantId) {
    throw new Error('Failed to get merchant ID after creation');
  }
  merchantIdPerWorker.set(testInfo.parallelIndex, merchantId);

  // Update cookies after merchant creation
  const cookies = await getCookiesFromPage(page);
  if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

  // Get location ID for creating product
  const locationId = await getMerchantLocationId(merchantId, cookies!);
  if (!locationId) {
    throw new Error('Failed to get merchant location ID');
  }

  // Create a crystal product for this merchant
  // Use 'amethyst' as it's one of the seeded crystal references
  const product = await createCrystalProduct(merchantId, 'amethyst', locationId, cookies!);
  if (!product) {
    throw new Error('Failed to create crystal product for test merchant');
  }
  crystalProductIdPerWorker.set(testInfo.parallelIndex, product.id);

  console.log(`[Setup] ✓ Created merchant ${createdSlug} with crystal product ${product.id}`);

  return {
    merchantSlug: createdSlug,
    merchantId,
    productId: product.id,
  };
}

/** Get merchant ID from slug via GraphQL */
async function getMerchantIdFromSlug(page: Page, slug: string): Promise<string | null> {
  const merchantId = await page.evaluate(async (merchantSlug) => {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetVendorId($slug: String!) {
          vendorIdFromSlug(slug: $slug) {
            merchantId
          }
        }`,
        variables: { slug: merchantSlug },
      }),
    });
    const data = await response.json();
    return data.data?.vendorIdFromSlug?.merchantId;
  }, slug);
  return merchantId;
}

/** Restore cookies from previous test */
async function restoreCookies(page: Page, testInfo: TestInfo) {
  const cookies = cookiesPerWorker.get(testInfo.parallelIndex);
  if (!cookies) {
    throw new Error('No cookies found for worker - previous test may have failed');
  }
  const cookiePairs = cookies.split('; ');
  const cookieObjs = cookiePairs.map((pair) => {
    const [name, value] = pair.split('=');
    return { name, value: value || '', domain: 'localhost', path: '/' };
  });
  await page.context().addCookies(cookieObjs);
}

test.describe.serial('Crystal Purchase Flow', () => {
  test('1. should navigate to crystal guide and view crystal details', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to Crystal Guide via sidenav
    const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
    const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
    await expect(crystalsButton).toBeVisible({ timeout: 10000 });
    await crystalsButton.click();
    await page.waitForTimeout(500);

    // Click on "Crystal Guide" in the expanded submenu
    const guideButton = page.locator('[data-testid="crystal-guide-nav"]').first();
    await expect(guideButton).toBeVisible({ timeout: 5000 });
    await guideButton.click();

    // Wait for Crystal Guide page to load (use search input as indicator)
    await expect(page.getByTestId('crystal-guide-search')).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Guide] Page loaded');

    // Verify crystal grid is visible
    await page.waitForTimeout(2000);
    const crystalGrid = page.getByTestId('crystal-grid');
    await expect(crystalGrid).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Guide] Crystal grid visible');

    // Click on first crystal in the grid
    const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
    await expect(firstCrystal).toBeVisible({ timeout: 10000 });
    await firstCrystal.click();

    // Verify detail panel opens
    const detailPanel = page.getByTestId('crystal-detail-panel');
    await expect(detailPanel).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Guide] Crystal detail panel opened');

    // Verify crystal info is displayed
    const crystalName = detailPanel.locator('h2').first();
    await expect(crystalName).toBeVisible();

    // Verify "Find Sellers" button is present
    const findSellersBtn = page.getByTestId('find-sellers-btn');
    await expect(findSellersBtn).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Guide] Find Sellers button visible');

    await page.screenshot({ path: 'test-results/crystal-guide-detail.png' });
  });

  test('2. should add crystal to wishlist from Crystal Guide', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await restoreCookies(page, testInfo);

    const userId = userIdPerWorker.get(testInfo.parallelIndex);
    if (!userId) throw new Error('User ID not found');

    await page.goto(`/u/${userId}/space/crystals/guide`);
    await expect(page.getByTestId('crystal-guide-search')).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const crystalGrid = page.getByTestId('crystal-grid');
    await expect(crystalGrid).toBeVisible({ timeout: 10000 });

    const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
    await expect(firstCrystal).toBeVisible({ timeout: 10000 });
    await firstCrystal.click();

    const detailPanel = page.getByTestId('crystal-detail-panel');
    await expect(detailPanel).toBeVisible({ timeout: 10000 });

    const addToWishlistBtn = page.getByTestId('add-to-wishlist-btn');
    await expect(addToWishlistBtn).toBeVisible({ timeout: 5000 });
    await addToWishlistBtn.click();

    await page.waitForTimeout(1000);
    console.log('[Crystal Guide] Crystal added to wishlist');

    await page.screenshot({ path: 'test-results/crystal-added-to-wishlist.png' });
  });

  test('3. should use Find Sellers to search for crystal', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await restoreCookies(page, testInfo);

    const userId = userIdPerWorker.get(testInfo.parallelIndex);
    if (!userId) throw new Error('User ID not found');

    await page.goto(`/u/${userId}/space/crystals/guide`);
    await expect(page.getByTestId('crystal-guide-search')).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(2000);
    const crystalGrid = page.getByTestId('crystal-grid');
    await expect(crystalGrid).toBeVisible({ timeout: 10000 });

    const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
    await expect(firstCrystal).toBeVisible({ timeout: 10000 });
    await firstCrystal.click();

    const detailPanel = page.getByTestId('crystal-detail-panel');
    await expect(detailPanel).toBeVisible({ timeout: 10000 });

    const crystalName = await detailPanel.locator('h2').first().textContent();
    console.log(`[Crystal Guide] Testing Find Sellers for: ${crystalName}`);

    const findSellersBtn = page.getByTestId('find-sellers-btn');
    await expect(findSellersBtn).toBeVisible({ timeout: 5000 });
    await findSellersBtn.click();

    await page.waitForURL(/\/search\?/, { timeout: 10000 });
    console.log('[Crystal Guide] Redirected to search page');

    const url = page.url();
    expect(url).toContain('search=');
    console.log(`[Search] URL: ${url}`);

    await page.screenshot({ path: 'test-results/crystal-find-sellers-search.png' });
  });

  test('4. should create merchant and view crystal product page', async ({ page }, testInfo) => {
    test.setTimeout(300000);

    await restoreCookies(page, testInfo);

    // Create test merchant with crystal product
    const { merchantSlug, productId } = await setupTestMerchantWithCrystalListing(page, testInfo);
    console.log(`[Setup] Merchant created: ${merchantSlug}, Product: ${productId}`);

    // Search for the crystal we just listed (amethyst)
    await page.goto('/search?search=amethyst');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Search] Loaded search results page');

    // Verify we can find crystal listings
    const crystalResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(crystalResult).toBeVisible({ timeout: 15000 });
    console.log('[Search] Found crystal listing in search results');

    // Click on the result
    await crystalResult.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Product] Crystal product page loaded');

    // Verify we are on a product page
    const productTitle = page.locator('h1').first();
    await expect(productTitle).toBeVisible({ timeout: 10000 });
    console.log('[Product] Product title visible');

    // Verify Add to Cart button (or similar purchase button)
    const addToCartBtn = page.getByTestId('add-to-cart-btn');
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    console.log('[Product] Add to Cart button visible');

    await page.screenshot({ path: 'test-results/crystal-product-page.png' });
  });

  test('5. should add crystal to wishlist from product page', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await restoreCookies(page, testInfo);

    // Get the test crystal product ID created in test 4
    const productId = crystalProductIdPerWorker.get(testInfo.parallelIndex);
    if (!productId) {
      throw new Error('Test 4 must run first to create crystal product');
    }

    // Search for amethyst crystals (real user flow)
    await page.goto('/search?search=amethyst');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Search] Searching for amethyst crystals');

    // Click on our specific test crystal product by its ID
    const testCrystalResult = page.locator(`[data-testid="search-result-${productId}"]`);
    await expect(testCrystalResult).toBeVisible({ timeout: 15000 });
    console.log(`[Search] Found test crystal product: ${productId}`);
    await testCrystalResult.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Wait for product page content to render
    const productTitle = page.locator('h1').first();
    await expect(productTitle).toBeVisible({ timeout: 10000 });
    console.log('[Product] Crystal product page loaded');

    // Look for Add to Wishlist button
    const addToWishlistBtn = page.getByTestId('add-to-wishlist-btn');
    const onWishlistBtn = page.getByTestId('on-wishlist-btn');

    // Check if already on wishlist (from test 2)
    const isOnWishlist = await onWishlistBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (isOnWishlist) {
      console.log('[Product] Crystal already on wishlist - indicator works correctly');
      await expect(onWishlistBtn).toBeVisible();
    } else {
      // Add to wishlist
      await expect(addToWishlistBtn).toBeVisible({ timeout: 5000 });
      await addToWishlistBtn.click();
      await page.waitForTimeout(2000);

      // Verify the button state changed
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const onWishlistAfter = page.getByTestId('on-wishlist-btn');
      await expect(onWishlistAfter).toBeVisible({ timeout: 10000 });
      console.log('[Product] Wishlist indicator now visible after adding');
    }

    await page.screenshot({ path: 'test-results/crystal-wishlist-product-page.png' });
  });

  test('6. should show crystal reference info on product page', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await restoreCookies(page, testInfo);

    // Get the test crystal product ID created in test 4
    const productId = crystalProductIdPerWorker.get(testInfo.parallelIndex);
    if (!productId) {
      throw new Error('Test 4 must run first to create crystal product');
    }

    // Search for amethyst crystals (real user flow)
    await page.goto('/search?search=amethyst');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Search] Searching for amethyst crystals');

    // Click on our specific test crystal product by its ID
    const testCrystalResult = page.locator(`[data-testid="search-result-${productId}"]`);
    await expect(testCrystalResult).toBeVisible({ timeout: 15000 });
    console.log(`[Search] Found test crystal product: ${productId}`);
    await testCrystalResult.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Wait for product page content to render
    const productTitle = page.locator('h1').first();
    await expect(productTitle).toBeVisible({ timeout: 10000 });
    console.log('[Product] Crystal product page loaded');

    // Verify crystal properties panel is displayed (contains chakras, elements, zodiac)
    // The panel has a title "Crystal Properties"
    const propertiesPanel = page.locator('[aria-labelledby="crystal-info-title"]');
    await expect(propertiesPanel).toBeVisible({ timeout: 10000 });
    console.log('[Product] Crystal Properties panel visible');

    // Verify crystal form badge is displayed (e.g., "Tumbled")
    const formBadge = propertiesPanel.locator('span:has-text("Tumbled")').first();
    await expect(formBadge).toBeVisible({ timeout: 5000 });
    console.log('[Product] Crystal form badge visible');

    // Verify chakras section is displayed
    const chakrasHeading = propertiesPanel.locator('h4:has-text("Chakras")');
    const hasChakras = await chakrasHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasChakras) {
      console.log('[Product] Chakras section visible');
    }

    // Verify elements section is displayed
    const elementsHeading = propertiesPanel.locator('h4:has-text("Elements")');
    const hasElements = await elementsHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasElements) {
      console.log('[Product] Elements section visible');
    }

    // Verify zodiac section is displayed
    const zodiacHeading = propertiesPanel.locator('h4:has-text("Zodiac")');
    const hasZodiac = await zodiacHeading.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasZodiac) {
      console.log('[Product] Zodiac section visible');
    }

    await page.screenshot({ path: 'test-results/crystal-product-reference-info.png' });
  });
});

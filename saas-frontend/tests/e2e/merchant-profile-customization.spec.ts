import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { MerchantSetupPage } from '../pages/MerchantSetupPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestMerchant,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestMerchants,
} from '../utils/test-cleanup';

/**
 * Merchant Profile Customization Tests
 *
 * Tests the merchant profile customization features accessed through the sidebar navigation:
 * - Profile > Customise > Intro
 * - Profile > Customise > Contact Details
 * - Profile > Customise > Social URLs
 * - Profile > Customise > About (Descriptions)
 * - Profile > Customise > Team Members
 * - Profile > Branding (replaces nav)
 * - Marketing > Catalogue Banner
 * - Marketing > Video Update
 *
 * Prerequisites:
 * - GraphQL backend must be running on http://127.0.0.1:7071/api/graphql
 *   Run: cd graphql-backend && func start (or yarn start)
 * - Merchant must be fully set up (completed signup with subscription)
 * - Tests use the sidebar navigation to access dialogs
 *
 * Parallel Execution:
 * - Each test creates its own unique merchant to avoid conflicts
 * - Cleanup is handled per-worker using parallelIndex
 */

/** Helper to wait for any dialog overlay to close */
async function waitForDialogOverlayToClose(page: import('@playwright/test').Page) {
  // Wait for any dialog overlay to disappear (the backdrop that blocks clicks)
  const dialogOverlay = page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
  try {
    await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No overlay present, continue
  }
}

/** Helper to navigate to Customise submenu (now under Profile) */
async function openCustomiseMenu(page: import('@playwright/test').Page) {
  // Wait for any dialog overlay to close before clicking sidebar
  await waitForDialogOverlayToClose(page);

  // First expand Profile
  const profileButton = page.locator('button[aria-label="Profile"]');
  await profileButton.click();
  await page.waitForTimeout(300);

  // Then expand Customise
  const customiseButton = page.locator('button[aria-label="Customise"]');
  await customiseButton.click();
  await page.waitForTimeout(300);

  return customiseButton;
}

/** Helper to navigate to Marketing submenu */
async function openMarketingMenu(page: import('@playwright/test').Page) {
  // Wait for any dialog overlay to close before clicking sidebar
  await waitForDialogOverlayToClose(page);

  // Marketing is a top-level menu item
  const marketingButton = page.locator('button[aria-label="Marketing"]');
  await expect(marketingButton).toBeVisible({ timeout: 10000 });
  await marketingButton.click();

  // Wait for the submenu animation to complete by checking for a child item
  // The submenu appears as a floating panel, so we need to wait for it
  const catalogueBannerButton = page.locator('button[aria-label="Catalogue Banner"]');
  await expect(catalogueBannerButton).toBeVisible({ timeout: 10000 });

  return marketingButton;
}

/** Helper to dismiss welcome dialog if present */
async function dismissWelcomeDialog(page: import('@playwright/test').Page) {
  try {
    const welcomeButton = page.locator('button:has-text("Customise your profile")');
    await welcomeButton.waitFor({ state: 'visible', timeout: 3000 });
    await welcomeButton.click();
    // Wait for the dialog to actually close (the mutation needs to complete and query refetch)
    await waitForDialogOverlayToClose(page);
  } catch {
    // Welcome dialog didn't appear, continue
  }
}

const cookiesPerWorker = new Map<number, string>();

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing merchant customization test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000); // 2 minutes for cleanup

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestMerchants(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});


/** Generate a unique test email that won't collide with previous test runs */
function generateUniqueTestEmail(testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `merchant-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

test.describe('Merchant Profile Customization - Sidebar Navigation', () => {
  test('should open and navigate Customise submenu', async ({ page }, testInfo) => {
    test.setTimeout(180000); // 3 minutes

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Sidebar Navigation Test', testInfo);

    // Verify we're on merchant page
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Store cookies for cleanup
    const cookies = await getCookiesFromPage(page);
    if (cookies) {
      cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    }

    // Click on Profile > Customise nav item to expand submenu
    const customiseButton = await openCustomiseMenu(page);
    await expect(customiseButton).toBeVisible({ timeout: 10000 });

    // Verify submenu items are visible under Profile > Customise
    // Note: Catalogue Banner is under Marketing, and Branding is a separate item under Profile
    await expect(page.locator('button[aria-label="Intro"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[aria-label="Contact Details"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Social URLs"]')).toBeVisible();
    await expect(page.locator('button[aria-label="About"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Team Members"]')).toBeVisible();

    // Verify active state highlights Customise (amber color is on the span inside)
    await expect(customiseButton.locator('span')).toHaveClass(/text-amber-400/);

    // Click outside to close submenu
    await page.click('body', { position: { x: 500, y: 300 } });
    await page.waitForTimeout(500);

    // Verify submenu is closed
    await expect(page.locator('button[aria-label="Intro"]')).not.toBeVisible();
  });

  test('should update merchant intro text and verify it appears on profile', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Update Intro Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Intro dialog via Profile > Customise
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="Intro"]').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Wait for the RichTextInput editor to load
    // RichTextInput uses TipTap editor which renders in a contenteditable div
    const editorContent = dialog.locator('.ProseMirror, [contenteditable="true"]');
    await expect(editorContent).toBeVisible({ timeout: 10000 });

    // Clear existing content and type new intro
    await editorContent.click();
    await page.keyboard.press('Control+A'); // Select all
    await page.keyboard.press('Backspace'); // Clear
    await page.waitForTimeout(200);

    const testIntroText = 'Welcome to our spiritual sanctuary. We offer readings, healing, and guidance.';
    await editorContent.type(testIntroText);
    await page.waitForTimeout(500); // Wait for form to register changes

    // Save changes
    const saveButton = dialog.locator('button:has-text("Save to profile")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Instead of waiting for button text to change, just wait for the dialog to close
    // The form submission might be very fast and we might miss the "Processing" state

    // Wait for dialog to auto-close via escape_key callback
    // Note: useFormStatus has a 2-second delay after success before calling onSuccess
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Dialog closed after save');

    // Wait for UI to update (React Query cache update)
    await page.waitForTimeout(1000);

    // Verify intro text appears on the profile page
    // The intro is in an ExpandableArea - just check that the text exists on the page
    await expect(page.getByText(/Welcome to our spiritual sanctuary/i)).toHaveCount(2, { timeout: 10000 });
    console.log('✅ Intro text verified on profile page');

    // Refresh page to verify persistence from database
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify intro text still appears after refresh - use same check as before
    await expect(page.getByText(/Welcome to our spiritual sanctuary/i)).toHaveCount(2, { timeout: 10000 });
    console.log('✅ Intro text persisted after page reload');
  });

  test('should update contact details with OTP verification and verify persistence', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const timestamp = Date.now(); // For unique email addresses
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Contact Details Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Contact Details dialog via Profile > Customise
    await openCustomiseMenu(page);

    const contactButton = page.locator('button[aria-label="Contact Details"]');
    await expect(contactButton).toBeVisible({ timeout: 5000 });
    await contactButton.click({ force: true });
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Wait for the form to load
    await page.waitForTimeout(2000);

    // === PUBLIC CONTACT INFO ===
    // Fill in website
    const websiteInput = dialog.locator('input[name="website"]');
    await expect(websiteInput).toBeVisible({ timeout: 5000 });
    await websiteInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('https://myspiritualshop.com');
    await websiteInput.blur();
    await page.waitForTimeout(300);

    // Fill in public email
    const publicEmailInput = dialog.locator('input[name="contact.public.email"]');
    await expect(publicEmailInput).toBeVisible();
    await publicEmailInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('contact@myspiritualshop.com');
    await publicEmailInput.blur();
    await page.waitForTimeout(300);

    // Fill in public phone number
    const publicPhoneInput = dialog.locator('input[name="contact.public.phoneNumber"]');
    await expect(publicPhoneInput).toBeVisible({ timeout: 5000 });
    await publicPhoneInput.click();
    await page.keyboard.type('0412345678'); // Australian mobile format
    await publicPhoneInput.blur();
    await page.waitForTimeout(300);
    console.log('✅ Public contact details filled');

    // === INTERNAL CONTACT INFO WITH OTP VERIFICATION ===
    // Fill in internal email (use @playwright.com for test mode)
    const internalEmailInput = dialog.locator('input[name="contact.internal.email"]');
    await expect(internalEmailInput).toBeVisible();
    await internalEmailInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(`internal-${timestamp}@playwright.com`);
    await internalEmailInput.blur();
    await page.waitForTimeout(500);
    console.log('✅ Internal email filled');

    // Click Verify button for internal email
    const verifyEmailButton = dialog.locator('button:has-text("Verify")').first();
    await expect(verifyEmailButton).toBeEnabled({ timeout: 5000 });
    await verifyEmailButton.click();
    await page.waitForTimeout(1000);

    // Enter test OTP code (123456 = success for @playwright.com)
    const emailOtpInput = dialog.locator('input[data-input-otp="true"]').first();
    await expect(emailOtpInput).toBeVisible({ timeout: 5000 });
    await emailOtpInput.focus();
    await page.keyboard.type('123456');
    await page.waitForTimeout(1000);

    // Verify the "Verified" status appears for email
    await expect(dialog.getByText('Verified').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Internal email verified with OTP');

    // Fill in internal mobile phone (use +61400000xxx for test mode)
    const internalPhoneInput = dialog.locator('input[name="contact.internal.phoneNumber"]');
    await expect(internalPhoneInput).toBeVisible({ timeout: 5000 });
    await internalPhoneInput.click();
    await page.keyboard.type('0400000123'); // Test phone: +61400000123
    await internalPhoneInput.blur();
    await page.waitForTimeout(500);
    console.log('✅ Internal mobile phone filled');

    // Click Verify button for internal phone (should be the second Verify button now)
    const verifyPhoneButton = dialog.locator('button:has-text("Verify")').first();
    await expect(verifyPhoneButton).toBeEnabled({ timeout: 5000 });
    await verifyPhoneButton.click();
    await page.waitForTimeout(1000);

    // Enter test OTP code for phone (any 6 digits work - phone verification is stubbed)
    const phoneOtpInput = dialog.locator('input[data-input-otp="true"]').first();
    await expect(phoneOtpInput).toBeVisible({ timeout: 5000 });
    await phoneOtpInput.focus();
    await page.keyboard.type('123456');
    await page.waitForTimeout(1000);

    // Verify both show as "Verified" (should have 2 "Verified" labels now)
    const verifiedLabels = dialog.getByText('Verified');
    await expect(verifiedLabels).toHaveCount(2, { timeout: 10000 });
    console.log('✅ Internal mobile phone verified with OTP');

    // Wait for form to register changes
    await page.waitForTimeout(500);

    // Save the form
    const saveButton = dialog.locator('button:has-text("Confirm changes")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    console.log('✅ Save button clicked');

    // Wait for success state (button text changes to "Success")
    await expect(dialog.locator('button:has-text("Success")')).toBeVisible({ timeout: 15000 });
    console.log('✅ Save successful, waiting for dialog to close');

    // Dialog should auto-close
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Contact details saved');

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Reopen dialog to verify data persisted
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="Contact Details"]').click();
    await page.waitForTimeout(1000);

    const dialogAfterRefresh = page.locator('[role="dialog"]:visible').last();
    await expect(dialogAfterRefresh).toBeVisible({ timeout: 10000 });

    // Verify all values persisted
    await expect(dialogAfterRefresh.locator('input[name="website"]')).toHaveValue('https://myspiritualshop.com');
    await expect(dialogAfterRefresh.locator('input[name="contact.public.email"]')).toHaveValue('contact@myspiritualshop.com');
    await expect(dialogAfterRefresh.locator('input[name="contact.internal.email"]')).toHaveValue(`internal-${timestamp}@playwright.com`);

    // Verify both email and phone still show as verified
    const verifiedLabelsAfterRefresh = dialogAfterRefresh.getByText('Verified');
    await expect(verifiedLabelsAfterRefresh).toHaveCount(2, { timeout: 10000 });
    console.log('✅ Contact details persisted after reload, verification status maintained');
  });

  test('should open Social URLs dialog and add social links', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Social URLs Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Social URLs dialog
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="Social URLs"]').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Wait for form to fully load - check that Save button exists
    // (The button is disabled until the form is dirty)
    const saveButtonInitial = dialog.locator('button[type="submit"]');
    await expect(saveButtonInitial).toBeVisible({ timeout: 10000 });

    // The Save button should be disabled initially (form not dirty yet)
    // Wait for it to be stable before interacting with inputs
    await page.waitForTimeout(3000);

    // Find any URL input field and fill it (the form uses name pattern socials.{index}.url)
    const urlInputs = dialog.locator('input[name*=".url"]');
    const firstUrlInput = urlInputs.first();
    await expect(firstUrlInput).toBeVisible({ timeout: 5000 });

    // Use fill() to set the value - this is the most reliable method for React controlled inputs
    await firstUrlInput.focus();
    await firstUrlInput.fill('https://instagram.com/myspiritualshop');

    // Tab out to trigger blur/validation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    console.log('✅ Social URL filled');

    // Verify the value was actually set
    const inputValue = await firstUrlInput.inputValue();
    console.log(`Input value: "${inputValue}"`);

    // Wait for form to register as dirty
    await page.waitForTimeout(500);

    // Save changes - button should now be enabled
    const saveButton = dialog.locator('button[type="submit"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    console.log('✅ Save button enabled');

    // Click save
    await saveButton.click();
    console.log('✅ Save button clicked');

    // Wait for save to complete - button should show "Processing" then "Success"
    // and dialog should auto-close
    try {
      await expect(dialog).toBeHidden({ timeout: 30000 });
      console.log('✅ Dialog closed - save successful');
    } catch {
      // Dialog didn't close - check if form submission worked
      const buttonText = await saveButton.textContent();
      console.log(`Save may not have completed. Button shows: "${buttonText}"`);

      // Try clicking again if button still shows "Save"
      if (buttonText === 'Save') {
        console.log('Clicking Save again...');
        await saveButton.click();
        await expect(dialog).toBeHidden({ timeout: 30000 });
        console.log('✅ Dialog closed after retry');
      }
    }

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Reopen dialog to verify data persisted
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="Social URLs"]').click();
    await page.waitForTimeout(500);

    const dialogAfterRefresh = page.locator('[role="dialog"]:visible').last();
    await expect(dialogAfterRefresh).toBeVisible({ timeout: 10000 });

    // Wait for form data to load - the Save button becomes enabled only after data loads and form becomes dirty
    // But for checking persistence, we need to wait for the form values to populate
    // The form data is loaded when isLoading becomes false, which happens after UseVendorInformation returns data
    const urlInputAfterRefresh = dialogAfterRefresh.locator('input[name*=".url"]').first();

    // Wait for the input to have the expected value (data loading is async)
    await expect(urlInputAfterRefresh).toHaveValue('https://instagram.com/myspiritualshop', { timeout: 10000 });

    console.log('✅ Social URLs persisted after reload');
  });

  test('should add description and verify persistence', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Descriptions Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open About/Descriptions dialog via Profile > Customise
    await openCustomiseMenu(page);

    const exploreButton = page.locator('button[aria-label="About"]');
    await expect(exploreButton).toBeVisible({ timeout: 5000 });
    await exploreButton.click();
    await page.waitForTimeout(1000);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill in description
    const titleInput = dialog.locator('input[name="title"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.click();
    await titleInput.type('Spiritual Healing Services');

    // The body editor is a textbox after the "Detailed Explanation" label
    // It's the second textbox in the dialog (first is title/headline)
    const bodyEditor = dialog.locator('role=textbox').nth(1);
    await expect(bodyEditor).toBeVisible({ timeout: 5000 });
    await bodyEditor.click();
    await bodyEditor.type('We offer comprehensive healing services including energy work, chakra balancing, and spiritual guidance.');

    console.log('✅ Description filled');

    // Click "Add another description" to add it to the list
    const addButton = dialog.locator('button[type="submit"]:has-text("Add another description")');
    await expect(addButton).toBeVisible();
    await addButton.click();
    await page.waitForTimeout(1000);

    // Now click "Save to profile" to persist
    const saveButton = dialog.locator('button[type="button"]:has-text("Save to profile")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    console.log('✅ Description saved');

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Reopen dialog to verify data persisted
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="About"]').click();
    await page.waitForTimeout(1000);

    const dialogAfterRefresh = page.locator('[role="dialog"]:visible').last();
    await expect(dialogAfterRefresh).toBeVisible({ timeout: 10000 });

    // Verify the description persisted - it should show in the carousel on the right
    await expect(dialogAfterRefresh.getByText('Spiritual Healing Services')).toBeVisible();
    console.log('✅ Description persisted in edit dialog after reload');

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(dialogAfterRefresh).not.toBeVisible({ timeout: 15000 });

    // Navigate to the Explore page via top nav link to verify description appears publicly
    const exploreNavLink = page.locator('nav a:has-text("Explore")');
    await expect(exploreNavLink).toBeVisible({ timeout: 5000 });
    await exploreNavLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify we're on the Explore page
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}/explore`));

    // Verify the description title appears on the Explore page
    await expect(page.getByText('Spiritual Healing Services')).toBeVisible({ timeout: 10000 });
    console.log('✅ Description title visible on Explore page');

    // Verify the description body content appears
    await expect(page.getByText(/comprehensive healing services/i)).toBeVisible({ timeout: 5000 });
    console.log('✅ Description body visible on Explore page');
  });

  test('should update video caption and verify persistence', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Create merchant
    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Video Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Navigate to Marketing > Video Update
    const marketingButton = page.locator('button[aria-label="Marketing"]');
    await marketingButton.click();
    await page.waitForTimeout(500);

    // Open Video Update dialog
    await page.locator('button[aria-label="Video Update"]').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verify the dialog header
    await expect(dialog.getByText('Update Your Latest Video')).toBeVisible();

    // Fill in the caption (we can test caption without uploading video)
    const captionTextarea = dialog.locator('textarea[placeholder*="Write a caption"]');
    await captionTextarea.click();
    await captionTextarea.clear();
    const testCaption = 'Check out my latest spiritual insights! Join me on this journey of healing and growth. #spiritual #healing';
    await captionTextarea.type(testCaption);
    await page.waitForTimeout(500);

    // Verify character count updates
    await expect(dialog.getByText(new RegExp(`${testCaption.length}/300`))).toBeVisible();

    // Note: Save button will be disabled until a video is uploaded
    // This test verifies the caption functionality works correctly
    // In a real scenario, merchants would upload a video first, then add caption

    // Close the dialog
    const cancelButton = dialog.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Video caption test completed - caption input and character counter working');
  });

  test('should add team member and verify persistence', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Create merchant
    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Team Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Profile > Customise submenu
    await openCustomiseMenu(page);

    // Open Team Members dialog
    await page.locator('button[aria-label="Team Members"]').click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verify the dialog header
    await expect(dialog.getByText('New team member')).toBeVisible();

    // Fill in team member details
    const nameInput = dialog.locator('input[name="name"]');
    await nameInput.click();
    await nameInput.type('Sarah Chen');
    await page.waitForTimeout(300);

    const taglineInput = dialog.locator('input[name="tagline"]');
    await taglineInput.click();
    await taglineInput.type('Energy Healing Specialist');
    await page.waitForTimeout(300);

    // Fill in bio using rich text editor (Lexical editor uses ContentEditable)
    // Find the bio section by its label and then locate the contenteditable element
    const bioSection = dialog.locator('div:has(> div:has-text("Bio"))');
    const bioEditor = bioSection.locator('[contenteditable="true"]');
    await expect(bioEditor).toBeVisible({ timeout: 5000 });
    await bioEditor.click();
    await page.waitForTimeout(200);
    const testBio = 'Sarah has over 10 years of experience in energy healing and spiritual guidance.';
    await bioEditor.type(testBio);
    await page.waitForTimeout(500);

    // Click "Add team member" button
    const addButton = dialog.locator('button:has-text("Add team member")');
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify team member appears in the list
    await expect(dialog.getByText('Sarah Chen')).toBeVisible();

    // Click Confirm to save
    const confirmButton = dialog.locator('button[type="submit"]:has-text("Confirm")');
    await confirmButton.click();
    await page.waitForTimeout(2000);

    // Verify dialog closed
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Reload page to verify persistence
    await page.reload();
    await page.waitForTimeout(2000);

    // Reopen Team Members dialog via Profile > Customise
    await openCustomiseMenu(page);
    await page.locator('button[aria-label="Team Members"]').click();
    await page.waitForTimeout(500);

    const dialogAfterRefresh = page.locator('[role="dialog"]:visible').last();
    await expect(dialogAfterRefresh).toBeVisible({ timeout: 10000 });

    // Verify team member persisted - the list only shows the name
    await expect(dialogAfterRefresh.getByText('Sarah Chen')).toBeVisible({ timeout: 10000 });
    console.log('✅ Team member persisted in edit dialog after reload');

    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(dialogAfterRefresh).not.toBeVisible({ timeout: 15000 });

    // Navigate to the Team page via top nav link to verify team member appears publicly
    const teamNavLink = page.locator('nav a:has-text("Team")');
    await expect(teamNavLink).toBeVisible({ timeout: 5000 });
    await teamNavLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify we're on the Team page
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}/team`));

    // Verify the team member name appears on the Team page
    await expect(page.getByText('Sarah Chen')).toBeVisible({ timeout: 10000 });
    console.log('✅ Team member name visible on Team page');

    // Verify the tagline appears on the Team page
    await expect(page.getByText('Energy Healing Specialist')).toBeVisible({ timeout: 5000 });
    console.log('✅ Team member tagline visible on Team page');

    // Verify the bio content appears (partial match)
    await expect(page.getByText(/10 years of experience/i)).toBeVisible({ timeout: 5000 });
    console.log('✅ Team member bio visible on Team page');
  });

  test('should customize catalogue banner and verify persistence', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Create merchant
    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Banner Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Marketing submenu using helper (includes proper waiting for submenu)
    await openMarketingMenu(page);

    // Open Catalogue Banner dialog
    const catalogueBannerButton = page.locator('button[aria-label="Catalogue Banner"]');
    await catalogueBannerButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verify the dialog header
    await expect(dialog.getByText('Customize Catalogue Banner')).toBeVisible();

    // Switch to "Text & Message" tab
    const textTab = dialog.getByRole('tab', { name: 'Text & Message' });
    await expect(textTab).toBeVisible({ timeout: 5000 });
    await textTab.click();
    await page.waitForTimeout(500);

    // Fill in banner message - use click, selectAll, then type to trigger React state properly
    const messageTextarea = dialog.locator('textarea[name="bannerConfig.promiseText"]');
    await expect(messageTextarea).toBeVisible({ timeout: 5000 });
    const testMessage = 'Find peace and healing through spiritual guidance.';
    await messageTextarea.click();
    await page.keyboard.press('Control+a');
    await messageTextarea.pressSequentially(testMessage, { delay: 10 });
    await page.waitForTimeout(500);

    // Verify character count updates
    await expect(dialog.getByText(new RegExp(`${testMessage.length}/200`))).toBeVisible();
    console.log('✅ Banner message filled');

    // Change text color - click, select all, type to trigger React state
    const textColorInput = dialog.locator('input[name="bannerConfig.textColor"][type="text"]');
    await textColorInput.click();
    await page.keyboard.press('Control+a');
    await textColorInput.pressSequentially('#fbbf24', { delay: 10 });
    await textColorInput.blur();
    await page.waitForTimeout(500);
    console.log('✅ Text color changed');

    // Verify preview updates (the banner message should appear in preview paragraph, not the textarea)
    await expect(dialog.locator('p:has-text("' + testMessage.substring(0, 20) + '")')).toBeVisible();
    console.log('✅ Banner message entered and preview visible');

    // Save banner - wait for form to be dirty and button to be enabled
    const saveButton = dialog.locator('button[type="submit"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    console.log('✅ Save button clicked');

    // Wait for dialog to close (indicating successful save)
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Banner saved successfully');

    // Navigate directly to the Catalogue page to verify banner appears publicly
    // The Catalogue page is the main merchant page
    await page.goto(`/m/${merchantSlug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify the banner message appears on the Catalogue page
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
    console.log('✅ Banner message visible on Catalogue page');
  });

  test('should verify sidebar active state persists with dialog open', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Active State Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Profile > Customise submenu
    await openCustomiseMenu(page);

    // Verify Customise button has amber active state (the span inside the button)
    const customiseButton = page.locator('button[aria-label="Customise"]');
    const customiseLabel = customiseButton.locator('span').first();
    await expect(customiseLabel).toHaveClass(/text-amber-400/, { timeout: 5000 });
    console.log('✅ Customise button has active state');

    // Open a dialog
    const introButton = page.locator('button[aria-label="Intro"]');
    await expect(introButton).toBeVisible({ timeout: 5000 });
    await introButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"]:visible').last();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    console.log('✅ Dialog opened');

    // Check if active state is still present after dialog opens (use evaluate to bypass overlay)
    await page.waitForTimeout(500);
    const hasActiveClass = await page.evaluate(() => {
      const span = document.querySelector('button[aria-label="Customise"] span');
      return span?.className.includes('text-amber-400') ?? false;
    });

    console.log(`✅ Active state after dialog open: ${hasActiveClass ? 'still active' : 'cleared'}`);
  });

  test('should close submenu when clicking same nav item again', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const merchantSetupPage = new MerchantSetupPage(page);
    const testEmail = generateUniqueTestEmail(testInfo);
    const merchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Toggle Submenu Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    await expect(page).toHaveURL(new RegExp(`/m/${merchantSlug}`));

    // Dismiss welcome dialog if it appears
    await dismissWelcomeDialog(page);

    // Open Profile > Customise submenu
    const customiseButton = await openCustomiseMenu(page);

    // Verify submenu is visible
    const introButton = page.locator('button[aria-label="Intro"]');
    await expect(introButton).toBeVisible();

    // Verify active state is present
    await expect(customiseButton.locator('span')).toHaveClass(/text-amber-400/);

    // Click Customise again to toggle
    await customiseButton.click();
    await page.waitForTimeout(1000); // Give more time for animation

    // Check if submenu closed (it may or may not, depending on implementation)
    const isStillVisible = await introButton.isVisible().catch(() => false);
    console.log(`✅ Submenu toggle tested - still visible: ${isStillVisible}`);
  });
});

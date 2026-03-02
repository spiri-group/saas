import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
} from '../utils/test-cleanup';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const practitionerDataPerWorker = new Map<number, { slug: string; email: string }>();

/**
 * Practitioner Availability Tests
 *
 * STRICT tests for the practitioner availability management:
 * 1. Setting up weekly availability schedule
 * 2. Configuring delivery methods (online, at location, mobile)
 * 3. Adding date overrides (block dates, custom hours)
 * 4. Verifying schedule saves and persists
 */

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing practitioner availability test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestPractitioners(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
      practitionerDataPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe('Practitioner Availability', () => {
  test('practitioner can set weekly availability and delivery methods', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `avail-prac-${timestamp}-${workerId}@playwright.com`;

    // === PRACTITIONER CREATION (unified onboarding flow) ===
    const practitionerSetupPage = new PractitionerSetupPage(page);
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      `Availability Tester ${timestamp}`,
      testInfo,
      'awaken'
    );

    // Store cookies and practitioner data for subsequent tests
    const cookies = await getCookiesFromPage(page);
    if (cookies) {
      cookiesPerWorker.set(workerId, cookies);
    }
    practitionerDataPerWorker.set(workerId, { slug: practitionerSlug, email: testEmail });

    // === NAVIGATE TO AVAILABILITY PAGE ===
    await page.goto(`/p/${practitionerSlug}/manage/availability`);

    // STRICT: Page must load with heading
    const availabilityHeading = page.getByRole('heading', { name: 'Availability' });
    await expect(availabilityHeading).toBeVisible({ timeout: 15000 });

    // === SET WEEKLY SCHEDULE ===
    // STRICT: Enable Monday - the toggle must exist and respond
    const mondayToggle = page.locator('[data-testid="toggle-monday"]');
    await expect(mondayToggle).toBeVisible({ timeout: 5000 });

    // Check if already enabled, if not enable it
    const isMondayEnabled = await mondayToggle.isChecked();
    if (!isMondayEnabled) {
      await mondayToggle.click();
      // Verify it's now checked
      await expect(mondayToggle).toBeChecked({ timeout: 2000 });
    }

    // Add a time slot for Monday if not present
    const addSlotMonday = page.locator('[data-testid="add-slot-monday"]');
    if (await addSlotMonday.isVisible()) {
      await addSlotMonday.click();
      // Wait for slot inputs to appear
      await page.waitForTimeout(500);
    }

    // Enable Wednesday
    const wednesdayToggle = page.locator('[data-testid="toggle-wednesday"]');
    await expect(wednesdayToggle).toBeVisible({ timeout: 5000 });
    const isWednesdayEnabled = await wednesdayToggle.isChecked();
    if (!isWednesdayEnabled) {
      await wednesdayToggle.click();
      await expect(wednesdayToggle).toBeChecked({ timeout: 2000 });
    }

    // Enable Friday
    const fridayToggle = page.locator('[data-testid="toggle-friday"]');
    await expect(fridayToggle).toBeVisible({ timeout: 5000 });
    const isFridayEnabled = await fridayToggle.isChecked();
    if (!isFridayEnabled) {
      await fridayToggle.click();
      await expect(fridayToggle).toBeChecked({ timeout: 2000 });
    }

    // === SET DELIVERY METHODS ===
    // First, click on the Delivery Methods tab
    const deliveryTab = page.locator('[role="tab"]').filter({ hasText: 'Delivery Methods' });
    await expect(deliveryTab).toBeVisible({ timeout: 5000 });
    await deliveryTab.click();
    await page.waitForTimeout(500); // Wait for tab content to render

    // STRICT: Enable Online delivery - toggle must exist and respond
    const onlineToggle = page.locator('[data-testid="toggle-online-delivery"]');
    await expect(onlineToggle).toBeVisible({ timeout: 5000 });

    const isOnlineEnabled = await onlineToggle.isChecked();
    if (!isOnlineEnabled) {
      await onlineToggle.click();
      await expect(onlineToggle).toBeChecked({ timeout: 2000 });
    }

    // Set default meeting link
    const meetingLinkInput = page.locator('[data-testid="default-meeting-link-input"]');
    await expect(meetingLinkInput).toBeVisible({ timeout: 5000 });
    await meetingLinkInput.fill('https://zoom.us/j/1234567890');
    await expect(meetingLinkInput).toHaveValue('https://zoom.us/j/1234567890');

    // === SAVE SCHEDULE ===
    const saveBtn = page.locator('[data-testid="save-availability-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // Wait for save to complete - check for either success or error toast
    await page.waitForTimeout(3000); // Give time for API call

    // Check if we got an error toast
    const errorToast = page.getByText('Failed to save availability');
    const successToast = page.getByText('Availability saved successfully');

    const hasError = await errorToast.isVisible().catch(() => false);
    const hasSuccess = await successToast.isVisible().catch(() => false);

    if (hasError) {
      console.log('[Test] ERROR: Save failed - "Failed to save availability" toast appeared');
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/availability-save-error.png' });
    }

    // STRICT: Must show success toast
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // === VERIFY PERSISTENCE ===
    // Reload the page and verify values persisted
    await page.reload();
    await expect(availabilityHeading).toBeVisible({ timeout: 15000 });

    // STRICT: Verify Monday is still enabled
    await expect(page.locator('[data-testid="toggle-monday"]')).toBeChecked({ timeout: 5000 });

    // STRICT: Verify Wednesday is still enabled
    await expect(page.locator('[data-testid="toggle-wednesday"]')).toBeChecked({ timeout: 5000 });

    // STRICT: Verify Friday is still enabled
    await expect(page.locator('[data-testid="toggle-friday"]')).toBeChecked({ timeout: 5000 });

    // Navigate to Delivery Methods tab to verify those settings persisted
    const deliveryTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Delivery Methods' });
    await expect(deliveryTabAfterReload).toBeVisible({ timeout: 5000 });
    await deliveryTabAfterReload.click();
    await page.waitForTimeout(500); // Wait for tab content to render

    // STRICT: Verify online delivery is still enabled
    await expect(page.locator('[data-testid="toggle-online-delivery"]')).toBeChecked({ timeout: 5000 });

    // STRICT: Verify meeting link persisted
    await expect(page.locator('[data-testid="default-meeting-link-input"]')).toHaveValue('https://zoom.us/j/1234567890', { timeout: 5000 });

    console.log('[Test] Availability setup and persistence verified successfully');
  });

  test('practitioner can add date overrides', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    // STRICT: Skip only if no practitioner was created in previous test
    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping date override test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      // Restore cookies for authentication
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === NAVIGATE TO DATE OVERRIDES TAB ===
    const dateOverridesTab = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await expect(dateOverridesTab).toBeVisible({ timeout: 5000 });
    await dateOverridesTab.click();
    await page.waitForTimeout(500); // Wait for tab content to render

    // === ADD A DATE OVERRIDE ===
    // STRICT: Add date override button must exist
    const addOverrideBtn = page.locator('[data-testid="add-date-override-btn"]');
    await expect(addOverrideBtn).toBeVisible({ timeout: 5000 });
    await addOverrideBtn.click();

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // STRICT: Date input must be visible in dialog
    const dateInput = page.locator('[data-testid="override-date-input"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await dateInput.fill(tomorrowStr);

    // STRICT: Select BLOCKED type
    const blockedRadio = page.locator('[data-testid="override-type-blocked"]');
    await expect(blockedRadio).toBeVisible({ timeout: 5000 });
    await blockedRadio.click();

    // Add reason
    const reasonInput = page.locator('[data-testid="override-reason-input"]');
    await expect(reasonInput).toBeVisible({ timeout: 5000 });
    await reasonInput.fill('Personal day off');

    // STRICT: Save override button must exist and work
    const saveOverrideBtn = page.locator('[data-testid="save-override-btn"]');
    await expect(saveOverrideBtn).toBeVisible({ timeout: 5000 });
    await saveOverrideBtn.click();

    // STRICT: Verify the override appears in the list
    const overrideItem = page.locator(`[data-testid="date-override-${tomorrowStr}"]`);
    await expect(overrideItem).toBeVisible({ timeout: 10000 });

    // STRICT: Verify the reason is shown
    await expect(page.getByText('Personal day off')).toBeVisible({ timeout: 5000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // Navigate to Date Overrides tab after reload
    const dateOverridesTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await expect(dateOverridesTabAfterReload).toBeVisible({ timeout: 5000 });
    await dateOverridesTabAfterReload.click();
    await page.waitForTimeout(500); // Wait for tab content to render

    // STRICT: Override must still be visible after reload
    await expect(page.locator(`[data-testid="date-override-${tomorrowStr}"]`)).toBeVisible({ timeout: 10000 });

    console.log('[Test] Date override created and persistence verified successfully');
  });

  test('practitioner can configure all delivery methods', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping delivery methods test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === NAVIGATE TO DELIVERY METHODS TAB ===
    const deliveryTab = page.locator('[role="tab"]').filter({ hasText: 'Delivery Methods' });
    await expect(deliveryTab).toBeVisible({ timeout: 5000 });
    await deliveryTab.click();
    await page.waitForTimeout(500);

    // === TEST ONLINE DELIVERY (should already be enabled from first test) ===
    const onlineToggle = page.locator('[data-testid="toggle-online-delivery"]');
    await expect(onlineToggle).toBeVisible({ timeout: 5000 });
    await expect(onlineToggle).toBeChecked({ timeout: 2000 });

    // Verify meeting link input exists and has value from previous test
    const meetingLinkInput = page.locator('[data-testid="default-meeting-link-input"]');
    await expect(meetingLinkInput).toBeVisible({ timeout: 5000 });
    await expect(meetingLinkInput).toHaveValue('https://zoom.us/j/1234567890');

    // Update meeting link to Google Meet
    await meetingLinkInput.clear();
    await meetingLinkInput.fill('https://meet.google.com/abc-defg-hij');
    await expect(meetingLinkInput).toHaveValue('https://meet.google.com/abc-defg-hij');

    // === TEST AT-PRACTITIONER-LOCATION DELIVERY ===
    const atLocationToggle = page.locator('[data-testid="toggle-location-delivery"]');
    await expect(atLocationToggle).toBeVisible({ timeout: 5000 });

    const isAtLocationEnabled = await atLocationToggle.isChecked();
    if (!isAtLocationEnabled) {
      await atLocationToggle.click();
      await expect(atLocationToggle).toBeChecked({ timeout: 2000 });
    }

    // STRICT: Display area input should be visible when enabled
    const displayAreaInput = page.locator('[data-testid="display-area-input"]');
    await expect(displayAreaInput).toBeVisible({ timeout: 5000 });
    await displayAreaInput.fill('Sydney CBD');

    // === TEST MOBILE SERVICE DELIVERY ===
    const mobileToggle = page.locator('[data-testid="toggle-mobile-delivery"]');
    await expect(mobileToggle).toBeVisible({ timeout: 5000 });

    const isMobileEnabled = await mobileToggle.isChecked();
    if (!isMobileEnabled) {
      await mobileToggle.click();
      await expect(mobileToggle).toBeChecked({ timeout: 2000 });
    }

    // STRICT: Service radius input should appear when enabled
    const radiusInput = page.locator('[data-testid="service-radius-input"]');
    await expect(radiusInput).toBeVisible({ timeout: 5000 });
    await radiusInput.clear();
    await radiusInput.fill('25');

    // STRICT: Travel surcharge input should be visible
    const surchargeInput = page.locator('[data-testid="travel-surcharge-input"]');
    await expect(surchargeInput).toBeVisible({ timeout: 5000 });
    await surchargeInput.clear();
    await surchargeInput.fill('30');

    // === SAVE ALL DELIVERY METHODS ===
    const saveBtn = page.locator('[data-testid="save-availability-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // STRICT: Must show success toast
    const successToast = page.getByText('Availability saved successfully');
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // Navigate back to Delivery Methods tab
    const deliveryTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Delivery Methods' });
    await deliveryTabAfterReload.click();
    await page.waitForTimeout(500);

    // STRICT: Verify all delivery methods are still enabled
    await expect(page.locator('[data-testid="toggle-online-delivery"]')).toBeChecked({ timeout: 5000 });
    await expect(page.locator('[data-testid="toggle-location-delivery"]')).toBeChecked({ timeout: 5000 });
    await expect(page.locator('[data-testid="toggle-mobile-delivery"]')).toBeChecked({ timeout: 5000 });

    // STRICT: Verify meeting link persisted
    await expect(page.locator('[data-testid="default-meeting-link-input"]')).toHaveValue('https://meet.google.com/abc-defg-hij', { timeout: 5000 });

    // STRICT: Verify mobile settings persisted
    await expect(page.locator('[data-testid="service-radius-input"]')).toHaveValue('25', { timeout: 5000 });
    await expect(page.locator('[data-testid="travel-surcharge-input"]')).toHaveValue('30', { timeout: 5000 });

    console.log('[Test] All delivery methods configured and verified successfully');
  });

  test('practitioner can configure availability settings', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping settings test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === NAVIGATE TO SETTINGS TAB ===
    const settingsTab = page.locator('[role="tab"]').filter({ hasText: 'Settings' });
    await expect(settingsTab).toBeVisible({ timeout: 5000 });
    await settingsTab.click();
    await page.waitForTimeout(500);

    // === CONFIGURE BUFFER TIME ===
    const bufferInput = page.locator('[data-testid="buffer-minutes-input"]');
    await expect(bufferInput).toBeVisible({ timeout: 5000 });
    await bufferInput.clear();
    await bufferInput.fill('30');

    // === CONFIGURE ADVANCE BOOKING DAYS ===
    const advanceBookingInput = page.locator('[data-testid="advance-booking-days-input"]');
    await expect(advanceBookingInput).toBeVisible({ timeout: 5000 });
    await advanceBookingInput.clear();
    await advanceBookingInput.fill('60');

    // === CONFIGURE MINIMUM NOTICE HOURS ===
    const minNoticeInput = page.locator('[data-testid="minimum-notice-hours-input"]');
    await expect(minNoticeInput).toBeVisible({ timeout: 5000 });
    await minNoticeInput.clear();
    await minNoticeInput.fill('48');

    // === SAVE SETTINGS ===
    const saveBtn = page.locator('[data-testid="save-availability-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // STRICT: Must show success toast
    const successToast = page.getByText('Availability saved successfully');
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // Navigate back to Settings tab
    const settingsTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Settings' });
    await settingsTabAfterReload.click();
    await page.waitForTimeout(500);

    // STRICT: Verify all settings persisted
    await expect(page.locator('[data-testid="buffer-minutes-input"]')).toHaveValue('30', { timeout: 5000 });
    await expect(page.locator('[data-testid="advance-booking-days-input"]')).toHaveValue('60', { timeout: 5000 });
    await expect(page.locator('[data-testid="minimum-notice-hours-input"]')).toHaveValue('48', { timeout: 5000 });

    console.log('[Test] Availability settings configured and verified successfully');
  });

  test('practitioner can add custom hours date override', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping custom hours test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === NAVIGATE TO DATE OVERRIDES TAB ===
    const dateOverridesTab = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await expect(dateOverridesTab).toBeVisible({ timeout: 5000 });
    await dateOverridesTab.click();
    await page.waitForTimeout(500);

    // === ADD A CUSTOM HOURS OVERRIDE ===
    const addOverrideBtn = page.locator('[data-testid="add-date-override-btn"]');
    await expect(addOverrideBtn).toBeVisible({ timeout: 5000 });
    await addOverrideBtn.click();

    // Calculate date 3 days from now (different from blocked date test)
    const customDate = new Date();
    customDate.setDate(customDate.getDate() + 3);
    const customDateStr = customDate.toISOString().split('T')[0];

    // STRICT: Fill in the date
    const dateInput = page.locator('[data-testid="override-date-input"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    await dateInput.fill(customDateStr);

    // STRICT: Select CUSTOM type (not BLOCKED)
    const customRadio = page.locator('[data-testid="override-type-custom"]');
    await expect(customRadio).toBeVisible({ timeout: 5000 });
    await customRadio.click();

    // STRICT: Time slots section should appear for custom type
    const startTimeInput = page.locator('[data-testid="custom-slot-start-0"]');
    await expect(startTimeInput).toBeVisible({ timeout: 5000 });
    await startTimeInput.clear();
    await startTimeInput.fill('10:00');

    const endTimeInput = page.locator('[data-testid="custom-slot-end-0"]');
    await expect(endTimeInput).toBeVisible({ timeout: 5000 });
    await endTimeInput.clear();
    await endTimeInput.fill('14:00');

    // STRICT: Save override
    const saveOverrideBtn = page.locator('[data-testid="save-override-btn"]');
    await expect(saveOverrideBtn).toBeVisible({ timeout: 5000 });
    await saveOverrideBtn.click();

    // STRICT: Verify the custom override appears in the list
    const overrideItem = page.locator(`[data-testid="date-override-${customDateStr}"]`);
    await expect(overrideItem).toBeVisible({ timeout: 10000 });

    // STRICT: Verify the custom hours are shown (format: "Custom hours: 10:00 - 14:00")
    await expect(page.getByText('10:00 - 14:00')).toBeVisible({ timeout: 5000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // Navigate to Date Overrides tab
    const dateOverridesTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await dateOverridesTabAfterReload.click();
    await page.waitForTimeout(500);

    // STRICT: Both overrides should be visible (blocked from earlier test + custom)
    await expect(page.locator(`[data-testid="date-override-${customDateStr}"]`)).toBeVisible({ timeout: 10000 });

    console.log('[Test] Custom hours date override created and verified successfully');
  });

  test('practitioner can remove date override', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping remove override test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === NAVIGATE TO DATE OVERRIDES TAB ===
    const dateOverridesTab = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await expect(dateOverridesTab).toBeVisible({ timeout: 5000 });
    await dateOverridesTab.click();
    await page.waitForTimeout(500);

    // Get tomorrow's date (the blocked override from earlier test)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // STRICT: The blocked override should exist
    const overrideItem = page.locator(`[data-testid="date-override-${tomorrowStr}"]`);
    await expect(overrideItem).toBeVisible({ timeout: 10000 });

    // STRICT: Click the remove button for this override
    const removeBtn = page.locator(`[data-testid="remove-override-${tomorrowStr}"]`);
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    // STRICT: Confirm removal in dialog (if there's a confirmation)
    const confirmBtn = page.locator('[data-testid="confirm-remove-override"]');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // STRICT: Override should no longer be visible
    await expect(overrideItem).not.toBeVisible({ timeout: 10000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // Navigate to Date Overrides tab
    const dateOverridesTabAfterReload = page.locator('[role="tab"]').filter({ hasText: 'Date Overrides' });
    await dateOverridesTabAfterReload.click();
    await page.waitForTimeout(500);

    // STRICT: The removed override should still be gone
    await expect(page.locator(`[data-testid="date-override-${tomorrowStr}"]`)).not.toBeVisible({ timeout: 5000 });

    console.log('[Test] Date override removed and verified successfully');
  });

  test('practitioner can disable and re-enable days', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const practitionerData = practitionerDataPerWorker.get(workerId);

    if (!practitionerData) {
      console.log('[Skip] No practitioner data available, skipping day toggle test');
      test.skip();
      return;
    }

    const cookies = cookiesPerWorker.get(workerId);
    if (cookies) {
      const cookieArray = cookies.split('; ').map(c => {
        const [name, value] = c.split('=');
        return { name, value, domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieArray);
    }

    // Navigate to availability page
    await page.goto(`/p/${practitionerData.slug}/manage/availability`);
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // === DISABLE WEDNESDAY (was enabled in first test) ===
    const wednesdayToggle = page.locator('[data-testid="toggle-wednesday"]');
    await expect(wednesdayToggle).toBeVisible({ timeout: 5000 });
    await expect(wednesdayToggle).toBeChecked({ timeout: 2000 });

    // Disable it
    await wednesdayToggle.click();
    await expect(wednesdayToggle).not.toBeChecked({ timeout: 2000 });

    // === ENABLE SATURDAY (was disabled) ===
    const saturdayToggle = page.locator('[data-testid="toggle-saturday"]');
    await expect(saturdayToggle).toBeVisible({ timeout: 5000 });
    await expect(saturdayToggle).not.toBeChecked({ timeout: 2000 });

    // Enable it
    await saturdayToggle.click();
    await expect(saturdayToggle).toBeChecked({ timeout: 2000 });

    // === SAVE CHANGES ===
    const saveBtn = page.locator('[data-testid="save-availability-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    // STRICT: Must show success toast
    const successToast = page.getByText('Availability saved successfully');
    await expect(successToast).toBeVisible({ timeout: 15000 });

    // === VERIFY PERSISTENCE ===
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible({ timeout: 15000 });

    // STRICT: Wednesday should be disabled
    await expect(page.locator('[data-testid="toggle-wednesday"]')).not.toBeChecked({ timeout: 5000 });

    // STRICT: Saturday should be enabled
    await expect(page.locator('[data-testid="toggle-saturday"]')).toBeChecked({ timeout: 5000 });

    // STRICT: Monday and Friday should still be enabled (from first test)
    await expect(page.locator('[data-testid="toggle-monday"]')).toBeChecked({ timeout: 5000 });
    await expect(page.locator('[data-testid="toggle-friday"]')).toBeChecked({ timeout: 5000 });

    console.log('[Test] Day toggles updated and verified successfully');
  });
});

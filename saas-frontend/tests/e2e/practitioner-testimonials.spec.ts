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

/**
 * Practitioner Testimonials Tests
 *
 * Tests the testimonial request and submission flow:
 * 1. Practitioner generates a testimonial request link
 * 2. Public user submits a testimonial via the link
 * 3. Testimonial appears on practitioner's dashboard
 */

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing testimonials test environment...');
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
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe('Practitioner Testimonials', () => {
  let practitionerSetupPage: PractitionerSetupPage;

  test.beforeEach(async ({ page }) => {
    practitionerSetupPage = new PractitionerSetupPage(page);
  });

  test('complete testimonial request and submission flow', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow

    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const testEmail = `testimonial-test-${timestamp}-${workerId}@playwright.com`;

    // === CREATE PRACTITIONER ===
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      'Testimonial Practitioner',
      testInfo,
      'awaken'
    );

    // Store cookies for cleanup
    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // === NAVIGATE TO TESTIMONIALS PAGE ===
    await page.goto(`/p/${practitionerSlug}/manage/testimonials`);
    await expect(page.getByRole('heading', { name: 'Testimonials', exact: true })).toBeVisible({ timeout: 15000 });

    // === REQUEST A TESTIMONIAL ===
    const requestBtn = page.getByTestId('request-testimonial-btn');
    await expect(requestBtn).toBeVisible({ timeout: 10000 });
    await requestBtn.click();

    // Wait for dialog to open
    const dialog = page.getByTestId('request-testimonial-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill optional client info
    await page.getByTestId('client-name-input').fill('Happy Client');
    await page.getByTestId('client-email-input').fill('happyclient@example.com');

    // Generate the link
    const generateBtn = page.getByTestId('generate-link-btn');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Wait for link to be generated
    const generatedLinkInput = page.getByTestId('generated-link-input');
    await expect(generatedLinkInput).toBeVisible({ timeout: 15000 });

    // Get the generated link
    const testimonialLink = await generatedLinkInput.inputValue();
    expect(testimonialLink).toContain('/testimonial/submit?token=');
    console.log(`[Testimonial] Generated link: ${testimonialLink}`);

    // Close the dialog
    await page.getByTestId('done-btn').click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // === NAVIGATE TO PUBLIC SUBMISSION PAGE (in new context to simulate different user) ===
    // Extract the path from the full URL
    const urlObj = new URL(testimonialLink);
    const submissionPath = urlObj.pathname + urlObj.search;

    // Navigate to submission page
    await page.goto(submissionPath);

    // Wait for submission form to load
    await expect(page.getByRole('heading', { name: /Share Your Experience/i })).toBeVisible({ timeout: 15000 });

    // === FILL OUT TESTIMONIAL FORM ===
    // Name should be pre-filled
    const nameInput = page.getByTestId('testimonial-name-input');
    await expect(nameInput).toHaveValue('Happy Client');

    // Select rating (5 stars)
    const star5 = page.getByTestId('rating-star-5');
    await star5.click();

    // Fill headline
    await page.getByTestId('testimonial-headline-input').fill('Absolutely Transformative Experience!');

    // Fill testimonial text
    await page.getByTestId('testimonial-text-input').fill(
      'Working with this practitioner has been an incredible journey. Their insights were spot-on and helped me navigate a difficult period in my life. I highly recommend them to anyone seeking guidance and clarity.'
    );

    // Fill relationship (optional text field)
    await page.getByTestId('testimonial-relationship-input').fill('Repeat Client');

    // Submit the testimonial
    const submitBtn = page.getByTestId('submit-testimonial-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for success message
    await expect(page.getByRole('heading', { name: 'Thank You!' })).toBeVisible({ timeout: 15000 });

    // === VERIFY TESTIMONIAL APPEARS ON PRACTITIONER DASHBOARD ===
    // Go back to practitioner testimonials page
    await page.goto(`/p/${practitionerSlug}/manage/testimonials`);
    await expect(page.getByRole('heading', { name: 'Testimonials', exact: true })).toBeVisible({ timeout: 15000 });

    // Find the submitted testimonial
    await expect(page.getByText('Absolutely Transformative Experience!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Happy Client')).toBeVisible();

    // Verify rating stars are displayed
    const testimonialCard = page.locator('[data-testid^="testimonial-"]').first();
    await expect(testimonialCard).toBeVisible();

    console.log('[Testimonial] Testimonial flow completed successfully');
  });

  test('can delete a testimonial', async ({ page }, testInfo) => {
    test.setTimeout(300000);

    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const testEmail = `testimonial-delete-${timestamp}-${workerId}@playwright.com`;

    // === CREATE PRACTITIONER ===
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      'Delete Test Practitioner',
      testInfo,
      'awaken'
    );

    // Store cookies for cleanup
    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Create a testimonial
    await page.goto(`/p/${practitionerSlug}/manage/testimonials`);
    await expect(page.getByRole('heading', { name: 'Testimonials', exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByTestId('request-testimonial-btn').click();
    await expect(page.getByTestId('request-testimonial-dialog')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('client-name-input').fill('To Delete Client');
    await page.getByTestId('generate-link-btn').click();

    const generatedLinkInput = page.getByTestId('generated-link-input');
    await expect(generatedLinkInput).toBeVisible({ timeout: 15000 });
    const testimonialLink = await generatedLinkInput.inputValue();

    await page.getByTestId('done-btn').click();

    // Submit testimonial
    const urlObj = new URL(testimonialLink);
    await page.goto(urlObj.pathname + urlObj.search);
    await expect(page.getByRole('heading', { name: /Share Your Experience/i })).toBeVisible({ timeout: 15000 });

    await page.getByTestId('rating-star-4').click();
    await page.getByTestId('testimonial-headline-input').fill('Good but needs improvement');
    await page.getByTestId('testimonial-text-input').fill('This is a testimonial that will be deleted.');
    await page.getByTestId('submit-testimonial-btn').click();
    await expect(page.getByRole('heading', { name: 'Thank You!' })).toBeVisible({ timeout: 15000 });

    // Go back to testimonials page
    await page.goto(`/p/${practitionerSlug}/manage/testimonials`);
    await expect(page.getByText('Good but needs improvement')).toBeVisible({ timeout: 15000 });

    // === DELETE THE TESTIMONIAL ===
    const deleteBtn = page.locator('[data-testid^="delete-testimonial-"]').first();
    await deleteBtn.click();

    // Confirm deletion in alert dialog
    await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('confirm-delete-testimonial').click();

    // Wait for the alert dialog to close
    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 5000 });

    // Wait for deletion toast and verify testimonial is gone
    await expect(page.getByText('Testimonial deleted')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Good but needs improvement')).not.toBeVisible({ timeout: 15000 });

    console.log('[Testimonial] Testimonial deleted successfully');
  });
});

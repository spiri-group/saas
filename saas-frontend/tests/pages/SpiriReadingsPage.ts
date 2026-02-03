import { Page, expect } from '@playwright/test';

export class SpiriReadingsPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation
  async goto(merchantSlug: string) {
    await this.page.goto(`/m/${merchantSlug}/manage/spiri-readings`);
  }

  async navigateFromSidenav(merchantSlug: string) {
    // Navigate to SpiriReadings from sidenav - may need to expand "Manage" section first
    const spiriReadingsLink = this.page.locator('a[href*="/manage/spiri-readings"]');

    // Check if link is visible, if not try to expand Manage section
    const isLinkVisible = await spiriReadingsLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isLinkVisible) {
      // Try clicking "Manage" to expand the section
      const manageSection = this.page.locator('button:has-text("Manage"), div:has-text("Manage")').first();
      if (await manageSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        await manageSection.click();
        await this.page.waitForTimeout(500);
      }
    }

    await spiriReadingsLink.waitFor({ state: 'visible', timeout: 10000 });
    await spiriReadingsLink.click();
    await expect(this.page).toHaveURL(new RegExp(`/m/${merchantSlug}/manage/spiri-readings`));
  }

  async waitForPageLoad() {
    await expect(this.page.locator('h1:has-text("SpiriReadings")')).toBeVisible({ timeout: 10000 });
    // Wait for either empty state or requests to load
    const emptyState = this.page.locator('text=No reading requests available');
    const requestBank = this.page.locator('[data-testid="request-bank"]');
    const claimedList = this.page.locator('[data-testid="claimed-requests"]');
    await expect(emptyState.or(requestBank).or(claimedList)).toBeVisible({ timeout: 15000 });
  }

  // Tab navigation
  async clickRequestBankTab() {
    await this.page.locator('button:has-text("Request Bank")').click();
  }

  async clickMyClaimsTab() {
    await this.page.locator('button:has-text("My Claims")').click();
  }

  // Request Bank interactions
  async getAvailableRequestCount(): Promise<number> {
    const requests = this.page.locator('[data-testid^="available-request-"]');
    return await requests.count();
  }

  async claimRequest(requestId: string) {
    await this.page.locator(`[data-testid="claim-request-${requestId}"]`).click();
  }

  async getClaimButtonText(requestId: string): Promise<string | null> {
    return await this.page.locator(`[data-testid="claim-request-${requestId}"]`).textContent();
  }

  async isClaimErrorVisible(): Promise<boolean> {
    return await this.page.locator('text=Claim Failed').isVisible({ timeout: 3000 }).catch(() => false);
  }

  async getClaimErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator('p:has-text("Claim Failed") + p, div:has(p:has-text("Claim Failed")) p:last-child');
    if (await errorElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await errorElement.textContent();
    }
    return null;
  }

  async dismissClaimError() {
    const closeButton = this.page.locator('div:has(p:has-text("Claim Failed")) button');
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
    }
  }

  async isRequestAvailable(topic: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`[data-testid="request-bank"] :text("${topic}")`, {
        state: 'visible',
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  // Claimed Requests interactions
  async getClaimedRequestCount(): Promise<number> {
    const requests = this.page.locator('[data-testid^="claimed-request-"]');
    return await requests.count();
  }

  async releaseRequest(requestId: string) {
    await this.page.locator(`[data-testid="release-request-${requestId}"]`).click();
  }

  async clickFulfillRequest(requestId: string) {
    await this.page.locator(`[data-testid="fulfill-request-${requestId}"]`).click();
  }

  // Fulfillment Dialog
  async waitForFulfillmentDialog() {
    await expect(this.page.locator('[data-testid="fulfillment-dialog"]')).toBeVisible({ timeout: 5000 });
  }

  async uploadSpreadPhoto(_filePath?: string) {
    // Use a valid PNG buffer instead of a file path
    // This is a minimal valid 1x1 red PNG
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    // Listen for network requests and console
    this.page.on('response', async (response) => {
      if (response.url().includes('azure_upload')) {
        console.log(`[SpiriReadingsPage] Azure upload response: ${response.status()} ${response.statusText()}`);
        try {
          const body = await response.json();
          console.log(`[SpiriReadingsPage] Response body: ${JSON.stringify(body)}`);
        } catch {
          console.log(`[SpiriReadingsPage] Could not parse response body`);
        }
      }
    });

    this.page.on('console', msg => {
      const text = msg.text();
      if (text.includes('upload') || text.includes('Upload') || text.includes('error') || text.includes('Error')) {
        console.log(`[Browser] ${msg.type()}: ${text}`);
      }
    });

    // Find the file input inside the FileUploader component
    const fileInput = this.page.locator('input[type="file"][id^="input-file-upload-spread-photo-"]');

    // Upload using buffer approach
    await fileInput.setInputFiles({
      name: 'test-spread-photo.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });
    console.log('[SpiriReadingsPage] File input set, waiting for upload...');

    // Wait for upload to complete - look for the success message
    // The component shows "Photo uploaded successfully" when photoUrl is set
    const successIndicator = this.page.locator('text=Photo uploaded successfully');
    try {
      await successIndicator.waitFor({ state: 'visible', timeout: 60000 });
      console.log('[SpiriReadingsPage] Photo upload completed successfully');
    } catch {
      // If success indicator doesn't appear, the upload may have failed
      console.log('[SpiriReadingsPage] Photo upload may have failed - success indicator not visible');
    }
  }

  // For E2E tests - skip photo upload since it requires real Azure upload
  async skipPhotoUploadForTest() {
    // The E2E test will verify the form validation works without actually uploading
    // Photo is required but we'll test form validation separately
  }

  async setCardName(index: number, name: string) {
    await this.page.locator(`[data-testid="fulfill-card-name-${index}"]`).fill(name);
  }

  async setCardPosition(index: number, position: string) {
    await this.page.locator(`[data-testid="fulfill-card-position-${index}"]`).fill(position);
  }

  async setCardInterpretation(index: number, interpretation: string) {
    await this.page.locator(`[data-testid="fulfill-card-interpretation-${index}"]`).fill(interpretation);
  }

  async toggleCardReversed(index: number) {
    await this.page.locator(`[data-testid="fulfill-card-reversed-${index}"]`).click();
  }

  async setOverallMessage(message: string) {
    await this.page.locator('[data-testid="overall-message-input"]').fill(message);
  }

  async submitFulfillment() {
    await this.page.locator('[data-testid="submit-fulfillment-button"]').click();
  }

  async isSubmitFulfillmentEnabled(): Promise<boolean> {
    return await this.page.locator('[data-testid="submit-fulfillment-button"]').isEnabled();
  }

  async cancelFulfillmentDialog() {
    await this.page.locator('[data-testid="cancel-fulfillment-button"]').click();
  }

  async waitForFulfillmentDialogToClose() {
    await expect(this.page.locator('[data-testid="fulfillment-dialog"]')).not.toBeVisible({ timeout: 5000 });
  }

  // Empty states
  async isRequestBankEmpty(): Promise<boolean> {
    return await this.page.locator('text=No reading requests available').isVisible();
  }

  async isClaimedListEmpty(): Promise<boolean> {
    return await this.page.locator('text=No claimed requests').isVisible();
  }
}

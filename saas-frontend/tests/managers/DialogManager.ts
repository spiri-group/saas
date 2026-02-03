import { Page } from '@playwright/test';

/**
 * DialogManager - Handles dialog, overlay, and modal interactions in e2e tests
 *
 * Consolidates duplicated dialog dismissal and overlay handling logic.
 */

/** Default test PNG image as base64 - 200x200 purple RGBA PNG */
export const DEFAULT_TEST_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAABoklEQVR42u3TMQ0AAAjAMMQhDpNoAQMoID1qYMmisge4hQhgEDAIGAQMAgYBg4BBwCBgEMAgYBAwCBgEDAIGAYOAQcAgYBAhwCBgEDAIGAQMAgYBg4BBwCCAQcAgYBAwCBgEDAIGAYOAQcAgYBAwCBgEDAIGAYOAQcAgYBDAIGAQMAgYBAwCBgGDgEHAIGAQwCBgEDAIGAQMAgYBg4BBwCBgEMAgYBAwCBgEDAIGAYOAQcAgYBDAIGAQMAgYBAwCBgGDgEHAIIBBwCBgEDAIGAQMAgYBg4BBwCAigEHAIGAQMAgYBAwCBgGDgEEAg4BBwCBgEDAIGAQMAgYBg4BBhACDgEHAIGAQMAgYBAwCBgGDAAYBg4BBwCBgEDAIGAQMAgYBgwAGAYOAQcAgYBAwCBgEDAIGAQwCBgGDgEHAIGAQMAgYBAwCBgEMAgYBg4BBwCBgEDAIGAQMAgYBDAIGAYOAQcAgYBAwCBgEDAIGAYOIAAYBg4BBwCBgEDAIGAQMAgYBDAIGAYOAQcAgYBAwCBgEDAIGEQIMAgYBg4BBwCBgEDAIfLQgKCciUlZevwAAAABJRU5ErkJggg==';

export class DialogManager {
  constructor(private page: Page) {}

  /**
   * Wait for any dialog overlay to close
   */
  async waitForDialogOverlayToClose(timeout: number = 10000): Promise<void> {
    const overlay = this.page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
    try {
      await overlay.waitFor({ state: 'hidden', timeout });
    } catch {
      // No overlay present or already closed
    }
  }

  /**
   * Wait for a specific dialog to close
   */
  async waitForDialogToClose(timeout: number = 15000): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]:not([aria-hidden="true"])');
    try {
      await dialog.waitFor({ state: 'hidden', timeout });
    } catch {
      // Dialog already closed
    }
  }

  /**
   * Dismiss the welcome dialog that appears on practitioner dashboard
   */
  async dismissWelcomeDialog(): Promise<void> {
    try {
      await this.page.waitForTimeout(2000);

      // Look for common welcome dialog buttons
      const welcomeButton = this.page.locator('button:has-text("Customise your profile")');
      if (await welcomeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await welcomeButton.click();
        await this.page.waitForTimeout(1000);
      }

      // Try to close any visible dialog
      const closeButton = this.page.locator('[role="dialog"]:visible button:has-text("Close")');
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
      }

      await this.waitForDialogOverlayToClose();
    } catch {
      // Dialog didn't appear - that's fine
    }
  }

  /**
   * Close any currently open dialog
   */
  async closeAnyOpenDialog(): Promise<void> {
    const closeSelectors = [
      '[role="dialog"]:visible button[aria-label="Close"]',
      '[role="dialog"]:visible button:has-text("Close")',
      '[role="dialog"]:visible [data-testid="close-btn"]',
      'button[aria-label="Close dialog"]',
    ];

    for (const selector of closeSelectors) {
      const closeBtn = this.page.locator(selector).first();
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
        await this.waitForDialogOverlayToClose();
        return;
      }
    }
  }

  /**
   * Scroll to and click an element that may be off-screen
   * Uses JavaScript to ensure the element is visible before clicking
   */
  async scrollAndClick(selector: string): Promise<void> {
    const element = this.page.locator(selector).first();

    await element.evaluate((el) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await this.page.waitForTimeout(500);
    await element.click();
  }

  /**
   * Upload a test thumbnail image to a file input
   *
   * @param selector - CSS selector for the file input (default: 'input[type="file"]')
   * @param imagePath - Path to image file, or undefined to use default test PNG
   */
  async uploadThumbnail(
    selector: string = 'input[type="file"]',
    imagePath?: string
  ): Promise<void> {
    const fileInput = this.page.locator(selector).first();

    if (imagePath) {
      // Use provided image file
      await fileInput.setInputFiles(imagePath);
    } else {
      // Use default test PNG buffer
      const pngBuffer = Buffer.from(DEFAULT_TEST_PNG_BASE64, 'base64');
      await fileInput.setInputFiles({
        name: 'test-thumbnail.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });
    }

    // Wait for upload to process
    await this.page.waitForTimeout(6000);
    console.log('[DialogManager] Thumbnail uploaded');
  }

  /**
   * Upload a test file (generic)
   */
  async uploadFile(
    selector: string,
    content: string | Buffer,
    filename: string,
    mimeType: string = 'text/plain'
  ): Promise<void> {
    const fileInput = this.page.locator(selector).first();
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;

    await fileInput.setInputFiles({
      name: filename,
      mimeType,
      buffer,
    });

    await this.page.waitForTimeout(3000);
    console.log(`[DialogManager] File "${filename}" uploaded`);
  }

  /**
   * Wait for and click a button in a wizard dialog
   */
  async clickWizardNext(): Promise<void> {
    const nextBtn = this.page.locator('[data-testid="wizard-next-btn"]');
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for and click the submit button in a wizard dialog
   */
  async clickWizardSubmit(): Promise<void> {
    const submitBtn = this.page.locator('[data-testid="wizard-submit-btn"]');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if a dialog with specific text is visible
   */
  async isDialogVisible(containsText?: string): Promise<boolean> {
    if (containsText) {
      return await this.page
        .locator(`[role="dialog"]:has-text("${containsText}")`)
        .isVisible()
        .catch(() => false);
    }
    return await this.page
      .locator('[role="dialog"]:not([aria-hidden="true"])')
      .isVisible()
      .catch(() => false);
  }

  /**
   * Get the visible dialog element
   */
  getVisibleDialog() {
    return this.page.locator('[role="dialog"]:not([aria-hidden="true"])');
  }
}

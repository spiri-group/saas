import { Page, expect } from '@playwright/test';
import { DialogManager, DEFAULT_TEST_PNG_BASE64 } from './DialogManager';
import path from 'path';

/**
 * ServiceManager - Handles reading/service creation in e2e tests
 *
 * Consolidates the duplicated service creation wizard logic.
 */

/** Default test image path - uses a real PNG from the public folder (smaller image) */
const DEFAULT_TEST_IMAGE_PATH = path.join(__dirname, '../../public/pdf_background_v2.png');

export interface ServiceDetails {
  name: string;
  description: string;
  price: string;
  turnaroundDays?: string;
  readingType?: 'TAROT' | 'ASTROLOGY' | 'MEDIUMSHIP' | 'ORACLE' | 'OTHER';
  /** Path to image file for thumbnail, or undefined to use default */
  thumbnailPath?: string;
  /** Pre-reading questions to add */
  questions?: string[];
}

export interface AstrologyServiceDetails extends ServiceDetails {
  astrologyType?: 'birth_chart' | 'transit' | 'synastry' | 'solar_return';
  houseSystem?: 'placidus' | 'whole_sign' | 'equal' | 'koch';
  requiresBirthTime?: boolean;
}

export interface CreatedService {
  slug: string;
  name: string;
}

export class ServiceManager {
  private dialogManager: DialogManager;

  constructor(private page: Page) {
    this.dialogManager = new DialogManager(page);
  }

  /**
   * Open the "New Reading" wizard from the practitioner dashboard
   */
  async openNewReadingWizard(): Promise<void> {
    await this.dialogManager.waitForDialogOverlayToClose();

    // Dismiss cookie banner if present (it can intercept clicks)
    const cookieBanner = this.page.getByTestId('cookie-banner');
    if (await cookieBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      const acceptBtn = this.page.getByTestId('cookie-accept-btn');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await acceptBtn.click();
        await this.page.waitForTimeout(500);
      }
    }

    // Try sidenav "Services" menu first (opens dropdown with "New Reading")
    const servicesNav = this.page.getByTestId('nav-services');
    if (await servicesNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await servicesNav.click();
      await this.page.waitForTimeout(1500);

      const newReadingMenuItem = this.page.locator('[role="menuitem"]').filter({ hasText: 'New Reading' }).first();
      if (await newReadingMenuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newReadingMenuItem.click();
        await this.page.waitForTimeout(3000);
      }
    }

    // Check if dialog appeared
    const dialogCheck = this.page.locator('[role="dialog"]:not([aria-hidden="true"])');
    if (await dialogCheck.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[ServiceManager] New Reading wizard opened via sidenav');
      await this.page.waitForTimeout(1000);
      return;
    }

    // Fallback: "New Reading" button on dashboard main content
    console.log('[ServiceManager] Dialog not found via sidenav, trying dashboard button...');
    const newReadingButton = this.page.locator('button:has-text("New Reading")').first();
    await newReadingButton.waitFor({ state: 'visible', timeout: 5000 });
    await newReadingButton.click();
    await this.page.waitForTimeout(3000);

    // Second fallback: Try clicking the "Create your first service" button from Getting Started
    if (!(await dialogCheck.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[ServiceManager] Dashboard button did not open dialog, trying Getting Started...');
      const createFirstService = this.page.locator('button:has-text("Create your first service")');
      if (await createFirstService.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createFirstService.click();
        await this.page.waitForTimeout(3000);
      }
    }

    // Wait for wizard dialog
    const dialog = this.page.locator('[role="dialog"]:not([aria-hidden="true"])');
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await this.page.waitForTimeout(1000);

    console.log('[ServiceManager] New Reading wizard opened');
  }

  /**
   * Fill step 1 of the service wizard (Basic Info)
   */
  async fillBasicInfo(details: ServiceDetails): Promise<void> {
    const dialog = this.dialogManager.getVisibleDialog();

    // Fill name
    const nameInput = dialog.locator('input[name="name"]');
    await nameInput.fill(details.name);

    // Fill description
    const descriptionInput = dialog.locator('textarea[name="description"]');
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.fill(details.description);
    }

    // Select reading type if specified
    if (details.readingType) {
      const readingTypeDropdown = dialog
        .locator('[data-slot="select-trigger"]')
        .or(dialog.locator('button[role="combobox"]'))
        .first();
      if (await readingTypeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await readingTypeDropdown.click();
        await this.page.waitForTimeout(1000);
        const option = this.page.locator(`[role="option"]:has-text("${details.readingType}")`).first();
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.click();
          await this.page.waitForTimeout(500);
        }
      }
    }

    // Fill price
    const priceInput = dialog.locator('input[name="price"]');
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill(details.price);
    }

    // Fill turnaround days
    if (details.turnaroundDays) {
      const turnaroundInput = dialog.locator('input[name="turnaroundDays"]');
      if (await turnaroundInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await turnaroundInput.fill(details.turnaroundDays);
      }
    }

    console.log('[ServiceManager] Basic info filled');
  }

  /**
   * Fill astrology-specific details in step 2
   */
  async fillAstrologyDetails(details: AstrologyServiceDetails): Promise<void> {
    const dialog = this.dialogManager.getVisibleDialog();

    // Select astrology type
    if (details.astrologyType) {
      const typeOption = dialog.locator(`[data-testid="astrology-type-${details.astrologyType}"]`);
      if (await typeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeOption.click();
        console.log(`[ServiceManager] Selected astrology type: ${details.astrologyType}`);
      }
    }

    // Select house system
    if (details.houseSystem) {
      const houseSystemDropdown = dialog.locator('[data-testid="house-system-select"]');
      if (await houseSystemDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await houseSystemDropdown.click();
        await this.page.waitForTimeout(500);
        const option = this.page.locator(`[role="option"]:has-text("${details.houseSystem}")`).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          console.log(`[ServiceManager] Selected house system: ${details.houseSystem}`);
        }
      }
    }

    // Toggle requires birth time
    if (details.requiresBirthTime) {
      const checkbox = dialog.locator('[data-testid="requires-birth-time-checkbox"]');
      if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkbox.click();
        console.log('[ServiceManager] Checked requires birth time');
      }
    }
  }

  /**
   * Upload thumbnail in step 3
   */
  async uploadThumbnail(imagePath?: string): Promise<void> {
    const dialog = this.dialogManager.getVisibleDialog();
    const fileInput = dialog.locator('input[type="file"][accept="image/*"]').first();

    // Use the provided path, or fall back to the default real image file
    const pathToUse = imagePath || DEFAULT_TEST_IMAGE_PATH;
    console.log('[ServiceManager] Uploading thumbnail from:', pathToUse);
    await fileInput.setInputFiles(pathToUse);

    // Wait for upload to process
    await this.page.waitForTimeout(8000);

    // Click "Looks Good" if it appears (image cropper dialog)
    const looksGoodBtn = dialog.locator('button:has-text("Looks Good")');
    if (await looksGoodBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await looksGoodBtn.click();
      await this.page.waitForTimeout(2000);
    }

    // Wait for the Next button to become enabled (indicates upload complete)
    const nextBtn = this.page.locator('[data-testid="wizard-next-btn"]');
    try {
      await expect(nextBtn).toBeEnabled({ timeout: 15000 });
      console.log('[ServiceManager] Thumbnail uploaded successfully');
    } catch {
      console.log('[ServiceManager] Warning: Next button not enabled after upload');
      // Continue anyway - the caller will handle the failure
    }
  }

  /**
   * Add pre-reading questions in step 4
   */
  async addQuestions(questions: string[]): Promise<void> {
    const dialog = this.dialogManager.getVisibleDialog();

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // For the first question, look for "Add Your First Question" button
      // For subsequent questions, look for "Add Question" button
      if (i === 0) {
        const addFirstQuestionBtn = dialog.locator('button:has-text("Add Your First Question")');
        if (await addFirstQuestionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addFirstQuestionBtn.click();
          await this.page.waitForTimeout(500);
        }
      } else {
        const addQuestionBtn = dialog.locator('button:has-text("Add Question")').first();
        if (await addQuestionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addQuestionBtn.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Use the data-testid to find the question text input for this specific question
      const questionInput = dialog.locator(`[data-testid="question-text-input-${i}"]`);
      if (await questionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await questionInput.fill(question);
        await this.page.waitForTimeout(300);
      } else {
        console.log(`[ServiceManager] Question input ${i} not found, trying fallback selector`);
        // Fallback to placeholder-based selector
        const fallbackInput = dialog.locator('input[placeholder*="area of life"], input[placeholder*="question"]').nth(i);
        if (await fallbackInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await fallbackInput.fill(question);
        }
      }
    }

    console.log(`[ServiceManager] Added ${questions.length} questions`);
  }

  /**
   * Create a basic reading service through the full wizard
   */
  async createReadingService(details: ServiceDetails): Promise<CreatedService> {
    await this.openNewReadingWizard();

    // Step 1: Basic Info
    await this.fillBasicInfo(details);
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 1 complete');

    // Step 2: Details (just click next for basic readings)
    await this.page.waitForTimeout(500);
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 2 complete');

    // Step 3: Thumbnail
    await this.uploadThumbnail(details.thumbnailPath);
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 3 complete');

    // Step 4: Questions (optional)
    if (details.questions && details.questions.length > 0) {
      await this.addQuestions(details.questions);
    }

    // Submit
    await this.dialogManager.clickWizardSubmit();
    await this.dialogManager.waitForDialogToClose();

    const slug = details.name.toLowerCase().replace(/\s+/g, '-');
    console.log(`[ServiceManager] Service "${details.name}" created`);

    return { slug, name: details.name };
  }

  /**
   * Create an astrology reading service with specialized options
   */
  async createAstrologyService(details: AstrologyServiceDetails): Promise<CreatedService> {
    await this.openNewReadingWizard();

    // Step 1: Basic Info (with Astrology type)
    await this.fillBasicInfo({ ...details, readingType: 'ASTROLOGY' });
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 1 complete');

    // Step 2: Astrology Details
    await this.page.waitForTimeout(500);
    await this.fillAstrologyDetails(details);
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 2 complete');

    // Step 3: Thumbnail
    await this.uploadThumbnail(details.thumbnailPath);
    await this.dialogManager.clickWizardNext();
    console.log('[ServiceManager] Step 3 complete');

    // Step 4: Questions (optional)
    if (details.questions && details.questions.length > 0) {
      await this.addQuestions(details.questions);
    }

    // Submit
    await this.dialogManager.clickWizardSubmit();
    await this.dialogManager.waitForDialogToClose();

    const slug = details.name.toLowerCase().replace(/\s+/g, '-');
    console.log(`[ServiceManager] Astrology service "${details.name}" created`);

    return { slug, name: details.name };
  }

  /**
   * Navigate to a service detail page from practitioner profile
   */
  async navigateToService(practitionerSlug: string, serviceName: string): Promise<void> {
    await this.page.goto(`/p/${practitionerSlug}`);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    const serviceCard = this.page
      .locator(`a[aria-label^="catalogue-item"]:has-text("${serviceName}")`)
      .first();
    await expect(serviceCard).toBeVisible({ timeout: 15000 });
    await serviceCard.click();
    await this.page.waitForURL(/\/services\//, { timeout: 15000 });

    console.log(`[ServiceManager] Navigated to service: ${serviceName}`);
  }

  /**
   * Verify a service appears on the practitioner's public profile
   */
  async verifyServiceOnProfile(practitionerSlug: string, serviceName: string): Promise<void> {
    await this.page.goto(`/p/${practitionerSlug}`);
    await this.page.waitForLoadState('networkidle');

    const serviceCard = this.page.locator(`text=${serviceName}`).first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });

    console.log(`[ServiceManager] Verified service "${serviceName}" on profile`);
  }
}

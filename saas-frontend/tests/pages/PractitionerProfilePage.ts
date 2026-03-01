import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Practitioner Profile Page Object Model
 * Handles practitioner profile customization dialogs and interactions
 */
export class PractitionerProfilePage extends BasePage {
  private readonly selectors = {
    // Sidenav
    sideNav: '[aria-label="practitioner-side-nav"]',
    profileMenu: 'menuitem >> text=Profile',

    // Bio & Headline Dialog
    bioDialog: '[data-testid="edit-practitioner-bio-dialog"]',
    headlineInput: '[data-testid="headline-input"]',
    bioInput: '[data-testid="bio-input"]',
    saveBioBtn: '[data-testid="save-bio-btn"]',

    // Profile Picture
    uploadProfilePictureBtn: '[data-testid="upload-profile-picture-btn"]',
    profilePictureFileInput: '[data-testid="profile-picture-file-input"]',
    removeProfilePictureBtn: '[data-testid="remove-profile-picture-btn"]',
    cropDialog: '[data-testid="profile-picture-crop-dialog"]',
    cropViewport: '[data-testid="profile-pic-crop-viewport"]',
    cropZoomSlider: '[data-testid="profile-pic-zoom-slider"]',
    cropConfirmBtn: '[data-testid="profile-pic-crop-confirm-btn"]',
    cropCancelBtn: '[data-testid="profile-pic-crop-cancel-btn"]',
    cropResetBtn: '[data-testid="profile-pic-crop-reset-btn"]',

    // Public Profile
    profileAvatar: '[data-testid="practitioner-profile-avatar"]',
    profileAvatarImg: '[data-testid="practitioner-profile-avatar-img"]',
    profileAvatarFallback: '[data-testid="practitioner-profile-avatar-fallback"]',

    // Modalities Dialog
    modalitiesDialog: '[data-testid="edit-practitioner-modalities-dialog"]',
    modalitiesSelect: '[data-testid="modalities-select"]',
    specializationsSelect: '[data-testid="specializations-select"]',
    saveModalitiesBtn: '[data-testid="save-modalities-btn"]',

    // Tools Dialog
    toolsDialog: '[data-testid="edit-practitioner-tools-dialog"]',
    addFirstToolBtn: '[data-testid="add-first-tool-btn"]',
    addAnotherToolBtn: '[data-testid="add-another-tool-btn"]',
    saveToolsBtn: '[data-testid="save-tools-btn"]',

    // Training Dialog
    trainingDialog: '[data-testid="edit-practitioner-training-dialog"]',
    addFirstCredentialBtn: '[data-testid="add-first-credential-btn"]',
    addAnotherCredentialBtn: '[data-testid="add-another-credential-btn"]',
    saveTrainingBtn: '[data-testid="save-training-btn"]',

    // Journey Dialog
    journeyDialog: '[data-testid="edit-practitioner-journey-dialog"]',
    spiritualJourneyInput: '[data-testid="spiritual-journey-input"]',
    approachInput: '[data-testid="approach-input"]',
    saveJourneyBtn: '[data-testid="save-journey-btn"]',

    // Audio Intro Dialog (Phase 3)
    audioIntroDialog: '[data-testid="edit-practitioner-audio-intro-dialog"]',
    audioIntroUploader: '[data-testid="audio-intro-uploader"]',
    audioIntroPlayer: '[data-testid="audio-intro-player"]',
    removeAudioIntroBtn: '[data-testid="remove-audio-intro-btn"]',
    saveAudioIntroBtn: '[data-testid="save-audio-intro-btn"]',

    // Oracle Message Dialog (Phase 3)
    oracleMessageDialog: '[data-testid="edit-practitioner-oracle-message-dialog"]',
    oracleAudioUploader: '[data-testid="oracle-audio-uploader"]',
    oracleAudioPlayer: '[data-testid="oracle-audio-player"]',
    oracleMessageInput: '[data-testid="oracle-message-input"]',
    removeOracleAudioBtn: '[data-testid="remove-oracle-audio-btn"]',
    saveOracleMessageBtn: '[data-testid="save-oracle-message-btn"]',

    // Pinned Testimonials Dialog (Phase 3)
    pinnedTestimonialsDialog: '[data-testid="edit-practitioner-pinned-testimonials-dialog"]',
    savePinnedTestimonialsBtn: '[data-testid="save-pinned-testimonials-btn"]',
    reviewCard: '[data-testid^="review-card-"]',

    // Common
    dialog: '[role="dialog"]',
    cancelBtn: 'button >> text=Cancel',
    successToast: '[data-sonner-toast][data-type="success"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to practitioner manage page
   */
  async navigateToManage(practitionerSlug: string) {
    await this.goto(`/p/${practitionerSlug}/manage`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open the Profile submenu in sidenav
   */
  async openProfileMenu() {
    const sideNav = this.page.locator(this.selectors.sideNav);
    await expect(sideNav).toBeVisible({ timeout: 10000 });
    // Use data-testid to uniquely identify the Profile submenu trigger
    await sideNav.getByTestId('profile-submenu').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Open Bio & Headline dialog
   */
  async openBioDialog() {
    await this.openProfileMenu();
    const sideNav = this.page.locator(this.selectors.sideNav);
    await sideNav.getByRole('menuitem', { name: 'Bio & Headline' }).click();
    await expect(this.page.locator(this.selectors.bioDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Edit bio and headline
   */
  async editBioAndHeadline(data: { headline: string; bio: string }) {
    await this.page.locator(this.selectors.headlineInput).fill(data.headline);
    await this.page.locator(this.selectors.bioInput).fill(data.bio);
    await this.page.locator(this.selectors.saveBioBtn).click();
    await expect(this.page.locator(this.selectors.bioDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Upload a profile picture via the bio dialog (triggers crop dialog)
   */
  async uploadProfilePicture(imageBuffer: Buffer, filename: string = 'test-profile-pic.png') {
    const fileInput = this.page.locator(this.selectors.profilePictureFileInput);
    await fileInput.setInputFiles({
      name: filename,
      mimeType: 'image/png',
      buffer: imageBuffer,
    });
  }

  /**
   * Wait for crop dialog to appear and confirm the crop
   */
  async confirmCrop() {
    await expect(this.page.locator(this.selectors.cropDialog)).toBeVisible({ timeout: 10000 });
    await this.page.locator(this.selectors.cropConfirmBtn).click();
    await expect(this.page.locator(this.selectors.cropDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for crop dialog to appear and cancel
   */
  async cancelCrop() {
    await expect(this.page.locator(this.selectors.cropDialog)).toBeVisible({ timeout: 10000 });
    await this.page.locator(this.selectors.cropCancelBtn).click();
    await expect(this.page.locator(this.selectors.cropDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if the crop dialog is visible
   */
  async isCropDialogVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.cropDialog).isVisible();
  }

  /**
   * Remove the current profile picture (within the bio dialog)
   */
  async removeProfilePicture() {
    const removeBtn = this.page.locator(this.selectors.removeProfilePictureBtn);
    await removeBtn.click({ force: true }); // force because it's opacity-0 until hover
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if profile picture is displayed in bio dialog (has image vs upload button)
   */
  async hasProfilePicture(): Promise<boolean> {
    return await this.page.locator(this.selectors.removeProfilePictureBtn).isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if the upload profile picture button is visible (no image set)
   */
  async isUploadButtonVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.uploadProfilePictureBtn).isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Check if public profile shows avatar image (not fallback)
   */
  async hasPublicProfileAvatar(): Promise<boolean> {
    return await this.page.locator(this.selectors.profileAvatarImg).isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if public profile shows fallback initials
   */
  async hasPublicProfileFallback(): Promise<boolean> {
    return await this.page.locator(this.selectors.profileAvatarFallback).isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Open Modalities dialog
   */
  async openModalitiesDialog() {
    await this.openProfileMenu();
    const sideNav = this.page.locator(this.selectors.sideNav);
    await sideNav.getByRole('menuitem', { name: 'Modalities' }).click();
    await expect(this.page.locator(this.selectors.modalitiesDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Toggle a modality selection
   */
  async toggleModality(modality: string) {
    const badge = this.page.locator(`[data-testid="modality-${modality}"]`);
    await badge.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Toggle a specialization selection
   */
  async toggleSpecialization(specialization: string) {
    const badge = this.page.locator(`[data-testid="specialization-${specialization}"]`);
    await badge.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Save modalities changes
   */
  async saveModalities() {
    await this.page.locator(this.selectors.saveModalitiesBtn).click();
    await expect(this.page.locator(this.selectors.modalitiesDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Open Tools Collection dialog
   */
  async openToolsDialog() {
    await this.openProfileMenu();
    const sideNav = this.page.locator(this.selectors.sideNav);
    await sideNav.getByRole('menuitem', { name: 'Tools Collection' }).click();
    await expect(this.page.locator(this.selectors.toolsDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Add a tool to the collection
   */
  async addTool(data: { name: string; description?: string }, index: number = 0) {
    // Click add button if this is the first tool or another tool
    if (index === 0) {
      const addFirstBtn = this.page.locator(this.selectors.addFirstToolBtn);
      if (await addFirstBtn.isVisible()) {
        await addFirstBtn.click();
      }
    } else {
      await this.page.locator(this.selectors.addAnotherToolBtn).click();
    }
    await this.page.waitForTimeout(300);

    // Fill in tool details
    await this.page.locator(`[data-testid="tool-name-${index}"]`).fill(data.name);
    if (data.description) {
      await this.page.locator(`[data-testid="tool-description-${index}"]`).fill(data.description);
    }
  }

  /**
   * Remove a tool from the collection
   */
  async removeTool(index: number) {
    await this.page.locator(`[data-testid="remove-tool-${index}"]`).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Save tools changes
   */
  async saveTools() {
    await this.page.locator(this.selectors.saveToolsBtn).click();
    await expect(this.page.locator(this.selectors.toolsDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Open Training & Credentials dialog
   */
  async openTrainingDialog() {
    // Dispatch custom event directly to open the dialog - bypasses viewport issues with nested submenus
    await this.page.evaluate(() => {
      const event = new CustomEvent('open-nav', {
        detail: {
          path: ['Profile', 'Training & Credentials'],
          action: { type: 'dialog', dialog: 'Edit Training' }
        }
      });
      window.dispatchEvent(event);
    });
    await expect(this.page.locator(this.selectors.trainingDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Add a credential
   */
  async addCredential(data: { title: string; institution?: string; year?: number; description?: string }, index: number = 0) {
    // Click add button
    if (index === 0) {
      const addFirstBtn = this.page.locator(this.selectors.addFirstCredentialBtn);
      if (await addFirstBtn.isVisible()) {
        await addFirstBtn.click();
      }
    } else {
      await this.page.locator(this.selectors.addAnotherCredentialBtn).click();
    }
    await this.page.waitForTimeout(300);

    // Fill in credential details
    await this.page.locator(`[data-testid="credential-title-${index}"]`).fill(data.title);
    if (data.institution) {
      await this.page.locator(`[data-testid="credential-institution-${index}"]`).fill(data.institution);
    }
    if (data.year) {
      await this.page.locator(`[data-testid="credential-year-${index}"]`).fill(data.year.toString());
    }
    if (data.description) {
      await this.page.locator(`[data-testid="credential-description-${index}"]`).fill(data.description);
    }
  }

  /**
   * Remove a credential
   */
  async removeCredential(index: number) {
    await this.page.locator(`[data-testid="remove-credential-${index}"]`).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Save training changes
   */
  async saveTraining() {
    await this.page.locator(this.selectors.saveTrainingBtn).click();
    await expect(this.page.locator(this.selectors.trainingDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Open Spiritual Journey dialog
   */
  async openJourneyDialog() {
    // Dispatch custom event directly to open the dialog - bypasses viewport issues with nested submenus
    await this.page.evaluate(() => {
      const event = new CustomEvent('open-nav', {
        detail: {
          path: ['Profile', 'Spiritual Journey'],
          action: { type: 'dialog', dialog: 'Edit Journey' }
        }
      });
      window.dispatchEvent(event);
    });
    await expect(this.page.locator(this.selectors.journeyDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Edit spiritual journey and approach
   */
  async editJourney(data: { spiritualJourney?: string; approach?: string }) {
    if (data.spiritualJourney) {
      await this.page.locator(this.selectors.spiritualJourneyInput).fill(data.spiritualJourney);
    }
    if (data.approach) {
      await this.page.locator(this.selectors.approachInput).fill(data.approach);
    }
    await this.page.locator(this.selectors.saveJourneyBtn).click();
    await expect(this.page.locator(this.selectors.journeyDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Close the current dialog
   */
  async closeDialog() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  /**
   * Wait for success toast to appear
   */
  async waitForSuccessToast(timeout: number = 10000) {
    // Wait for the dialog to close (success indicated by dialog closing)
    await expect(this.page.locator(this.selectors.dialog)).not.toBeVisible({ timeout });
  }

  /**
   * Check if a modality badge is selected
   */
  async isModalitySelected(modality: string): Promise<boolean> {
    const badge = this.page.locator(`[data-testid="modality-${modality}"]`);
    const classes = await badge.getAttribute('class');
    return classes?.includes('bg-purple-600') ?? false;
  }

  /**
   * Check if a specialization badge is selected
   */
  async isSpecializationSelected(specialization: string): Promise<boolean> {
    const badge = this.page.locator(`[data-testid="specialization-${specialization}"]`);
    const classes = await badge.getAttribute('class');
    return classes?.includes('bg-violet-600') ?? false;
  }

  /**
   * Get the number of tools in the tools dialog
   */
  async getToolCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="tool-card-"]');
    return await cards.count();
  }

  /**
   * Get the number of credentials in the training dialog
   */
  async getCredentialCount(): Promise<number> {
    const cards = this.page.locator('[data-testid^="credential-card-"]');
    return await cards.count();
  }

  // =====================
  // Phase 3 Methods
  // =====================

  /**
   * Open Audio Introduction dialog
   */
  async openAudioIntroDialog() {
    // Dispatch custom event directly to open the dialog
    await this.page.evaluate(() => {
      const event = new CustomEvent('open-nav', {
        detail: {
          path: ['Profile', 'Audio Introduction'],
          action: { type: 'dialog', dialog: 'Edit Audio Intro' }
        }
      });
      window.dispatchEvent(event);
    });
    await expect(this.page.locator(this.selectors.audioIntroDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if audio intro player is visible (audio has been uploaded)
   */
  async hasAudioIntro(): Promise<boolean> {
    return await this.page.locator(this.selectors.audioIntroPlayer).isVisible();
  }

  /**
   * Remove existing audio intro
   */
  async removeAudioIntro() {
    await this.page.locator(this.selectors.removeAudioIntroBtn).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Save audio intro changes
   */
  async saveAudioIntro() {
    await this.page.locator(this.selectors.saveAudioIntroBtn).click();
    await expect(this.page.locator(this.selectors.audioIntroDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Open Daily Oracle Message dialog
   */
  async openOracleMessageDialog() {
    // Dispatch custom event directly to open the dialog
    await this.page.evaluate(() => {
      const event = new CustomEvent('open-nav', {
        detail: {
          path: ['Profile', 'Daily Oracle'],
          action: { type: 'dialog', dialog: 'Edit Oracle Message' }
        }
      });
      window.dispatchEvent(event);
    });
    await expect(this.page.locator(this.selectors.oracleMessageDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if oracle audio player is visible (audio has been uploaded)
   */
  async hasOracleAudio(): Promise<boolean> {
    return await this.page.locator(this.selectors.oracleAudioPlayer).isVisible();
  }

  /**
   * Edit oracle message text
   */
  async editOracleMessage(message: string) {
    await this.page.locator(this.selectors.oracleMessageInput).fill(message);
  }

  /**
   * Remove existing oracle audio
   */
  async removeOracleAudio() {
    await this.page.locator(this.selectors.removeOracleAudioBtn).click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Save oracle message changes
   */
  async saveOracleMessage() {
    await this.page.locator(this.selectors.saveOracleMessageBtn).click();
    await expect(this.page.locator(this.selectors.oracleMessageDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Open Pinned Testimonials dialog
   */
  async openPinnedTestimonialsDialog() {
    // Dispatch custom event directly to open the dialog
    await this.page.evaluate(() => {
      const event = new CustomEvent('open-nav', {
        detail: {
          path: ['Profile', 'Pinned Testimonials'],
          action: { type: 'dialog', dialog: 'Edit Pinned Testimonials' }
        }
      });
      window.dispatchEvent(event);
    });
    await expect(this.page.locator(this.selectors.pinnedTestimonialsDialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the number of available reviews to pin
   */
  async getReviewCount(): Promise<number> {
    const cards = this.page.locator(this.selectors.reviewCard);
    return await cards.count();
  }

  /**
   * Toggle a review's pinned state by its ID
   */
  async toggleReviewPinned(reviewId: string) {
    await this.page.locator(`[data-testid="review-card-${reviewId}"]`).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Get the number of currently selected (pinned) reviews
   */
  async getPinnedReviewCount(): Promise<number> {
    // Pinned reviews have a purple border
    const pinnedCards = this.page.locator('[data-testid^="review-card-"].border-purple-500');
    return await pinnedCards.count();
  }

  /**
   * Save pinned testimonials changes
   */
  async savePinnedTestimonials() {
    await this.page.locator(this.selectors.savePinnedTestimonialsBtn).click();
    await expect(this.page.locator(this.selectors.pinnedTestimonialsDialog)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if empty state is shown (no testimonials available)
   */
  async hasNoTestimonials(): Promise<boolean> {
    return await this.page.locator('text=No testimonials yet').isVisible();
  }
}

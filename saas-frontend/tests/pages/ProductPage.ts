import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Product Page Object Model
 * Handles product creation, viewing, and interactions
 */
export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  private selectors = {
    // Sidebar navigation
    sideNav: '[aria-label="merchant-side-nav"]',
    catalogueMenuItem: 'button[aria-label="Catalogue"]',
    newProductMenuItem: 'button[aria-label="New Product"]',

    // Product creation dialog
    createProductButton: 'button:has-text("Create Product")',
    dialogContent: '[role="dialog"]',

    // Step indicators
    stepProductDetails: 'text=Product Details',
    stepProperties: 'text=Properties',
    stepVariants: 'text=Variants',

    // Step 1: Product Details
    nameInput: 'input[name="name"]',
    categoryPicker: '[data-testid="category-picker"]',
    categoryTree: '[data-testid="category-tree"]',
    locationPicker: '[aria-label="locations-picker"]',
    refundPolicyPicker: '[aria-label="Refund Policy-picker"]',
    noRefundsCheckbox: '#no-refunds-checkbox',
    refundWithoutReturnSelect: 'select[name="refundRules.refundWithoutReturn"]',
    refundTimingSelect: 'select[name="refundRules.refundTiming"]',
    thumbnailInput: '[data-testid="thumbnail-input"]',

    // Step 2: Pricing Strategy
    pricingStrategySelect: 'select[name="pricingStrategy"]',
    volumeOption: '[value="volume"]',
    unitProfitOption: '[value="unit-profit"]',
    inventoryOption: '[value="inventory"]',
    premiumOption: '[value="premium"]',
    riskAverseOption: '[value="risk-averse"]',

    // Product Properties
    addPropertyButton: 'button:has-text("Add Property")',
    propertyNameInput: 'input[placeholder="Property name"]',
    propertyTypeSelect: 'select[name="propertyType"]',

    // Step 3: Variants
    variantNameInput: 'input[name="variants.0.name"]',
    variantCodeInput: 'input[name="variants.0.code"]',
    landedCostInput: 'input[name="variants.0.landedCost.amount"]',
    quantityInput: 'input[name="variants.0.qty_soh"]',
    addVariantButton: 'button:has-text("Add Variant")',

    // Navigation
    nextButton: 'button:has-text("Next")',
    previousButton: 'button:has-text("Previous")',
    listProductButton: 'button:has-text("List Product")',
    closeButton: 'button:has-text("Close")',

    // Success state
    successMessage: 'text=Product listed successfully',
    viewProductLink: 'a:has-text("View Product")',

    // Product detail page
    productTitle: '[data-testid="product-title"]',
    productPrice: '[data-testid="product-price"]',
    variantSelector: '[data-testid="variant-selector"]',
    quantityField: '[data-testid="quantity-input"]',
    addToCartButton: 'button:has-text("Add to Cart")',
  };

  /**
   * Navigate to merchant dashboard
   */
  async navigateToMerchantDashboard(merchantSlug: string) {
    await this.goto(`/m/${merchantSlug}`);
  }

  /**
   * Open the create product dialog via sidebar navigation
   * 1. Close any open dialogs (e.g., welcome dialog)
   * 2. Click "Catalogue" to expand submenu
   * 3. Click "New Product" to open dialog
   */
  async openCreateProductDialog() {
    // Wait for page to fully load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Extra wait for React hydration

    // Close any open dialogs (like welcome dialog) that might be blocking
    await this.closeAnyOpenDialogs();

    // Also wait for any dialog overlay to close before clicking sidebar
    await this.waitForDialogOverlayToClose();

    // Check if sidebar is visible (it's hidden on mobile: hidden md:block)
    const sideNav = this.page.locator(this.selectors.sideNav);
    const isSideNavVisible = await sideNav.isVisible({ timeout: 15000 }).catch(() => false);

    if (!isSideNavVisible) {
      // Debug: Log what's on the page
      console.log('[ProductPage] Sidebar not visible. Checking viewport and page state...');
      const viewport = this.page.viewportSize();
      console.log(`[ProductPage] Viewport: ${viewport?.width}x${viewport?.height}`);
      console.log(`[ProductPage] URL: ${this.page.url()}`);

      // Maybe we need to wait for auth/hydration
      await this.page.waitForTimeout(3000);
      const retryVisible = await sideNav.isVisible().catch(() => false);
      if (!retryVisible) {
        throw new Error('Sidebar not visible - make sure you have merchant access and viewport is >= 768px wide');
      }
    }

    // Click "Catalogue" menu item to expand submenu
    const catalogueMenu = this.page.locator(this.selectors.catalogueMenuItem);
    await catalogueMenu.waitFor({ state: 'visible', timeout: 10000 });
    await catalogueMenu.click();
    await this.page.waitForTimeout(500);

    // Click "New Product" in the submenu
    const newProductItem = this.page.locator(this.selectors.newProductMenuItem);
    await newProductItem.waitFor({ state: 'visible', timeout: 5000 });
    await newProductItem.click();

    // Wait for dialog to open
    await this.waitForElement(this.selectors.dialogContent);
  }

  /**
   * Wait for dialog overlay to close (the backdrop that blocks clicks)
   */
  async waitForDialogOverlayToClose() {
    const dialogOverlay = this.page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
    try {
      await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // No overlay present, continue
    }
  }

  /**
   * Close any open dialogs that might be blocking interactions
   * Handles the welcome dialog that appears for new merchants
   */
  async closeAnyOpenDialogs() {
    // Check for welcome dialog specifically
    try {
      const welcomeButton = this.page.locator('button:has-text("Customise your profile")');
      await welcomeButton.waitFor({ state: 'visible', timeout: 3000 });
      console.log('[ProductPage] Found welcome dialog, clicking "Customise your profile" button...');
      await welcomeButton.click();
      // Wait for the dialog to actually close (the mutation needs to complete and query refetch)
      await this.waitForDialogOverlayToClose();
      console.log('[ProductPage] Welcome dialog closed successfully');
      return;
    } catch {
      // Welcome dialog didn't appear, continue
    }

    // Check for other open dialogs
    const dialog = this.page.locator('[role="dialog"]');
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[ProductPage] Found open dialog, attempting to close...');

      // Try clicking any button in the dialog (often there's a dismiss/close button)
      const dialogButtons = this.page.locator('[role="dialog"] button');
      const buttonCount = await dialogButtons.count();
      console.log(`[ProductPage] Found ${buttonCount} buttons in dialog`);

      // Look for common close button patterns
      const closePatterns = [
        '[role="dialog"] button[aria-label*="close" i]',
        '[role="dialog"] button[aria-label*="Close" i]',
        '[role="dialog"] button:has-text("Close")',
        '[role="dialog"] button:has-text("Got it")',
        '[role="dialog"] button:has-text("Dismiss")',
        '[role="dialog"] button:has-text("OK")',
        '[role="dialog"] button:has-text("Continue")',
        '[role="dialog"] [aria-label="close-dialog"]',
      ];

      for (const pattern of closePatterns) {
        const btn = this.page.locator(pattern).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          console.log(`[ProductPage] Clicking close button with pattern: ${pattern}`);
          await btn.click({ force: true });
          await this.waitForDialogOverlayToClose();
          return;
        }
      }

      // If no specific button found, try the first button in the dialog
      if (buttonCount > 0) {
        console.log('[ProductPage] Clicking first button in dialog');
        await dialogButtons.first().click({ force: true });
        await this.waitForDialogOverlayToClose();
      }
    }
  }

  /**
   * Fill Step 1: Product Details
   */
  async fillProductDetails(data: {
    name: string;
    noRefunds?: boolean;
  }) {
    // Fill product name
    await this.fill(this.selectors.nameInput, data.name);
    await this.page.waitForTimeout(500);

    // Handle refund settings
    if (data.noRefunds) {
      await this.page.click(this.selectors.noRefundsCheckbox);
    }
  }

  /**
   * Select a category from the hierarchical picker
   */
  async selectCategory(categoryName: string) {
    // Click on category picker to open
    const categoryPickerButton = this.page.locator('button:has-text("Select a category")');
    if (await categoryPickerButton.isVisible()) {
      await categoryPickerButton.click();
      await this.page.waitForTimeout(500);
    }

    // Find and click the category
    const categoryItem = this.page.locator(`[role="treeitem"]:has-text("${categoryName}")`).first();
    if (await categoryItem.isVisible({ timeout: 5000 })) {
      await categoryItem.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Select pricing strategy (Step 2)
   */
  async selectPricingStrategy(strategy: 'volume' | 'unit-profit' | 'inventory' | 'premium' | 'risk-averse') {
    const selectTrigger = this.page.locator('button[role="combobox"]:has-text("Choose your pricing goal")');
    await selectTrigger.click();
    await this.page.waitForTimeout(300);

    const optionMap = {
      'volume': 'Sell more units',
      'unit-profit': 'Make steady profit per unit',
      'inventory': 'Clear stock quickly',
      'premium': 'Position as premium',
      'risk-averse': 'Stay safe',
    };

    await this.page.click(`[role="option"]:has-text("${optionMap[strategy]}")`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Fill variant details (Step 3)
   */
  async fillVariantDetails(data: {
    name?: string;
    code?: string;
    landedCost: number;
    quantity: number;
    currency?: string;
  }) {
    // Find the variant card
    const variantCard = this.page.locator('[data-testid="variant-card"]').first();

    // Fill landed cost
    const landedCostInput = this.page.locator('input[placeholder*="Landed Cost"], input[aria-label*="landed cost"]').first();
    if (await landedCostInput.isVisible()) {
      await landedCostInput.fill(data.landedCost.toString());
    }

    // Fill quantity
    const qtyInput = this.page.locator('input[placeholder*="Qty"], input[aria-label*="quantity"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill(data.quantity.toString());
    }
  }

  /**
   * Click Next to proceed to next step
   */
  async clickNext() {
    await this.click(this.selectors.nextButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Click Previous to go back
   */
  async clickPrevious() {
    await this.click(this.selectors.previousButton);
    await this.page.waitForTimeout(300);
  }

  /**
   * Submit the product listing
   */
  async submitProduct() {
    await this.click(this.selectors.listProductButton);
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if on success screen
   */
  async isOnSuccessScreen(): Promise<boolean> {
    return await this.isVisible(this.selectors.successMessage);
  }

  /**
   * Get current step number
   */
  async getCurrentStep(): Promise<number> {
    // Check which step indicator is highlighted
    const step1Active = await this.page.locator('text=Product Details').evaluate(
      el => window.getComputedStyle(el).fontWeight === '600'
    ).catch(() => false);

    const step2Active = await this.page.locator('text=Properties').evaluate(
      el => window.getComputedStyle(el).fontWeight === '600'
    ).catch(() => false);

    const step3Active = await this.page.locator('text=Variants').evaluate(
      el => window.getComputedStyle(el).fontWeight === '600'
    ).catch(() => false);

    if (step3Active) return 3;
    if (step2Active) return 2;
    return 1;
  }

  /**
   * Navigate to a product detail page
   */
  async navigateToProduct(merchantSlug: string, productId: string) {
    await this.goto(`/m/${merchantSlug}/product/${productId}`);
  }

  /**
   * Select a variant on product page
   */
  async selectVariant(variantName: string) {
    const variantOption = this.page.locator(`[data-testid="variant-option"]:has-text("${variantName}")`);
    if (await variantOption.isVisible()) {
      await variantOption.click();
    }
  }

  /**
   * Set quantity on product page
   */
  async setQuantity(quantity: number) {
    const qtyInput = this.page.locator('[data-testid="quantity-input"], input[type="number"]').first();
    await qtyInput.fill(quantity.toString());
  }

  /**
   * Click Add to Cart button
   */
  async addToCart() {
    await this.click(this.selectors.addToCartButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Verify product was created (check for success indicators)
   */
  async verifyProductCreated(): Promise<boolean> {
    // Wait for success dialog or redirect
    try {
      await this.page.waitForSelector('text=listed successfully', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get validation error messages
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator('[class*="text-destructive"], [role="alert"]').allTextContents();
    return errors.filter(e => e.trim().length > 0);
  }

  /**
   * Upload a product thumbnail
   */
  async uploadThumbnail(imagePath: string) {
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(imagePath);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if product details form is valid
   */
  async isStep1Valid(): Promise<boolean> {
    const nextButton = this.page.locator(this.selectors.nextButton);
    const isEnabled = await nextButton.isEnabled();
    return isEnabled;
  }
}

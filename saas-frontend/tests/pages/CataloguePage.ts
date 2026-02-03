import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Catalogue Page Object Model
 * Handles browsing products in a merchant's catalogue
 */
export class CataloguePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  private selectors = {
    // Catalogue grid
    catalogueGrid: '[data-testid="catalogue-grid"]',
    catalogueItem: '[data-testid="catalogue-item"]',
    productCard: '[data-testid="product-card"]',

    // Product card elements
    productName: '[data-testid="product-name"]',
    productPrice: '[data-testid="product-price"]',
    productImage: '[data-testid="product-image"]',

    // Search and filters
    searchInput: 'input[placeholder*="Search"], input[aria-label="Search"]',
    filterButton: 'button:has-text("Filter")',
    sortSelect: '[data-testid="sort-select"]',

    // Loading states
    loadingSpinner: '[data-testid="loading"]',
    emptyState: '[data-testid="empty-catalogue"]',

    // Pagination
    loadMoreButton: 'button:has-text("Load More")',
    nextPageButton: 'button[aria-label="Next page"]',
    prevPageButton: 'button[aria-label="Previous page"]',

    // Cart indicator
    cartButton: '[data-testid="cart-button"], button[aria-label="Shopping cart"]',
    cartCount: '[data-testid="cart-count"]',
  };

  /**
   * Navigate to merchant catalogue
   */
  async navigateToCatalogue(merchantSlug: string) {
    await this.goto(`/m/${merchantSlug}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for catalogue to load
   */
  async waitForCatalogueLoad() {
    // Wait for loading to finish
    await this.page.waitForSelector(this.selectors.loadingSpinner, { state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all product cards in the catalogue
   */
  async getProductCards() {
    return this.page.locator('[data-testid="catalogue-item"], [data-testid="product-card"], .catalogue-item').all();
  }

  /**
   * Get count of products in catalogue
   */
  async getProductCount(): Promise<number> {
    await this.waitForCatalogueLoad();
    const cards = await this.getProductCards();
    return cards.length;
  }

  /**
   * Click on a product by name
   */
  async clickProduct(productName: string) {
    const productCard = this.page.locator(`[data-testid="catalogue-item"]:has-text("${productName}"), .catalogue-item:has-text("${productName}")`).first();
    await productCard.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on a product by index
   */
  async clickProductByIndex(index: number) {
    const cards = await this.getProductCards();
    if (cards.length > index) {
      await cards[index].click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Product at index ${index} not found. Only ${cards.length} products available.`);
    }
  }

  /**
   * Search for products
   */
  async searchProducts(query: string) {
    const searchInput = this.page.locator(this.selectors.searchInput);
    if (await searchInput.isVisible()) {
      await searchInput.fill(query);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1000);
      await this.waitForCatalogueLoad();
    }
  }

  /**
   * Clear search
   */
  async clearSearch() {
    const searchInput = this.page.locator(this.selectors.searchInput);
    if (await searchInput.isVisible()) {
      await searchInput.clear();
      await this.page.keyboard.press('Enter');
      await this.waitForCatalogueLoad();
    }
  }

  /**
   * Check if catalogue is empty
   */
  async isCatalogueEmpty(): Promise<boolean> {
    await this.waitForCatalogueLoad();
    const emptyState = this.page.locator('text=No products found, text=No items, text=Empty catalogue');
    return await emptyState.isVisible().catch(() => {
      const cards = this.page.locator('[data-testid="catalogue-item"], .catalogue-item');
      return cards.count().then(count => count === 0);
    });
  }

  /**
   * Get product names from catalogue
   */
  async getProductNames(): Promise<string[]> {
    await this.waitForCatalogueLoad();
    const names = await this.page.locator('[data-testid="product-name"], .product-name, .catalogue-item h3').allTextContents();
    return names.map(n => n.trim());
  }

  /**
   * Load more products (if pagination exists)
   */
  async loadMore() {
    const loadMoreBtn = this.page.locator(this.selectors.loadMoreButton);
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();
      await this.waitForCatalogueLoad();
    }
  }

  /**
   * Open cart
   */
  async openCart() {
    const cartButton = this.page.locator(this.selectors.cartButton);
    if (await cartButton.isVisible()) {
      await cartButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Get cart item count from badge
   */
  async getCartBadgeCount(): Promise<number> {
    const cartCount = this.page.locator(this.selectors.cartCount);
    if (await cartCount.isVisible()) {
      const text = await cartCount.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  /**
   * Verify product appears in catalogue
   */
  async verifyProductInCatalogue(productName: string): Promise<boolean> {
    await this.waitForCatalogueLoad();
    const product = this.page.locator(`text="${productName}"`);
    return await product.isVisible({ timeout: 5000 }).catch(() => false);
  }
}

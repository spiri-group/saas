import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Journey Storefront Page Object Model
 * Handles the /m/[merchant_slug]/journey/[journeyId] page
 */
export class JourneyStorefrontPage extends BasePage {
  private readonly selectors = {
    // Hero section
    hero: '[data-testid="journey-hero"]',
    title: '[data-testid="journey-title"]',
    vendorLink: '[data-testid="journey-vendor-link"]',

    // Info bar
    infoBar: '[data-testid="journey-info-bar"]',
    price: '[data-testid="journey-price"]',
    addToCartBtn: '[data-testid="journey-add-to-cart-btn"]',

    // Description
    description: '[data-testid="journey-description"]',
    intention: '[data-testid="journey-intention"]',
    spiritualInterests: '[data-testid="journey-spiritual-interests"]',

    // Tracks
    trackList: '[data-testid="journey-track-list"]',
    trackItem: '[data-testid^="journey-track-"]',
    trackPreview: '[data-testid^="track-preview-"]',
    trackPlayBtn: '[data-testid^="track-play-btn-"]',

    // Recommendations
    recommendedCrystals: '[data-testid="journey-recommended-crystals"]',
    recommendedTools: '[data-testid="journey-recommended-tools"]',

    // Rental
    rentBtn: '[data-testid="journey-rent-btn"]',
    mobileRentBtn: '[data-testid="journey-mobile-rent-btn"]',

    // Mobile cart
    mobileCart: '[data-testid="journey-mobile-cart"]',
    mobileAddToCartBtn: '[data-testid="journey-mobile-add-to-cart-btn"]',

    // Reviews
    reviewsSection: '#viewreview',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(merchantSlug: string, journeyId: string) {
    await this.page.goto(`/m/${merchantSlug}/journey/${journeyId}`);
  }

  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.title)).toBeVisible({ timeout: 20000 });
  }

  async getTitle(): Promise<string> {
    return await this.page.locator(this.selectors.title).textContent() || '';
  }

  async getVendorName(): Promise<string> {
    return await this.page.locator(this.selectors.vendorLink).textContent() || '';
  }

  async isHeroVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.hero).isVisible();
  }

  async isInfoBarVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.infoBar).isVisible();
  }

  async isPriceVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.price).isVisible();
  }

  async isDescriptionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.description).isVisible();
  }

  async isIntentionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.intention).isVisible();
  }

  async getTrackCount(): Promise<number> {
    return await this.page.locator(this.selectors.trackItem).count();
  }

  async getTrackPreviewCount(): Promise<number> {
    return await this.page.locator(this.selectors.trackPreview).count();
  }

  async clickAddToCart() {
    await this.page.locator(this.selectors.addToCartBtn).click();
  }

  async isAddToCartEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.addToCartBtn).isEnabled();
  }

  async getAddToCartText(): Promise<string> {
    return await this.page.locator(this.selectors.addToCartBtn).textContent() || '';
  }

  async clickTrackPreviewPlay(trackId: string) {
    await this.page.locator(`[data-testid="track-play-btn-${trackId}"]`).click();
  }

  async isRecommendedCrystalsVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.recommendedCrystals).isVisible();
  }

  async isRecommendedToolsVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.recommendedTools).isVisible();
  }

  async isReviewsSectionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.reviewsSection).isVisible();
  }

  async clickVendorLink() {
    await this.page.locator(this.selectors.vendorLink).click();
  }

  // Rental
  async isRentButtonVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.rentBtn).isVisible();
  }

  async clickRent() {
    await this.page.locator(this.selectors.rentBtn).click();
  }
}

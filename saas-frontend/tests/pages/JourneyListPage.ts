import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Journey List Page Object Model
 * Handles the /u/[userId]/space/journeys page (Personal Space)
 */
export class JourneyListPage extends BasePage {
  private readonly selectors = {
    // Page states
    loading: '[data-testid="journeys-loading"]',
    emptyState: '[data-testid="journeys-empty"]',
    listPage: '[data-testid="journeys-list-page"]',

    // Sections
    activeSection: '[data-testid="active-journeys-section"]',
    completedSection: '[data-testid="completed-journeys-section"]',

    // Cards
    journeyCard: '[data-testid^="journey-card-"]',
    progressBar: '[data-testid="journey-progress-bar"]',
    completedBadge: '[data-testid="journey-completed-badge"]',
    progressBadge: '[data-testid="journey-progress-badge"]',
    rentalBadge: '[data-testid="journey-rental-badge"]',
    expiredBadge: '[data-testid="journey-expired-badge"]',

    // Sections
    expiredSection: '[data-testid="expired-rentals-section"]',

    // Sidenav
    journeysNav: '[data-testid="journeys-nav"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(userId: string) {
    await this.page.goto(`/u/${userId}/space/journeys`);
  }

  async waitForPageLoad() {
    // Wait for either the list page, empty state, or loading to finish
    const listPage = this.page.locator(this.selectors.listPage);
    const emptyState = this.page.locator(this.selectors.emptyState);
    await expect(listPage.or(emptyState)).toBeVisible({ timeout: 20000 });
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  async isListPageVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.listPage).isVisible();
  }

  async getJourneyCardCount(): Promise<number> {
    return await this.page.locator(this.selectors.journeyCard).count();
  }

  async clickJourneyCard(journeyId: string) {
    await this.page.locator(`[data-testid="journey-card-${journeyId}"]`).click();
  }

  async clickFirstJourneyCard() {
    await this.page.locator(this.selectors.journeyCard).first().click();
  }

  async hasActiveSection(): Promise<boolean> {
    return await this.page.locator(this.selectors.activeSection).isVisible();
  }

  async hasCompletedSection(): Promise<boolean> {
    return await this.page.locator(this.selectors.completedSection).isVisible();
  }

  async getActiveJourneyCount(): Promise<number> {
    const section = this.page.locator(this.selectors.activeSection);
    if (!(await section.isVisible())) return 0;
    return await section.locator(this.selectors.journeyCard).count();
  }

  async getCompletedJourneyCount(): Promise<number> {
    const section = this.page.locator(this.selectors.completedSection);
    if (!(await section.isVisible())) return 0;
    return await section.locator(this.selectors.journeyCard).count();
  }

  async clickJourneysNavLink() {
    await this.page.locator(this.selectors.journeysNav).click();
  }

  // Rental
  async hasExpiredSection(): Promise<boolean> {
    return await this.page.locator(this.selectors.expiredSection).isVisible();
  }

  async getExpiredRentalCount(): Promise<number> {
    const section = this.page.locator(this.selectors.expiredSection);
    if (!(await section.isVisible())) return 0;
    return await section.locator(this.selectors.journeyCard).count();
  }

  async hasRentalBadge(): Promise<boolean> {
    return await this.page.locator(this.selectors.rentalBadge).first().isVisible();
  }

  async hasExpiredBadge(): Promise<boolean> {
    return await this.page.locator(this.selectors.expiredBadge).first().isVisible();
  }
}

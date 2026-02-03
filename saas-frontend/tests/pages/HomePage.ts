import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Home Page Object Model
 * Handles home page interactions and navigation
 */
export class HomePage extends BasePage {
  // Selectors
  private readonly selectors = {
    completeProfileLink: 'a:has-text("Complete Your Profile")',
    welcomeMessage: 'text=Welcome back',
    beginJourneyMessage: 'text=Begin your journey',
    signOutButton: 'button:has-text("Sign Out")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Get the "Complete Your Profile" link locator
   */
  getCompleteProfileLink(): Locator {
    return this.page.locator(this.selectors.completeProfileLink);
  }

  /**
   * Wait for "Complete Your Profile" link to appear
   * @param timeout - Optional timeout in milliseconds (default: 20000)
   */
  async waitForCompleteProfileLink(timeout = 20000): Promise<void> {
    await this.page.waitForSelector(this.selectors.completeProfileLink, { timeout });
  }

  /**
   * Click "Complete Your Profile" link to navigate to setup
   */
  async clickCompleteProfile(): Promise<void> {
    await this.getCompleteProfileLink().click();
  }

  /**
   * Check if user is logged in (shows welcome message)
   */
  async isLoggedIn(): Promise<boolean> {
    return await this.page.locator(this.selectors.welcomeMessage).isVisible();
  }

  /**
   * Check if user is logged out (shows begin journey message)
   */
  async isLoggedOut(): Promise<boolean> {
    return await this.page.locator(this.selectors.beginJourneyMessage).isVisible();
  }

  /**
   * Check if "Complete Your Profile" link is visible
   */
  async hasCompleteProfileLink(): Promise<boolean> {
    return await this.getCompleteProfileLink().isVisible();
  }

  /**
   * Navigate to home page
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await this.page.click(this.selectors.signOutButton);
  }
}

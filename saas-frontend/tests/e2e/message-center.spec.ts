import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestPractitioner,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  getVendorIdFromSlug,
} from '../utils/test-cleanup';

/**
 * Practitioner Message Center Tests
 *
 * Tests the complete messaging workflow between customers and practitioners:
 *
 * 1. Setup: Create practitioner with profile
 * 2. Setup: Create customer 1 with profile
 * 3. Setup: Create customer 2 with profile (for isolation testing)
 * 4. Customer 1 sends message to practitioner
 * 5. Customer 2 sends different message to practitioner
 * 6. Practitioner views Message Center - sees 2 separate conversations
 * 7. Practitioner responds to customer 1
 * 8. Customer 1 sees practitioner's response
 * 9. Customer 2 does NOT see customer 1's conversation (isolation test)
 */

// Shared state
let practitionerSlug: string;
let practitionerEmail: string;
let practitionerStorageState: { cookies: any[]; origins: any[] } | null = null;

let customer1Email: string;
let customer1UserId: string;
let customer1StorageState: { cookies: any[]; origins: any[] } | null = null;
let customer1MessageText: string = '';

let customer2Email: string;
let customer2UserId: string;
let customer2StorageState: { cookies: any[]; origins: any[] } | null = null;
let customer2MessageText: string = '';

let practitionerReplyToCustomer1: string = '';

// Cleanup tracking
const cookiesPerWorker = new Map<number, string>();

// Test message content
const testMessage = (customerNum: number, timestamp: number) =>
  `Hello from Customer ${customerNum}! Question about services. [Test ${timestamp}]`;
const testReply = (timestamp: number) =>
  `Thank you for reaching out! How can I help? [Reply ${timestamp}]`;

test.describe.serial('Practitioner Message Center', () => {
  test.beforeAll(async ({}, testInfo) => {
    console.log('[Setup] Preparing Practitioner Message Center test environment...');
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
        console.error('[Cleanup] Error:', error);
      } finally {
        cookiesPerWorker.delete(workerId);
      }
    }
    clearTestEntityRegistry(workerId);
  });

  test('setup: create practitioner', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workerId = testInfo.parallelIndex;
    practitionerEmail = `msg-prac-${timestamp}-${workerId}@playwright.com`;
    practitionerSlug = `msg-prac-${timestamp}-${randomSuffix}`;

    // Authenticate
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const userSetupPage = new UserSetupPage(page);
    const practitionerSetupPage = new PractitionerSetupPage(page);

    await page.goto('/');
    await authPage.startAuthFlow(practitionerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // User setup
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(workerId, cookies);
      }
      // Register user with their own cookies for cleanup
      registerTestUser({ id: userIdMatch[1], email: practitionerEmail, cookies }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Message',
      lastName: 'Practitioner',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    // Continue as practitioner
    const practitionerBtn = page.locator('[data-testid="continue-as-practitioner-btn"]');
    await expect(practitionerBtn).toBeVisible({ timeout: 10000 });
    await practitionerBtn.click();
    await expect(page).toHaveURL(/\/p\/setup\?practitionerId=/, { timeout: 15000 });

    // Practitioner setup
    await practitionerSetupPage.waitForStep1();
    await practitionerSetupPage.fillBasicInfo({
      name: `Message Practitioner ${timestamp}`,
      slug: practitionerSlug,
      email: practitionerEmail,
      countryName: 'Australia',
    });
    await practitionerSetupPage.clickContinue();

    await practitionerSetupPage.waitForStep2();
    await practitionerSetupPage.fillProfile({
      headline: 'Intuitive Guide for Messaging Tests',
      bio: 'I specialize in helping people through direct communication. Reach out anytime with questions about spiritual guidance.',
      modalities: ['TAROT'],
      specializations: ['RELATIONSHIPS'],
    });
    await practitionerSetupPage.clickContinue();

    await practitionerSetupPage.waitForStep3();
    await practitionerSetupPage.submitForm();

    // Wait for profile page
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });
    console.log(`[Setup] Practitioner created: ${practitionerSlug}`);

    // Register practitioner for cleanup with fresh cookies and actual vendor ID
    const practitionerCookies = await getCookiesFromPage(page);
    if (practitionerCookies) {
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
      if (actualVendorId) {
        console.log(`[Setup] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
        registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: practitionerEmail, cookies: practitionerCookies }, workerId);
      } else {
        console.error(`[Setup] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
        registerTestPractitioner({ slug: practitionerSlug, email: practitionerEmail, cookies: practitionerCookies }, workerId);
      }
    }

    // Save practitioner storage state
    practitionerStorageState = await page.context().storageState();
  });

  test('setup: create customer 1', async ({ page }, testInfo) => {
    test.setTimeout(120000);

    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    customer1Email = `msg-cust1-${timestamp}-${workerId}@playwright.com`;

    // Authenticate
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const userSetupPage = new UserSetupPage(page);

    await page.goto('/');
    await authPage.startAuthFlow(customer1Email);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Complete user setup
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      customer1UserId = userIdMatch[1];
      const cookies = await getCookiesFromPage(page);
      // Register user with their own cookies for cleanup
      registerTestUser({ id: customer1UserId, email: customer1Email, cookies }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Customer',
      lastName: 'One',
      phone: '0411111111',
      address: 'Melbourne CBD',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Green',
    });

    // Complete setup
    const startBrowsingBtn = page.getByRole('button', { name: 'Start Browsing SpiriVerse' });
    if (await startBrowsingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBrowsingBtn.click();
    } else {
      await page.goto('/');
    }

    await page.waitForTimeout(2000);
    console.log(`[Setup] Customer 1 created: ${customer1Email}`);

    // Save customer storage state
    customer1StorageState = await page.context().storageState();
  });

  test('setup: create customer 2', async ({ page }, testInfo) => {
    test.setTimeout(120000);

    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    customer2Email = `msg-cust2-${timestamp}-${workerId}@playwright.com`;

    // Authenticate
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const userSetupPage = new UserSetupPage(page);

    await page.goto('/');
    await authPage.startAuthFlow(customer2Email);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Complete user setup
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      customer2UserId = userIdMatch[1];
      const cookies = await getCookiesFromPage(page);
      // Register user with their own cookies for cleanup
      registerTestUser({ id: customer2UserId, email: customer2Email, cookies }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Customer',
      lastName: 'Two',
      phone: '0422222222',
      address: 'Brisbane CBD',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Red',
    });

    // Complete setup
    const startBrowsingBtn = page.getByRole('button', { name: 'Start Browsing SpiriVerse' });
    if (await startBrowsingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBrowsingBtn.click();
    } else {
      await page.goto('/');
    }

    await page.waitForTimeout(2000);
    console.log(`[Setup] Customer 2 created: ${customer2Email}`);

    // Save customer storage state
    customer2StorageState = await page.context().storageState();
  });

  test('customer 1 sends message to practitioner', async ({ page }) => {
    test.setTimeout(60000);

    // Restore customer 1 session
    if (!customer1StorageState) throw new Error('Customer 1 storage state not available');
    await page.context().addCookies(customer1StorageState.cookies);

    // Navigate to practitioner profile
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.locator('h1').filter({ hasText: 'Message Practitioner' })).toBeVisible({
      timeout: 15000,
    });

    // Click Send Message button
    const messageBtn = page.getByTestId('send-message-btn');
    await expect(messageBtn).toBeVisible({ timeout: 10000 });
    await messageBtn.click();

    // Wait for message input
    await expect(page.getByTestId('message-input')).toBeVisible({ timeout: 15000 });

    // Type and send message
    customer1MessageText = testMessage(1, Date.now());
    await page.getByTestId('message-input').fill(customer1MessageText);

    const sendBtn = page.getByTestId('send-message-submit-btn');
    await expect(sendBtn).toBeEnabled({ timeout: 5000 });
    await sendBtn.click();

    // Verify message appears in thread
    await expect(page.getByText(customer1MessageText)).toBeVisible({ timeout: 15000 });
    console.log('[Test] Customer 1 sent message to practitioner');

    // Update storage state
    customer1StorageState = await page.context().storageState();
  });

  test('customer 2 sends message to practitioner', async ({ page }) => {
    test.setTimeout(60000);

    // Restore customer 2 session
    if (!customer2StorageState) throw new Error('Customer 2 storage state not available');
    await page.context().addCookies(customer2StorageState.cookies);

    // Navigate to practitioner profile
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.locator('h1').filter({ hasText: 'Message Practitioner' })).toBeVisible({
      timeout: 15000,
    });

    // Click Send Message button
    const messageBtn = page.getByTestId('send-message-btn');
    await expect(messageBtn).toBeVisible({ timeout: 10000 });
    await messageBtn.click();

    // Wait for message input
    await expect(page.getByTestId('message-input')).toBeVisible({ timeout: 15000 });

    // Type and send message
    customer2MessageText = testMessage(2, Date.now());
    await page.getByTestId('message-input').fill(customer2MessageText);

    const sendBtn = page.getByTestId('send-message-submit-btn');
    await expect(sendBtn).toBeEnabled({ timeout: 5000 });
    await sendBtn.click();

    // Verify message appears in thread
    await expect(page.getByText(customer2MessageText)).toBeVisible({ timeout: 15000 });
    console.log('[Test] Customer 2 sent message to practitioner');

    // Update storage state
    customer2StorageState = await page.context().storageState();
  });

  test('practitioner views Message Center and sees 2 conversations', async ({ page }) => {
    test.setTimeout(60000);

    // Restore practitioner session
    if (!practitionerStorageState) throw new Error('Practitioner storage state not available');
    await page.context().addCookies(practitionerStorageState.cookies);

    // Navigate to Message Center
    await page.goto(`/p/${practitionerSlug}/manage/messages`);

    // Verify Message Center loads
    await expect(page.getByTestId('message-center')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('message-center-heading')).toBeVisible();
    console.log('[Test] Message Center loaded');

    // Wait for conversations to load
    await page.waitForTimeout(3000);

    // Verify conversations list is visible
    const conversationsList = page.getByTestId('conversations-list');
    await expect(conversationsList).toBeVisible({ timeout: 15000 });

    // Should have 2 conversation items (one for each customer)
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    const count = await conversationItems.count();
    console.log(`[Test] Found ${count} conversation(s)`);
    expect(count).toBeGreaterThanOrEqual(2);

    // Click on first conversation to verify it opens
    const firstConversation = conversationItems.first();
    await firstConversation.click();
    await expect(page.getByTestId('active-conversation')).toBeVisible({ timeout: 10000 });
    console.log('[Test] Conversations verified - practitioner can see both customers');

    // Update practitioner storage state
    practitionerStorageState = await page.context().storageState();
  });

  test('practitioner responds to customer 1', async ({ page }) => {
    test.setTimeout(90000);

    // Restore practitioner session
    if (!practitionerStorageState) throw new Error('Practitioner storage state not available');
    await page.context().addCookies(practitionerStorageState.cookies);

    // Navigate to Message Center
    await page.goto(`/p/${practitionerSlug}/manage/messages`);
    await expect(page.getByTestId('message-center')).toBeVisible({ timeout: 15000 });

    // Wait for conversations to load
    await page.waitForTimeout(3000);

    // Find and click on customer 1's conversation (contains their message)
    const conversationItems = page.locator('[data-testid^="conversation-item-"]');
    await expect(conversationItems.first()).toBeVisible({ timeout: 10000 });

    // Click through conversations to find customer 1's
    // We need to check the CHAT AREA for customer 1's message, not the whole page
    // (because "Customer 1" text appears in the conversation list preview too)
    const count = await conversationItems.count();
    console.log(`[Test] Found ${count} conversations`);
    let foundCustomer1 = false;
    for (let i = 0; i < count; i++) {
      await conversationItems.nth(i).click();

      // Wait for ChatControl container to be visible
      const chatContainer = page.getByTestId('chat-control-container');
      await expect(chatContainer).toBeVisible({ timeout: 5000 });

      // Wait for loading to complete - ChatControl shows "Loading..." while loading
      // Wait for it to disappear (either messages appear or "No messages found")
      try {
        await chatContainer.getByText('Loading...').waitFor({ state: 'hidden', timeout: 10000 });
      } catch {
        // If Loading... never appeared or already hidden, that's fine
      }

      // Small delay to ensure content has rendered
      await page.waitForTimeout(500);

      // Check if the CHAT CONTAINER contains customer 1's specific message text
      // ChatControl renders messages in <p className="text-base"> elements
      const hasCustomer1Message = await chatContainer.getByText('Hello from Customer 1!', { exact: false }).isVisible().catch(() => false);
      console.log(`[Test] Conversation ${i}: hasCustomer1Message = ${hasCustomer1Message}`);
      if (hasCustomer1Message) {
        console.log(`[Test] Found customer 1's conversation at index ${i}`);
        foundCustomer1 = true;
        break;
      }
    }

    if (!foundCustomer1) {
      throw new Error('Could not find customer 1\'s conversation in Message Center');
    }

    // Wait for ChatControl to load
    await expect(page.getByTestId('chat-control-container')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Find the message input in ChatControl
    const chatInput = page.locator('[data-testid="chat-control-container"] textarea, [data-testid="chat-control-container"] input[type="text"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    practitionerReplyToCustomer1 = testReply(Date.now());
    await chatInput.fill(practitionerReplyToCustomer1);

    // Click the send button in ChatControl
    const sendButton = page.getByTestId('chat-send-btn');
    await expect(sendButton).toBeVisible({ timeout: 5000 });
    await sendButton.click();

    // Wait for message to appear in the chat
    await expect(page.getByText(practitionerReplyToCustomer1)).toBeVisible({ timeout: 15000 });
    console.log('[Test] Practitioner sent reply to customer 1 - verified in chat');

    // Update storage state
    practitionerStorageState = await page.context().storageState();
  });

  test('customer 1 sees practitioner response', async ({ page }) => {
    test.setTimeout(60000);

    expect(practitionerReplyToCustomer1).toBeTruthy();

    // Restore customer 1 session
    if (!customer1StorageState) throw new Error('Customer 1 storage state not available');
    await page.context().addCookies(customer1StorageState.cookies);

    // Navigate to practitioner profile and open messages
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.locator('h1').filter({ hasText: 'Message Practitioner' })).toBeVisible({
      timeout: 15000,
    });

    // Click Send Message button to open conversation
    const messageBtn = page.getByTestId('send-message-btn');
    await expect(messageBtn).toBeVisible({ timeout: 10000 });
    await messageBtn.click();

    // Wait for message thread to load
    await expect(page.getByTestId('message-input')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Verify practitioner's reply is visible
    await expect(page.getByText(practitionerReplyToCustomer1)).toBeVisible({ timeout: 15000 });
    console.log('[Test] Customer 1 can see practitioner reply');
  });

  test('customer 2 does NOT see customer 1 conversation (isolation)', async ({ page }) => {
    test.setTimeout(60000);

    // Restore customer 2 session
    if (!customer2StorageState) throw new Error('Customer 2 storage state not available');
    await page.context().addCookies(customer2StorageState.cookies);

    // Navigate to practitioner profile and open messages
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.locator('h1').filter({ hasText: 'Message Practitioner' })).toBeVisible({
      timeout: 15000,
    });

    // Click Send Message button to open conversation
    const messageBtn = page.getByTestId('send-message-btn');
    await expect(messageBtn).toBeVisible({ timeout: 10000 });
    await messageBtn.click();

    // Wait for message thread to load
    await expect(page.getByTestId('message-input')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Customer 2 should see their own message
    await expect(page.getByText(customer2MessageText)).toBeVisible({ timeout: 10000 });
    console.log('[Test] Customer 2 can see their own message');

    // Customer 2 should NOT see customer 1's message or practitioner's reply to customer 1
    const customer1MessageVisible = await page.getByText(customer1MessageText).isVisible({ timeout: 2000 }).catch(() => false);
    const practitionerReplyVisible = await page.getByText(practitionerReplyToCustomer1).isVisible({ timeout: 2000 }).catch(() => false);

    expect(customer1MessageVisible).toBe(false);
    expect(practitionerReplyVisible).toBe(false);
    console.log('[Test] Customer 2 cannot see customer 1 conversation - isolation verified');
  });
});

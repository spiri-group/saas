import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Tour Page Object Model
 * Handles tour creation, management, and booking operations
 */
export class TourPage extends BasePage {
  private readonly selectors = {
    // Sidebar navigation
    sidebarCatalogue: 'button[aria-label="Catalogue"]',
    sidebarTour: 'button[aria-label="Tour"]',
    sidebarCreateTour: 'button:has-text("Create Tour"), button[aria-label="Create Tour"]',
    sidebarEventsAndTours: 'button[aria-label="Events & Tours"], button[aria-label="Event / Tours"]',
    sidebarManage: 'button[aria-label="Manage"]',

    // Create Tour Dialog - Step indicators
    stepDetails: 'text=Details',
    stepThumbnail: 'text=Thumbnail',
    stepItinerary: 'text=Itinerary',
    stepTickets: 'text=Tickets',

    // Step 1: Tour Details
    tourNameInput: 'input[name="name"]',
    timezoneSelector: '[data-testid="timezone-selector"]',
    countrySelector: '[data-testid="country-selector"]',
    descriptionTab: '[role="tab"]:has-text("Description")',
    termsTab: '[role="tab"]:has-text("Terms")',
    faqTab: '[role="tab"]:has-text("FAQ")',
    refundPolicySelect: '[data-testid="refund-policy-select"]',

    // Step 2: Thumbnail
    thumbnailUpload: 'input[type="file"]',

    // Step 3: Itinerary
    activityListContainer: '[data-testid="activity-list"]',
    addActivityButton: '[data-testid="add-activity-btn"]',
    activityNameInput: '[data-testid="activity-name"]',
    activityTimeInput: '[data-testid="activity-time"]',
    activityLocationInput: '[data-testid="activity-location"]',

    // Step 4: Tickets
    ticketVariantsContainer: '[data-testid="ticket-variants"]',
    addTicketVariantButton: '[data-testid="add-ticket-variant-btn"]',
    ticketNameInput: '[data-testid="ticket-name"]',
    ticketPriceInput: '[data-testid="ticket-price"]',
    ticketDescriptionInput: '[data-testid="ticket-description"]',
    ticketPeopleCountInput: '[data-testid="ticket-people-count"]',

    // Navigation buttons
    nextButton: 'button:has-text("Next")',
    previousButton: 'button:has-text("Previous")',
    createTourButton: 'button:has-text("Create Tour")',
    closeButton: 'button:has-text("Close")',

    // Events & Tours page
    scheduleDatesPanel: '[data-testid="schedule-dates-panel"]',
    tourCombobox: '[aria-label="combobox-schedule-tour-trigger"]',
    capacityInput: 'input[name="schedule.capacity"]',
    calendarContainer: '[data-testid="calendar"]',
    scheduleResetButton: '[aria-label="button-schedule-reset"]',
    scheduleSaveButton: '[aria-label="button-schedule-save"]',
    sessionsPanel: '[data-testid="sessions-panel"]',

    // Public Tour page
    bookTourCard: '[data-testid="book-tour-card"]',
    dateSelector: '[data-testid="date-selector"]',
    timeSelector: '[data-testid="time-selector"]',
    ticketSelector: '[data-testid="ticket-selector"]',
    customerEmailInput: 'input[type="email"][placeholder*="email"]',
    bookNowButton: 'button:has-text("Book Now")',

    // Dialog
    dialog: '[role="dialog"]:not([aria-hidden="true"])',

    // Inline Checkout (new)
    bookingEmailInput: '[data-testid="booking-email-input"]',
    proceedToPaymentBtn: '[data-testid="proceed-to-payment-btn"]',
    confirmPaymentBtn: '[data-testid="confirm-payment-btn"]',
    stripePaymentElement: '[data-stripe-element]',
    bookingConfirmation: 'text=Booking Confirmed',
    bookingCode: '[data-testid="booking-code"]',

    // Waitlist (new)
    joinWaitlistBtn: '[data-testid^="join-waitlist-btn"]',
    waitlistDialog: '[role="dialog"]:has-text("Join the Waitlist")',
    waitlistEmailInput: '[data-testid="waitlist-email-input"]',
    waitlistSubmitBtn: '[data-testid="waitlist-submit-btn"]',
    waitlistSuccess: 'text=You\'re on the Waitlist',
    waitlistPosition: '[data-testid="waitlist-position"]',

    // Session status
    sessionFull: 'text=Full',
    sessionAvailable: 'text=spots left',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to merchant dashboard
   */
  async navigateToMerchant(merchantSlug: string) {
    await this.goto(`/m/${merchantSlug}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Events & Tours page (under /manage/ route)
   */
  async navigateToEventsAndTours(merchantSlug: string) {
    await this.goto(`/m/${merchantSlug}/manage/events-and-tours`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to public tour page
   */
  async navigateToPublicTour(merchantSlug: string, tourId: string) {
    await this.goto(`/m/${merchantSlug}/tour/${tourId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open create tour dialog via sidebar
   */
  async openCreateTourDialog() {
    // Click Catalogue to open dropdown menu
    const catalogueButton = this.page.locator(this.selectors.sidebarCatalogue);
    await catalogueButton.waitFor({ state: 'visible', timeout: 10000 });
    await catalogueButton.click();
    await this.page.waitForTimeout(500);

    // Click "New Tour" from the dropdown
    const newTourButton = this.page.locator('button:has-text("New Tour"), [role="menuitem"]:has-text("New Tour")');
    await newTourButton.waitFor({ state: 'visible', timeout: 5000 });
    await newTourButton.click();

    // Wait for dialog
    await expect(this.page.locator(this.selectors.dialog)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if create tour dialog is open
   */
  async isCreateTourDialogOpen(): Promise<boolean> {
    const dialog = this.page.locator(this.selectors.dialog);
    return await dialog.isVisible().catch(() => false);
  }

  /**
   * Get current step in tour creation wizard
   */
  async getCurrentStep(): Promise<number> {
    // Check which step indicator has the active/highlighted state
    const steps = ['Details', 'Thumbnail', 'Itinerary', 'Tickets'];
    for (let i = 0; i < steps.length; i++) {
      const stepElement = this.page.locator(`span:has-text("${steps[i]}")`).first();
      const classes = await stepElement.getAttribute('class');
      if (classes?.includes('font-semibold') || classes?.includes('text-foreground')) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Fill Step 1: Tour Details
   */
  async fillTourDetails(data: {
    name: string;
    description: string;
    timezone?: string;
    country?: string;
    terms?: string;
    faq?: Array<{ title: string; description: string }>;
    refundPolicyId?: string;
  }) {
    // Fill tour name
    await this.page.fill(this.selectors.tourNameInput, data.name);
    await this.page.waitForTimeout(300);

    // Select timezone if provided (uses TimeZoneSelector component)
    if (data.timezone) {
      // The timezone selector auto-detects, but we can override
      const timezoneButton = this.page.locator('button:has-text("Select timezone")');
      if (await timezoneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await timezoneButton.click();
        await this.page.locator(`[role="option"]:has-text("${data.timezone}")`).click();
      }
    }

    // Select country from the dropdown (required for timezone)
    if (data.country) {
      // Click on the country dropdown trigger
      const countryTrigger = this.page.locator('text=Select country').first();
      await countryTrigger.waitFor({ state: 'visible', timeout: 5000 });
      await countryTrigger.click();
      await this.page.waitForTimeout(500);

      // Wait for dropdown to appear and type to filter
      const dropdown = this.page.locator('[role="listbox"], [data-radix-popper-content-wrapper]');
      await dropdown.waitFor({ state: 'visible', timeout: 5000 });

      // Type to filter countries
      await this.page.keyboard.type(data.country);
      await this.page.waitForTimeout(500);

      // Click the matching option
      const countryOption = this.page.locator(`[role="option"]:has-text("${data.country}")`).first();
      if (await countryOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await countryOption.click();
      } else {
        // Try clicking first visible option
        const firstOption = this.page.locator('[role="option"]').first();
        await firstOption.click();
      }
      await this.page.waitForTimeout(500);

      // After selecting country, select timezone (now enabled)
      const timezoneTrigger = this.page.locator('text=Select timezone').first();
      if (await timezoneTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
        await timezoneTrigger.click();
        await this.page.waitForTimeout(500);

        // Select first available timezone
        const timezoneOption = this.page.locator('[role="option"]').first();
        await timezoneOption.waitFor({ state: 'visible', timeout: 5000 });
        await timezoneOption.click();
        await this.page.waitForTimeout(300);
      }
    }

    // Fill description (in rich text editor)
    const descriptionEditor = this.page.locator('.ProseMirror, [contenteditable="true"]').first();
    if (await descriptionEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionEditor.click();
      await descriptionEditor.fill(data.description);
    }

    // Fill terms if provided
    if (data.terms) {
      await this.page.click('[role="tab"]:has-text("Terms")');
      await this.page.waitForTimeout(500);
      const termsEditor = this.page.locator('.ProseMirror, [contenteditable="true"]').first();
      await termsEditor.click();
      await termsEditor.fill(data.terms);
    }

    // Add FAQ items if provided
    if (data.faq && data.faq.length > 0) {
      await this.page.click('[role="tab"]:has-text("FAQ")');
      await this.page.waitForTimeout(500);
      for (const item of data.faq) {
        const addFaqButton = this.page.locator('button:has-text("Add FAQ")');
        await addFaqButton.click();
        await this.page.waitForTimeout(300);
        // Fill the latest FAQ item
        const faqTitleInputs = this.page.locator('input[placeholder*="title"], input[placeholder*="Title"]');
        await faqTitleInputs.last().fill(item.title);
        const faqDescInputs = this.page.locator('textarea, .ProseMirror').last();
        await faqDescInputs.fill(item.description);
      }
    }

    // Select refund policy if provided
    if (data.refundPolicyId) {
      const policySelect = this.page.locator('button:has-text("Product Return Policy")');
      if (await policySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await policySelect.click();
        await this.page.locator(`[role="option"]`).first().click();
      }
    }
  }

  /**
   * Upload tour thumbnail (Step 2)
   */
  async uploadThumbnail() {
    // Minimal valid PNG image buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xMkMEa+wAAAGfSURBVHic7dMxAQAACAOgaf+/OxODI0AisBIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLECvoALPIAO/BwANgAAAAASUVORK5CYII=';
    const pngBuffer = Buffer.from(pngBase64, 'base64');

    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test-tour-thumbnail.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    // Wait for upload to complete
    console.log('[TourPage] Uploading thumbnail...');
    await this.page.waitForTimeout(6000);
    console.log('[TourPage] Thumbnail upload complete');
  }

  /**
   * Fill Step 3: Itinerary (Activity List)
   */
  async fillItinerary(activities: Array<{
    name: string;
    time: string;
    location?: string;
  }>) {
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      if (i > 0) {
        // Add new activity
        const addButton = this.page.locator('button:has-text("Add Activity"), button:has-text("Add Stop")');
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Fill activity details
      const nameInputs = this.page.locator('input[placeholder*="activity"], input[placeholder*="name"], input[placeholder*="Activity"]');
      const timeInputs = this.page.locator('input[type="time"], input[placeholder*="time"]');

      if (await nameInputs.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInputs.nth(i).fill(activity.name);
      }

      if (await timeInputs.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
        await timeInputs.nth(i).fill(activity.time);
      }

      // Fill location if provided
      if (activity.location) {
        const locationInputs = this.page.locator('input[placeholder*="location"], input[placeholder*="address"]');
        if (await locationInputs.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
          await locationInputs.nth(i).fill(activity.location);
          await this.page.waitForTimeout(1500); // Wait for autocomplete
          // Try to select first autocomplete result
          const autocompleteOption = this.page.locator('[role="option"]').first();
          if (await autocompleteOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await autocompleteOption.click();
          }
        }
      }
    }
  }

  /**
   * Fill Step 4: Ticket Variants
   */
  async fillTicketVariants(tickets: Array<{
    name: string;
    price: string;
    description?: string;
    peopleCount?: number;
    trackInventory?: boolean;
    quantity?: number;
  }>) {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];

      if (i > 0) {
        // Add new ticket variant
        const addButton = this.page.locator('button:has-text("Add Ticket"), button:has-text("Add Variant")');
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Find the ticket card/container
      const ticketCards = this.page.locator('[data-testid="ticket-variant-card"], .ticket-variant, [class*="ticket"]');

      // Fill ticket name
      const nameInput = ticketCards.nth(i).locator('input[placeholder*="name"], input[name*="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(ticket.name);
      } else {
        // Fallback: find by index in all name inputs
        const allNameInputs = this.page.locator('input[placeholder*="Ticket name"], input[name*="ticketVariants"][name*="name"]');
        if (await allNameInputs.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
          await allNameInputs.nth(i).fill(ticket.name);
        }
      }

      // Fill price
      const priceInput = ticketCards.nth(i).locator('input[type="number"], input[placeholder*="price"]').first();
      if (await priceInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priceInput.fill(ticket.price);
      } else {
        const allPriceInputs = this.page.locator('input[placeholder*="price"], input[name*="price"]');
        if (await allPriceInputs.nth(i).isVisible({ timeout: 2000 }).catch(() => false)) {
          await allPriceInputs.nth(i).fill(ticket.price);
        }
      }

      // Fill description if provided
      if (ticket.description) {
        const descInput = ticketCards.nth(i).locator('textarea, input[placeholder*="description"]').first();
        if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.fill(ticket.description);
        }
      }

      // Set people count if provided
      if (ticket.peopleCount && ticket.peopleCount > 1) {
        const peopleInput = ticketCards.nth(i).locator('input[name*="peopleCount"], input[placeholder*="people"]').first();
        if (await peopleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await peopleInput.fill(ticket.peopleCount.toString());
        }
      }
    }
  }

  /**
   * Click Next button
   */
  async clickNext() {
    const nextButton = this.page.locator(this.selectors.nextButton);
    await this.scrollAndClick(nextButton);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click Previous button
   */
  async clickPrevious() {
    const prevButton = this.page.locator(this.selectors.previousButton);
    await prevButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click Create Tour button (final step)
   */
  async clickCreateTour() {
    const createButton = this.page.locator(this.selectors.createTourButton);
    await this.scrollAndClick(createButton);
    await this.page.waitForTimeout(2000);
  }

  /**
   * Close dialog
   */
  async closeDialog() {
    const closeButton = this.page.locator(this.selectors.closeButton);
    await closeButton.click();
    await expect(this.page.locator(this.selectors.dialog)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Helper to scroll element into view and click
   */
  private async scrollAndClick(locator: ReturnType<Page['locator']>) {
    await locator.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      (el as HTMLElement).click();
    });
    await this.page.waitForTimeout(300);
  }

  /**
   * Create a complete tour with all steps
   */
  async createTour(data: {
    name: string;
    description: string;
    country?: string;
    activities: Array<{ name: string; time: string; location?: string }>;
    tickets: Array<{ name: string; price: string; description?: string }>;
  }): Promise<void> {
    // Step 1: Tour Details
    await this.fillTourDetails({
      name: data.name,
      description: data.description,
      country: data.country,
    });
    await this.clickNext();

    // Step 2: Thumbnail
    await this.uploadThumbnail();
    await this.clickNext();

    // Step 3: Itinerary
    await this.fillItinerary(data.activities);
    await this.clickNext();

    // Step 4: Tickets
    await this.fillTicketVariants(data.tickets);
    await this.clickCreateTour();
  }

  // ============ Events & Tours Page ============

  /**
   * Select a tour from the schedule dropdown
   */
  async selectTourForScheduling(tourName: string) {
    // The ComboBox component adds "-trigger" suffix to aria-label
    const tourCombobox = this.page.locator('[aria-label="combobox-schedule-tour-trigger"]');
    await tourCombobox.waitFor({ state: 'visible', timeout: 10000 });
    await tourCombobox.click();
    await this.page.waitForTimeout(500);

    // The ComboBox renders CommandItem with role="option" in a command list
    const tourOption = this.page.locator(`[cmdk-item][aria-label="combobox-schedule-tour-result"]:has-text("${tourName}")`);
    if (await tourOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourOption.click();
    } else {
      // Fallback: try any command item with the tour name
      const fallbackOption = this.page.locator(`[cmdk-item]:has-text("${tourName}")`).first();
      if (await fallbackOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallbackOption.click();
      }
    }
    await this.page.waitForTimeout(1000);
  }

  /**
   * Set capacity for tour sessions
   */
  async setSessionCapacity(capacity: number) {
    const capacityInput = this.page.locator('input[name="schedule.capacity"]');
    await capacityInput.waitFor({ state: 'visible', timeout: 5000 });
    await capacityInput.clear();
    await capacityInput.fill(capacity.toString());
  }

  /**
   * Select dates on calendar for scheduling
   */
  async selectDatesForScheduling(dates: Date[]) {
    // The calendar component allows multi-select
    for (const date of dates) {
      const day = date.getDate();
      const dayButton = this.page.locator(`[role="gridcell"] button:has-text("${day}")`).first();
      if (await dayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dayButton.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  /**
   * Save scheduled sessions
   */
  async saveSchedule() {
    const saveButton = this.page.locator('[aria-label="button-schedule-save"]');
    await saveButton.click();
    await this.page.waitForTimeout(2000);
  }

  // ============ Public Tour Booking ============

  /**
   * Select a date for booking
   */
  async selectBookingDate(dateString: string) {
    // Find the date button in the booking card
    const dateButton = this.page.locator(`button:has-text("${dateString}")`);
    await dateButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Select a time slot for booking
   */
  async selectBookingTimeSlot(timeString: string) {
    const timeButton = this.page.locator(`button:has-text("${timeString}")`);
    await timeButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Set ticket quantity
   */
  async setTicketQuantity(ticketName: string, quantity: number) {
    // Find the ticket section
    const ticketSection = this.page.locator(`div:has-text("${ticketName}")`).first();

    // Click the + button to increase quantity
    for (let i = 0; i < quantity; i++) {
      const plusButton = ticketSection.locator('button:has-text("+")');
      await plusButton.click();
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Fill customer email for booking
   */
  async fillCustomerEmail(email: string) {
    const emailInput = this.page.locator('input[type="email"]');
    await emailInput.fill(email);
  }

  /**
   * Click Book Now button
   */
  async clickBookNow() {
    const bookButton = this.page.locator('button:has-text("Book Now")');
    await bookButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Complete a booking flow
   */
  async completeBooking(data: {
    date: string;
    time: string;
    tickets: Array<{ name: string; quantity: number }>;
    email: string;
  }) {
    await this.selectBookingDate(data.date);
    await this.selectBookingTimeSlot(data.time);

    for (const ticket of data.tickets) {
      await this.setTicketQuantity(ticket.name, ticket.quantity);
    }

    await this.fillCustomerEmail(data.email);
    await this.clickBookNow();
  }

  /**
   * Check if booking was successful
   */
  async isBookingSuccessful(): Promise<boolean> {
    const successToast = this.page.locator('[data-sonner-toast]:has-text("Booking created")');
    return await successToast.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Get booking code from success message
   */
  async getBookingCode(): Promise<string | null> {
    const successToast = this.page.locator('[data-sonner-toast]');
    const text = await successToast.textContent();
    const match = text?.match(/booking code is (\w+)/i);
    return match ? match[1] : null;
  }

  // ============ Inline Checkout (New) ============

  /**
   * Fill email and proceed to payment
   */
  async proceedToPayment(email: string) {
    const emailInput = this.page.locator(this.selectors.bookingEmailInput);
    await emailInput.fill(email);
    await this.page.waitForTimeout(300);

    const proceedBtn = this.page.locator(this.selectors.proceedToPaymentBtn);
    await proceedBtn.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if Stripe payment form is visible
   */
  async isStripeFormVisible(): Promise<boolean> {
    // Look for Stripe Elements container
    const stripeFrame = this.page.locator('iframe[name*="stripe"]').first();
    return await stripeFrame.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Check if inline checkout is in payment step
   */
  async isInPaymentStep(): Promise<boolean> {
    const paymentElement = this.page.locator('[class*="StripeElement"], iframe[name*="stripe"]');
    return await paymentElement.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if booking confirmation is visible
   */
  async isBookingConfirmed(): Promise<boolean> {
    const confirmation = this.page.locator(this.selectors.bookingConfirmation);
    return await confirmation.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Get the booking code from confirmation
   */
  async getConfirmationBookingCode(): Promise<string | null> {
    const codeElement = this.page.locator('p.font-mono.font-bold, [data-testid="booking-code"]');
    if (await codeElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      return await codeElement.textContent();
    }
    return null;
  }

  // ============ Waitlist (New) ============

  /**
   * Check if session is full and waitlist button is visible
   */
  async isSessionFullWithWaitlist(sessionId?: string): Promise<boolean> {
    const selector = sessionId
      ? `[data-testid="join-waitlist-btn-${sessionId}"]`
      : this.selectors.joinWaitlistBtn;
    return await this.page.locator(selector).isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Click join waitlist button for a session
   */
  async clickJoinWaitlist(sessionId?: string) {
    const selector = sessionId
      ? `[data-testid="join-waitlist-btn-${sessionId}"]`
      : this.selectors.joinWaitlistBtn;
    await this.page.locator(selector).first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if waitlist dialog is open
   */
  async isWaitlistDialogOpen(): Promise<boolean> {
    return await this.page.locator(this.selectors.waitlistDialog).isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Fill waitlist form and submit
   */
  async submitWaitlistForm(email: string, tickets: Array<{ variantId: string; quantity: number }>) {
    // Fill email
    const emailInput = this.page.locator(this.selectors.waitlistEmailInput);
    await emailInput.fill(email);

    // Set ticket preferences using + buttons
    for (const ticket of tickets) {
      for (let i = 0; i < ticket.quantity; i++) {
        // Find the ticket row and click + button
        const ticketRow = this.page.locator(`div:has-text("${ticket.variantId}")`).first();
        const plusBtn = ticketRow.locator('button:has-text("+")');
        if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await plusBtn.click();
          await this.page.waitForTimeout(200);
        }
      }
    }

    // Submit
    const submitBtn = this.page.locator(this.selectors.waitlistSubmitBtn);
    await submitBtn.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if waitlist submission was successful
   */
  async isWaitlistSubmissionSuccessful(): Promise<boolean> {
    const successMessage = this.page.locator(this.selectors.waitlistSuccess);
    return await successMessage.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Get waitlist position from success dialog
   */
  async getWaitlistPosition(): Promise<number | null> {
    const positionElement = this.page.locator('p:has-text("#")');
    if (await positionElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await positionElement.textContent();
      const match = text?.match(/#(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
  }

  /**
   * Close waitlist dialog
   */
  async closeWaitlistDialog() {
    const doneBtn = this.page.locator('button:has-text("Done")');
    if (await doneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneBtn.click();
    } else {
      const closeBtn = this.page.locator('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button[aria-label="Close"]').first();
      await closeBtn.click();
    }
    await this.page.waitForTimeout(500);
  }

  // ============ Session Capacity Helpers ============

  /**
   * Get remaining capacity text for a session
   */
  async getSessionRemainingCapacity(sessionTime: string): Promise<string | null> {
    const sessionBtn = this.page.locator(`button:has-text("${sessionTime}")`);
    const capacityText = sessionBtn.locator('div:has-text("left"), div:has-text("Full")');
    return await capacityText.textContent().catch(() => null);
  }

  /**
   * Check if any session is marked as Full
   */
  async hasFullSession(): Promise<boolean> {
    const fullBadge = this.page.locator('span:has-text("Full"), div:has-text("Full")');
    return await fullBadge.isVisible({ timeout: 5000 }).catch(() => false);
  }
}

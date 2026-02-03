# Practitioner Profile System Design

## Overview

This document outlines the design for practitioner profiles on SpiriVerse, enabling spiritual practitioners (tarot readers, mediums, healers, coaches) to have person-focused profiles distinct from commerce-focused merchant profiles.

---

## Core Concept

**The Problem:** The current platform is built around commerce (merchants selling products/services). Practitioners need person-focused profiles where seekers connect with the practitioner first, then their offerings.

**The Solution:** Add `docType` discriminator to vendor records, with practitioner-specific fields and UI.

---

## 1. Data Model

### 1.1 DocType Discriminator

```typescript
enum VendorDocType {
  MERCHANT       // Commerce-focused (products, tours, events)
  PRACTITIONER   // Person-focused (readings, healing, coaching)
}
```

- One docType per document (no hybrid)
- Same user can have multiple vendor records (one merchant, one practitioner)
- Documents stay small and focused

### 1.2 Practitioner Profile Schema

```typescript
// Added to vendor_type when docType = "PRACTITIONER"
practitioner?: {
  // Identity
  pronouns?: string                    // "she/her", "they/them"
  headline: string                     // "Intuitive Tarot Reader & Grief Counselor"

  // Personal Story
  bio: string                          // Rich text - journey, approach
  spiritualJourney?: string            // How they discovered their gifts

  // Gifts & Modalities
  modalities: PractitionerModality[]   // TAROT, MEDIUMSHIP, REIKI, etc.
  gifts?: string[]                     // Free-form: "Clairvoyant", "Empath"
  tools?: string[]                     // "Rider-Waite Tarot", "Pendulum"

  // Specializations
  specializations: Specialization[]    // GRIEF_LOSS, RELATIONSHIPS, CAREER, etc.
  customSpecializations?: string[]     // Free-form additions

  // Experience & Credentials
  yearsExperience?: number
  training?: TrainingCredential[]      // Certifications, lineages

  // Reading Style
  readingStyle?: "GENTLE" | "DIRECT" | "INTUITIVE" | "STRUCTURED"
  approach?: string                    // Free text describing style
  whatToExpect?: string                // "In our session, you can expect..."
  clientPrepGuidance?: string          // "Before your reading, please..."

  // Availability
  availability: "ACCEPTING_CLIENTS" | "WAITLIST" | "NOT_ACCEPTING"
  acceptingNewClients: boolean
  responseTime?: string                // "Usually within 24 hours"
  timezone?: string

  // Verification
  verification: {
    identityVerified: boolean
    practitionerVerified: boolean
    verifiedAt?: string
    badges?: ("FEATURED" | "TOP_RATED" | "ESTABLISHED")[]
  }
}
```

### 1.3 Modality & Specialization Enums

```typescript
enum PractitionerModality {
  TAROT
  ORACLE
  ASTROLOGY
  NUMEROLOGY
  MEDIUMSHIP
  CHANNELING
  REIKI
  ENERGY_HEALING
  CRYSTAL_HEALING
  AKASHIC_RECORDS
  PAST_LIFE
  BREATHWORK
  SOUND_HEALING
  COACHING
  COUNSELING
  OTHER
}

enum Specialization {
  GRIEF_LOSS
  RELATIONSHIPS
  CAREER
  LIFE_PURPOSE
  SPIRITUAL_AWAKENING
  ANCESTRAL_HEALING
  SHADOW_WORK
  SELF_DISCOVERY
  DECISION_MAKING
  HEALTH_WELLNESS
  PAST_LIVES
  SPIRIT_COMMUNICATION
  OTHER
}
```

### 1.4 Training Credential Type

```typescript
type TrainingCredential = {
  title: string              // "Certified Reiki Master"
  institution?: string       // "International Reiki Association"
  year?: number
  description?: string
}
```

---

## 2. Featured Practitioner Relationship

Shops (merchants) can feature practitioners at their location, similar to real-world crystal shops.

### 2.1 Relationship Type

```typescript
type FeaturedPractitioner = {
  id: string
  merchantId: string           // The shop
  practitionerId: string       // The practitioner

  // Status
  status: "PENDING" | "ACTIVE" | "DECLINED" | "ENDED"
  invitedAt: string
  acceptedAt?: string

  // Arrangement
  arrangement: "IN_STORE" | "ONLINE_ONLY" | "BOTH"

  // Schedule
  schedule?: {
    type: "RECURRING" | "BY_APPOINTMENT" | "CUSTOM"
    recurring?: RecurringSlot[]
    customDates?: ScheduledDate[]
    note?: string
  }

  // Display
  featured: boolean
  displayOrder?: number
  locationNote?: string        // "Back room past the crystals"
}

type RecurringSlot = {
  day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"
  startTime: string            // "10:00"
  endTime: string              // "16:00"
  timezone: string
}

type ScheduledDate = {
  date: string                 // "2025-02-14"
  startTime: string
  endTime: string
  note?: string                // "Valentine's Special Readings"
}
```

### 2.2 Flow

1. Shop owner invites practitioner
2. Practitioner receives notification
3. Practitioner accepts/declines
4. If accepted, relationship becomes ACTIVE
5. Practitioner sets their schedule at that location
6. Shop page displays "Practitioners at [Shop]" section
7. Practitioner profile shows "Where to find me" section

---

## 3. URL Structure

```
/p/[practitioner_slug]    Practitioner profile (person-first)
/m/[merchant_slug]        Merchant profile (catalogue-first)
```

Same user with both:
```
/m/crystal-jane           Her crystal shop
/p/jane-smith             Her practitioner profile
```

---

## 4. Onboarding Flow

### Step 1: Who You Are (Required)
- Display name
- Profile photo
- Headline (one-liner)
- Profile URL

### Step 2: Your Gifts (Required)
- Modalities (multi-select)
- Specializations (multi-select)

### Step 3: Your Story (Required)
- Bio textarea

### Step 4: Your Services (Optional)
- Set up first service OR skip

### Step 5: Monetization (Optional)
- Free/Donation-based OR Paid services
- Stripe Connect if paid

### Step 6: Review & Publish
- Profile preview
- Visibility setting
- Publish

---

## 5. Public Profile Display

### Layout (Top to Bottom)

1. **Header**
   - Cover photo
   - Profile photo (round)
   - Name, pronouns
   - Headline
   - Rating & reviews count
   - Readings completed count
   - Verification badge
   - CTAs: Book, Follow, Message

2. **About**
   - Bio text
   - Read more expansion

3. **Specializations & Modalities**
   - Tag chips for each
   - Tools listed

4. **Services**
   - Cards for each service offering
   - Price, delivery time
   - Book/View buttons

5. **What to Expect**
   - Session preparation guidance

6. **Background & Training**
   - Years experience
   - Credentials list

7. **Reviews**
   - Star rating breakdown
   - Individual review cards
   - View all link

8. **Where to Find Me** (if featured at shops)
   - Shop cards with schedule
   - Online availability

9. **Availability Footer**
   - Accepting clients status
   - Response time
   - Timezone
   - Social links

---

## 6. Discovery / Browse Pages

### 6.1 Home Page Enhancement

Add category tiles:
- Tarot Readers
- Mediumship
- Energy Healing
- Astrology
- [Browse All]

### 6.2 Practitioner Directory

**Route:** `/practitioners`

Features:
- Search by name/keyword
- Filter by modality
- Filter by specialization
- Filter by rating
- Filter by accepting clients
- Sort by rating, reviews, readings completed
- Infinite scroll results

### 6.3 Category Landing Pages

**Routes:** `/tarot`, `/mediumship`, `/healing`, `/astrology`

- Category description
- Featured practitioners
- "What can [modality] help with?"
- Browse all in category

### 6.4 Search Enhancement

Extend search to include:
- Practitioner name, headline, bio
- Modalities
- Specializations
- Filter by type (practitioners vs products)

---

## 7. SpiriReadings Integration

Practitioners connect to the existing SpiriReadings system:

### 7.1 How It Works

1. Practitioner has Stripe Connect account
2. Sees Request Bank in their dashboard
3. Claims available reading requests
4. Fulfills with cards + interpretation
5. Gets paid (80% after platform fee)
6. Reviews aggregate to their `readingRating`

### 7.2 Profile Display

- Show "Available on SpiriReadings" badge
- Display readings completed count
- Show aggregate rating from SpiriReadings
- "Request a Reading from [Name]" CTA

### 7.3 Fulfilled Reading View

When seeker views their reading, show:
- Practitioner photo, name, rating
- Link to practitioner profile
- "Book Again" CTA

---

## 8. GraphQL Queries

### 8.1 Practitioner Discovery

```graphql
type Query {
  practitioners(
    modalities: [PractitionerModality]
    specializations: [Specialization]
    minRating: Float
    acceptingClients: Boolean
    verifiedOnly: Boolean
    search: String
    sort: PractitionerSort
    limit: Int
    offset: Int
  ): PractitionerSearchResult!

  featuredPractitioners(
    modality: PractitionerModality
    limit: Int
  ): [Vendor!]!

  practitionersAtShop(
    merchantId: String!
    date: String
  ): PractitionersAtShopResult!
}

enum PractitionerSort {
  RATING_HIGH
  REVIEWS_MOST
  READINGS_MOST
  NEWEST
  RELEVANCE
}
```

### 8.2 Featured Practitioner Management

```graphql
type Query {
  featuredPractitioners(merchantId: String!): [FeaturedPractitioner!]!
  practitionerLocations(practitionerId: String!): [FeaturedPractitioner!]!
}

type Mutation {
  invitePractitioner(
    merchantId: String!
    practitionerId: String!
    details: InviteInput!
  ): FeaturedPractitioner!

  respondToInvitation(
    invitationId: String!
    accept: Boolean!
  ): FeaturedPractitioner!

  updatePractitionerSchedule(
    featuredId: String!
    schedule: ScheduleInput!
  ): FeaturedPractitioner!

  endFeaturedRelationship(
    featuredId: String!
  ): FeaturedPractitioner!
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation
- [ ] Add `docType` field to vendor_type
- [ ] Add `practitioner` nested object schema
- [ ] Create practitioner onboarding flow (Steps 1-3)
- [ ] Create basic public profile page (`/p/[slug]`)
- [ ] Allow practitioners to create services
- [ ] Connect to SpiriReadings

### Phase 2: Discovery
- [ ] Build practitioner directory page (`/practitioners`)
- [ ] Add filters (modality, specialization, rating)
- [ ] Add search functionality
- [ ] Add category tiles to home page
- [ ] Create category landing pages

### Phase 3: Trust & Reviews
- [ ] Display reviews on practitioner profiles
- [ ] Build review submission UI
- [ ] Implement verification workflow
- [ ] Add verification badges
- [ ] Show SpiriReadings stats prominently

### Phase 4: Featured at Shops
- [ ] Create featured_practitioner relationship type
- [ ] Build invitation flow
- [ ] Add schedule management UI
- [ ] Display practitioners on shop pages
- [ ] Display "Where to find me" on practitioner profiles
- [ ] "Who's here today" feature

### Phase 5: Migration & Polish
- [ ] Migrate existing reading-focused merchants to PRACTITIONER docType
- [ ] Handle URL redirects
- [ ] Add "Book from Profile" deep links
- [ ] Performance optimization

---

## 10. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hybrid docType? | No | Keeps documents small, clear separation |
| Multiple profiles per user? | Yes (separate vendors) | User can have shop AND practitioner profile |
| Separate container? | No | Use docType discriminator on Main-Vendor |
| Reviews per reading vs per practitioner? | Both | Individual reviews aggregate to profile rating |
| Shop-practitioner relationship? | Invitation-based | Mirrors real-world crystal shop model |

---

## 11. Related Files

**Backend:**
- `graphql-backend/src/graphql/vendor/types.ts` - Add practitioner fields
- `graphql-backend/src/graphql/reading-request/` - Already supports practitioners

**Frontend:**
- `saas-frontend/src/app/(site)/p/` - New practitioner profile pages
- `saas-frontend/src/app/(site)/practitioners/` - New directory page
- `saas-frontend/src/app/(site)/m/[slug]/(manage)/` - Add practitioner management

---

## 12. Test-Driven Development (TDD)

All practitioner profile features must be built test-first. Follow the patterns in `/saas-frontend/tests/TESTING_GUIDELINES.md`.

### 12.1 Test File Structure

```
saas-frontend/tests/
├── e2e/
│   ├── practitioner-signup.spec.ts        # Onboarding flow
│   ├── practitioner-profile.spec.ts       # Profile editing
│   ├── practitioner-profile-public.spec.ts # Public profile display
│   ├── practitioner-directory.spec.ts     # Browse/search practitioners
│   ├── practitioner-services.spec.ts      # Service creation
│   ├── practitioner-spiri-readings.spec.ts # SpiriReadings integration
│   ├── practitioner-featured.spec.ts      # Shop ↔ practitioner relationship
│   └── practitioner-reviews.spec.ts       # Review display/submission
│
├── pages/
│   ├── PractitionerSetupPage.ts           # Onboarding page object
│   ├── PractitionerProfilePage.ts         # Profile editing page object
│   ├── PractitionerPublicPage.ts          # Public profile page object
│   ├── PractitionerDirectoryPage.ts       # Directory page object
│   └── FeaturedPractitionerPage.ts        # Shop featuring page object
│
└── utils/
    └── practitioner-test-helpers.ts       # Practitioner-specific helpers
```

### 12.2 Parallel-Safe State Pattern

**CRITICAL:** All tests must use the Map pattern for parallel execution.

```typescript
// ✅ CORRECT - Parallel-safe
const practitionerPerWorker = new Map<number, {
  id: string;
  slug: string;
  cookies: string;
}>();

test.beforeAll(async ({ browser }, testInfo) => {
  const workerId = testInfo.parallelIndex;
  // Setup practitioner for this worker
  const practitioner = await createTestPractitioner(workerId);
  practitionerPerWorker.set(workerId, practitioner);
});

test.afterAll(async ({}, testInfo) => {
  const workerId = testInfo.parallelIndex;
  const practitioner = practitionerPerWorker.get(workerId);
  if (practitioner) {
    await cleanupTestPractitioner(practitioner.cookies, practitioner.id);
  }
  practitionerPerWorker.delete(workerId);
});

// ❌ WRONG - Module-level shared state
let practitionerCookies: string; // NEVER DO THIS
```

### 12.3 Required data-testid Attributes

Add these to components as you build them:

**Onboarding:**
```
practitioner-setup-name-input
practitioner-setup-headline-input
practitioner-setup-photo-upload
practitioner-setup-slug-input
practitioner-setup-modality-{modality}
practitioner-setup-specialization-{spec}
practitioner-setup-bio-input
practitioner-setup-continue-btn
practitioner-setup-publish-btn
```

**Profile Editing:**
```
practitioner-edit-pronouns-input
practitioner-edit-bio-input
practitioner-edit-journey-input
practitioner-edit-approach-input
practitioner-edit-expectations-input
practitioner-edit-add-training-btn
practitioner-edit-training-title-input
practitioner-edit-save-btn
```

**Public Profile:**
```
practitioner-profile-name
practitioner-profile-headline
practitioner-profile-rating
practitioner-profile-reviews-count
practitioner-profile-readings-count
practitioner-profile-verified-badge
practitioner-profile-bio
practitioner-profile-modality-{modality}
practitioner-profile-specialization-{spec}
practitioner-profile-service-card-{id}
practitioner-profile-review-card-{id}
practitioner-profile-book-btn
practitioner-profile-follow-btn
```

**Directory:**
```
practitioner-directory-search-input
practitioner-directory-filter-modality
practitioner-directory-filter-specialization
practitioner-directory-filter-rating
practitioner-directory-sort-select
practitioner-directory-card-{id}
practitioner-directory-load-more-btn
```

**Featured at Shop:**
```
shop-practitioners-section
shop-practitioner-card-{id}
shop-practitioner-schedule-{id}
shop-practitioner-today-badge
shop-invite-practitioner-btn
shop-weekly-schedule-grid
```

### 12.4 E2E Test Scenarios by Phase

#### Phase 1: Foundation Tests

```typescript
// practitioner-signup.spec.ts
describe('Practitioner Signup', () => {
  test('should complete basic onboarding flow', async () => {
    // 1. Navigate to practitioner signup
    // 2. Enter name, headline, slug
    // 3. Select modalities (TAROT, MEDIUMSHIP)
    // 4. Select specializations (GRIEF_LOSS, RELATIONSHIPS)
    // 5. Enter bio
    // 6. Skip monetization
    // 7. Publish profile
    // 8. Verify profile is live at /p/[slug]
  });

  test('should validate required fields', async () => {
    // 1. Try to continue without name → error
    // 2. Try to continue without modalities → error
    // 3. Try to continue without bio → error
  });

  test('should handle slug uniqueness', async () => {
    // 1. Create practitioner with slug "jane-smith"
    // 2. Try to create another with same slug → error
    // 3. Suggest alternative slug
  });

  test('should setup Stripe when monetization enabled', async () => {
    // 1. Complete basic steps
    // 2. Select "Paid services"
    // 3. Mock Stripe Connect flow
    // 4. Verify stripe account linked
  });
});

// practitioner-profile.spec.ts
describe('Practitioner Profile Editing', () => {
  test('should update bio and save', async () => {
    // 1. Login as practitioner
    // 2. Navigate to profile edit
    // 3. Update bio text
    // 4. Save
    // 5. Verify change persists on public profile
  });

  test('should add training credentials', async () => {
    // 1. Click "Add Training"
    // 2. Enter title, institution, year
    // 3. Save
    // 4. Verify displays on public profile
  });

  test('should update modalities', async () => {
    // 1. Add new modality
    // 2. Remove existing modality
    // 3. Save
    // 4. Verify changes on public profile
  });
});
```

#### Phase 2: Discovery Tests

```typescript
// practitioner-directory.spec.ts
describe('Practitioner Directory', () => {
  test('should display practitioners list', async () => {
    // 1. Navigate to /practitioners
    // 2. Verify practitioners are displayed
    // 3. Verify each card shows name, headline, rating
  });

  test('should filter by modality', async () => {
    // 1. Select TAROT filter
    // 2. Verify only tarot practitioners shown
    // 3. Clear filter
    // 4. Verify all practitioners shown
  });

  test('should filter by specialization', async () => {
    // 1. Select GRIEF_LOSS filter
    // 2. Verify filtered results
  });

  test('should search by name', async () => {
    // 1. Enter practitioner name in search
    // 2. Verify matching results
    // 3. Clear search
    // 4. Verify full list restored
  });

  test('should sort by rating', async () => {
    // 1. Select "Highest Rated" sort
    // 2. Verify order is descending by rating
  });

  test('should load more on scroll', async () => {
    // 1. Scroll to bottom
    // 2. Verify more practitioners load
    // 3. Verify no duplicates
  });
});

// practitioner-profile-public.spec.ts
describe('Public Practitioner Profile', () => {
  test('should display all profile sections', async () => {
    // 1. Navigate to /p/[slug]
    // 2. Verify header (name, headline, photo, rating)
    // 3. Verify bio section
    // 4. Verify modalities/specializations
    // 5. Verify services section
    // 6. Verify reviews section
  });

  test('should navigate to book reading', async () => {
    // 1. Click "Book Reading" button
    // 2. Verify redirects to service/booking page
  });

  test('should follow practitioner', async () => {
    // 1. Login as seeker
    // 2. Click Follow
    // 3. Verify button changes to "Following"
    // 4. Refresh page
    // 5. Verify still following
  });
});
```

#### Phase 3: Reviews Tests

```typescript
// practitioner-reviews.spec.ts
describe('Practitioner Reviews', () => {
  test('should display reviews on profile', async () => {
    // 1. Navigate to practitioner with reviews
    // 2. Verify rating breakdown displayed
    // 3. Verify individual review cards
    // 4. Verify reviewer name, date, text
  });

  test('should submit review after reading', async () => {
    // Setup: Create fulfilled reading
    // 1. Navigate to fulfilled reading
    // 2. Click "Leave Review"
    // 3. Select 5 stars
    // 4. Enter headline and text
    // 5. Submit
    // 6. Verify review appears on practitioner profile
  });

  test('should update practitioner rating after review', async () => {
    // 1. Note current rating
    // 2. Submit new 5-star review
    // 3. Verify rating recalculated
    // 4. Verify review count incremented
  });
});
```

#### Phase 4: Featured at Shop Tests

```typescript
// practitioner-featured.spec.ts
describe('Featured Practitioner at Shop', () => {
  test('should send invitation from shop', async () => {
    // 1. Login as shop owner
    // 2. Navigate to manage practitioners
    // 3. Search for practitioner
    // 4. Click "Invite"
    // 5. Set arrangement (IN_STORE)
    // 6. Verify invitation sent
  });

  test('should accept invitation as practitioner', async () => {
    // Setup: Create pending invitation
    // 1. Login as practitioner
    // 2. Navigate to invitations
    // 3. Accept invitation
    // 4. Set schedule (Tuesdays 10am-4pm)
    // 5. Verify relationship ACTIVE
  });

  test('should display practitioner on shop page', async () => {
    // Setup: Create ACTIVE featured relationship
    // 1. Navigate to shop public page
    // 2. Verify "Practitioners" section visible
    // 3. Verify practitioner card displayed
    // 4. Verify schedule shown
  });

  test('should show "here today" indicator', async () => {
    // Setup: Practitioner scheduled for today
    // 1. Navigate to shop page
    // 2. Verify "Here Today" badge on practitioner
  });

  test('should display shop on practitioner profile', async () => {
    // Setup: ACTIVE featured relationship
    // 1. Navigate to practitioner profile
    // 2. Verify "Where to Find Me" section
    // 3. Verify shop card with schedule
  });

  test('should manage schedule', async () => {
    // 1. Login as practitioner
    // 2. Navigate to featured location
    // 3. Add Friday schedule
    // 4. Remove Tuesday schedule
    // 5. Save
    // 6. Verify changes on shop page
  });
});
```

#### Phase 5: SpiriReadings Integration Tests

```typescript
// practitioner-spiri-readings.spec.ts
describe('Practitioner SpiriReadings', () => {
  test('should see SpiriReadings in dashboard', async () => {
    // 1. Login as practitioner with Stripe
    // 2. Verify SpiriReadings menu item visible
    // 3. Navigate to Request Bank
    // 4. Verify requests displayed
  });

  test('should claim reading request', async () => {
    // Setup: Create awaiting reading request
    // 1. Navigate to Request Bank
    // 2. Find request
    // 3. Click Claim
    // 4. Verify moves to My Claims
    // 5. Verify disappears from Request Bank
  });

  test('should fulfill reading', async () => {
    // Setup: Claimed reading request
    // 1. Navigate to My Claims
    // 2. Click Fulfill
    // 3. Upload photo
    // 4. Enter card interpretations
    // 5. Submit
    // 6. Verify status FULFILLED
  });

  test('should display stats on practitioner profile', async () => {
    // Setup: Practitioner with fulfilled readings
    // 1. Navigate to public profile
    // 2. Verify "readings completed" count
    // 3. Verify rating from SpiriReadings
    // 4. Verify "Available on SpiriReadings" badge
  });
});
```

### 12.5 Test Data Patterns

```typescript
// practitioner-test-helpers.ts

export function generateTestPractitioner(workerId: number) {
  const timestamp = Date.now();
  return {
    email: `test-practitioner-${timestamp}-${workerId}@playwright.com`,
    name: `Test Practitioner ${workerId}`,
    slug: `test-practitioner-${timestamp}-${workerId}`,
    headline: 'Test Tarot Reader',
    bio: 'Test bio for automated testing.',
    modalities: ['TAROT', 'ORACLE'],
    specializations: ['RELATIONSHIPS', 'CAREER'],
  };
}

export async function createTestPractitioner(
  page: Page,
  workerId: number
): Promise<{ id: string; slug: string; cookies: string }> {
  const data = generateTestPractitioner(workerId);
  // Navigate through onboarding
  // Return practitioner details
}

export async function cleanupTestPractitioner(
  cookies: string,
  practitionerId: string
): Promise<void> {
  // GraphQL mutation to delete test practitioner
  await gqlDirect(`
    mutation DeleteTestVendor($id: String!) {
      deleteVendor(id: $id) { success }
    }
  `, { id: practitionerId }, cookies);
}
```

### 12.6 GraphQL Test Helpers

```typescript
// For testing backend mutations directly
export async function testCreatePractitioner(
  cookies: string,
  input: CreatePractitionerInput
): Promise<Vendor> {
  return gqlDirect(`
    mutation CreatePractitioner($input: CreatePractitionerInput!) {
      createPractitioner(input: $input) {
        id
        slug
        docType
        practitioner {
          headline
          modalities
          specializations
        }
      }
    }
  `, { input }, cookies);
}

export async function testInvitePractitioner(
  cookies: string,
  merchantId: string,
  practitionerId: string
): Promise<FeaturedPractitioner> {
  return gqlDirect(`
    mutation InvitePractitioner($merchantId: String!, $practitionerId: String!) {
      invitePractitioner(merchantId: $merchantId, practitionerId: $practitionerId) {
        id
        status
      }
    }
  `, { merchantId, practitionerId }, cookies);
}
```

### 12.7 Test Execution Commands

```bash
# Run all practitioner tests
yarn playwright test --grep "practitioner"

# Run specific test file
yarn playwright test practitioner-signup.spec.ts

# Run with UI for debugging
yarn playwright test practitioner-signup.spec.ts --ui

# Run headed (see browser)
yarn playwright test practitioner-signup.spec.ts --headed

# Run single test
yarn playwright test --grep "should complete basic onboarding"
```

### 12.8 TDD Workflow

For each feature:

1. **Write failing test first**
   ```typescript
   test('should display practitioner headline', async () => {
     await page.goto('/p/test-practitioner');
     await expect(page.getByTestId('practitioner-profile-headline'))
       .toContainText('Intuitive Tarot Reader');
   });
   ```

2. **Run test → confirm it fails**
   ```bash
   yarn playwright test --grep "should display practitioner headline"
   # ❌ FAIL - Element not found
   ```

3. **Implement minimum code to pass**
   - Add `data-testid="practitioner-profile-headline"` to component
   - Fetch and display headline data

4. **Run test → confirm it passes**
   ```bash
   yarn playwright test --grep "should display practitioner headline"
   # ✅ PASS
   ```

5. **Refactor if needed, keeping tests green**

### 12.9 Coverage Requirements

Before marking a phase complete:

| Phase | Required Test Coverage |
|-------|------------------------|
| Phase 1 | Onboarding flow, profile editing, basic public profile |
| Phase 2 | Directory page, filters, search, category pages |
| Phase 3 | Review display, review submission, rating aggregation |
| Phase 4 | Invitation flow, schedule management, shop display |
| Phase 5 | SpiriReadings integration, stats display |

**All tests must pass before merging any phase.**

---

*Document created: January 2026*
*Status: Approved for implementation*

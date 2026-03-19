# Changelog

## March 2026

### Tours & Bookings
- Full tour booking flow working end-to-end: create tour, schedule sessions, customer books, merchant manages
- Self-service booking modification — customers can change ticket quantities with live price preview
- Booking confirmation email sent after payment with booking code, date, time, and tickets
- 24-hour and 2-hour tour reminder emails sent automatically via Container Apps Job
- Post-tour review request emails sent to checked-in customers 2-48 hours after session
- Waitlist auto-promotion — next person notified when a spot opens from cancellation or modification
- Add to Google Calendar button on booking confirmation and booking lookup pages
- Customer booking management page with prominent booking code, cancellation, and refund policy display
- Merchant-side booking cancellation with automatic Stripe refund
- CSV export for bookings from session operate page
- CSV export for analytics data with tour filter
- Session delete for empty sessions
- Open Graph metadata on tour pages for social media link previews
- Find My Booking page for customers to look up bookings by code
- Feature parity for logged-in and guest customers (authed users skip email verification)
- My Bookings page now has "Manage" button linking to booking portal

### Tour Booking Page (Customer-Facing)
- Spots available and urgency indicators on date picker
- Tour duration, stops count, and starting price shown at top of booking card
- Rich booking confirmation with date, time, people count, and booking management link
- Activity locations shown on tour itinerary
- Mobile-first layout (booking card shows first on small screens)
- Responsive hero image
- Better empty states when no dates available

### Tour Management (Merchant-Facing)
- Sessions list redesigned with capacity progress bars
- Operate Session button gated to Manifest tier only
- Analytics tour filter — filter all metrics by specific tour
- Schedule page labels improved (Max guests per session, Schedule Sessions)
- Itinerary selector hidden when tour has only one itinerary
- Schedule summary now renders correctly
- Refund Policy label replaces confusing "Product Return Policy" throughout
- Inline validation on tour name in creation wizard
- Better empty states with guidance for new merchants

### SpiriAssist
- Fixed case invoicing — practitioner invoice creation was missing required order fields
- Fixed order creation failing for case invoice lines
- Fixed fee summary not loading when customer has no billing address
- Added E2E tests for multiple practitioner applications and case invoicing
- Test history reporter for tracking test run results across sessions

### Platform & Onboarding
- Changed setup button from "Let's Setup" to "Free Trial"
- Greyed-out pricing tiers now clickable on hover (for power users)
- Toned down merchant onboarding panel from blinding orange to warm amber
- Improved merchant setup form layout (Business Name + Email on same row, Logo + URL on same row)
- Always show Mediumship flyout in Space sidenav (was linking directly when only one sub-item)
- Removed max-width constraints from Symbols, Dictionary, and My Card Symbols pages
- Added "Find My Booking" link to home page sign-in area

### Bug Fixes
- Fixed tours not appearing in schedule dropdown (missing vendorId on tour creation)
- Fixed tour creation wizard infinite re-render loop (nested DialogContent)
- Fixed tour wizard navigating to 404 page (used merchantId instead of slug in URL)
- Fixed public tour page crash on missing thumbnail
- Fixed sessions query failing (balanceDue field doesn't exist on Order type)
- Fixed booking lookup page using wrong time fields (from/to instead of start/end)
- Fixed schedule session mutation crashing on stale ticketList reference
- Fixed sessions component not loading data (wrong URL parameter)
- Fixed UseMerchantTours query not unwrapping CatalogueResult.listings
- Fixed UseMerchantTour querying non-existent ticketLists field
- Fixed UseTourDetails querying non-existent vendor field on Tour type
- Fixed Tour-Session composite index missing (date + time ordering)
- Fixed purge_vendor not cleaning up owner's vendor reference (was patching admin user instead)
- Fixed case lookup throwing errors for purged/deleted cases
- Fixed auth flow for new Sign Up / Log In split button layout
- Fixed null vendor references crashing home page for users with purged vendors

## February 2026

- Fixed practitioner "Manage Payment Method" not working (Payment Cards and Banking dialogs were missing from practitioner sidenav)
- Fixed practitioners unable to upgrade/downgrade subscription plans (was restricted to merchants only)
- Fixed file upload error message showing developer-speak and being invisible on dark backgrounds
- Fixed service descriptions rendering raw HTML tags on public practitioner profile and service detail pages
- Fixed event form image upload silently failing due to incorrect omit path
- Fixed "Send Message" button invisible on practitioner profile (white text on white background)
- Fixed ChatToggleButton using low-contrast link color
- Improved gallery dialog width to better use available space
- Added in-browser audio recording to practitioner Audio Introduction (record, preview, re-record, upload)
- Added toast error feedback for event form save failures
- Replaced legal documents version history modal with inline History tab (two-panel layout: version timeline + content preview)
- Fixed dark mode text readability across legal documents admin console (prose text, metadata labels, font sizes)

## January 2025

- Added personalized home feed for logged-in users showing video updates and daily oracle messages from followed practitioners and merchants
- Added recommended vendors query matching users by spiritual interests with popular vendor backfill
- Added infinite scroll feed with vendor avatars, video players, and audio players for oracle messages
- Home page now shows compact header with search bar and quick-access space links for logged-in users
- Follow/unfollow actions now refresh feed and recommendations automatically

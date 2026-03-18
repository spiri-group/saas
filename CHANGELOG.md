# Changelog

## March 2026

### Tours & Bookings
- Full tour booking flow working end-to-end: create tour, schedule sessions, customer books, merchant manages
- Booking confirmation email sent to customers after payment with booking code, date, time, and tickets
- 24-hour tour reminder emails sent automatically via Container Apps Job
- Add to Google Calendar button on booking confirmation and booking lookup pages
- Customer booking management page with prominent booking code, cancellation, and refund policy display
- Merchant-side booking cancellation with automatic Stripe refund
- CSV export for bookings from session operate page
- CSV export for analytics data
- Session delete for empty sessions
- Open Graph metadata on tour pages for social media link previews

### Tour Booking Page (Customer-Facing)
- Spots available and urgency indicators on date picker
- Tour duration, stops count, and starting price shown at top of booking card
- Rich booking confirmation with date, time, people count, and email
- Activity locations shown on tour itinerary
- Mobile-first layout (booking card shows first on small screens)
- Responsive hero image
- Better empty states when no dates available

### Tour Management (Merchant-Facing)
- Sessions list redesigned with capacity progress bars
- Operate Session button gated to Manifest tier only
- Schedule page labels improved (Max guests per session, Schedule Sessions)
- Itinerary selector hidden when tour has only one itinerary
- Schedule summary now renders correctly (was broken by stale ticketList reference)
- Refund Policy label replaces confusing "Product Return Policy" throughout
- Inline validation on tour name in creation wizard
- Better empty states with guidance for new merchants

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
- Fixed merchant onboarding panel colour (toned down from blinding orange)
- Improved merchant setup form layout (Business Name + Email on same row, Logo + URL on same row)
- Fixed auth flow for new Sign Up / Log In split button layout

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

# Changelog

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

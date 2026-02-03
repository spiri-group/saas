import BookingCancellationUI from "./ui";

interface BookingPageProps {
    params: Promise<{
        merchantSlug: string;
        bookingCode: string;
    }>;
}

/**
 * Public booking cancellation page
 * Accessible without authentication via link: /booking/merchant-slug/ABC123
 *
 * Flow:
 * 1. Customer receives email with link to this page
 * 2. Page shows their booking details (tour, date, tickets)
 * 3. If cancellation is allowed (based on tour's cancellation policy), show "Cancel Booking" button
 * 4. Customer enters email to confirm identity
 * 5. Confirmation dialog explains refund policy
 * 6. On confirm, booking is cancelled and refund is initiated
 */
export default async function BookingCancellationPage({ params }: BookingPageProps) {
    const { merchantSlug, bookingCode } = await params;

    return (
        <BookingCancellationUI
            bookingCode={bookingCode}
            merchantSlug={merchantSlug}
        />
    );
}

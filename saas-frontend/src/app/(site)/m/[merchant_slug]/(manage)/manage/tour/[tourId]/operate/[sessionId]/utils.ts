import { booking_type, currency_amount_type } from "@/utils/spiriverse";

/**
 * Determine if a booking is paid.
 * Manual bookings (no order): check paid field or ticketStatus === COMPLETED
 * Order-based bookings: check order.paymentSummary.due.total.amount === 0
 */
export const isBookingPaid = (booking: booking_type): boolean => {
    if (!booking.order) {
        return booking.paid != null || String(booking.ticketStatus) === 'COMPLETED';
    }
    return booking.order.paymentSummary?.due?.total?.amount === 0;
};

/**
 * Get the amount due for a booking.
 * Manual bookings without an order: returns total amount if not paid.
 * Order-based bookings: returns order due amount.
 */
export const getAmountDue = (booking: booking_type) => {
    if (!booking.order) {
        if (isBookingPaid(booking)) {
            return { amount: 0, currency: booking.totalAmount?.currency || 'AUD' };
        }
        return booking.totalAmount || { amount: 0, currency: 'AUD' };
    }
    return booking.order.paymentSummary?.due?.total || { amount: 0, currency: 'AUD' };
};

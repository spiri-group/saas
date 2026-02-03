import { GraphQLError } from "graphql";
import { session_type, tour_type, booking_type, booking_ticket_type } from "../types";

/**
 * Calculate current capacity used in a session
 */
export const calculate_session_capacity = (
    session: session_type,
    tour: tour_type
): { current: number; max: number; remaining: number; mode: string } => {
    const maxCapacity = session.capacity.max;
    const mode = session.capacity.mode || 'PER_PERSON';

    let currentCapacity = 0;

    if (mode === 'PER_PERSON') {
        // Count by people (use peopleCount from ticket variants)
        currentCapacity = session.bookings.reduce((sum, booking) => {
            return sum + booking.sessions.reduce((sessionSum, sessionBooking) => {
                return sessionSum + sessionBooking.tickets.reduce((ticketSum, ticket) => {
                    const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
                    if (!variant) return ticketSum;
                    return ticketSum + (variant.peopleCount * ticket.quantity);
                }, 0);
            }, 0);
        }, 0);
    } else {
        // Count by tickets
        currentCapacity = session.bookings.reduce((sum, booking) => {
            return sum + booking.sessions.reduce((sessionSum, sessionBooking) => {
                return sessionSum + sessionBooking.tickets.length;
            }, 0);
        }, 0);
    }

    return {
        current: currentCapacity,
        max: maxCapacity,
        remaining: Math.max(0, maxCapacity - currentCapacity),
        mode
    };
};

/**
 * Validate if session has capacity for requested tickets
 */
export const validate_session_capacity = (
    session: session_type,
    tour: tour_type,
    requestedTickets: { variantId: string; quantity: number }[]
): { canAccommodate: boolean; current: number; max: number; requested: number } => {
    const { current, max, mode } = calculate_session_capacity(session, tour);

    let requestedCapacity = 0;

    if (mode === 'PER_PERSON') {
        requestedCapacity = requestedTickets.reduce((sum, ticket) => {
            const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
            if (!variant) {
                throw new GraphQLError(`Ticket variant ${ticket.variantId} not found`);
            }
            return sum + (variant.peopleCount * ticket.quantity);
        }, 0);
    } else {
        requestedCapacity = requestedTickets.length;
    }

    const canAccommodate = (current + requestedCapacity) <= max;

    if (!canAccommodate) {
        throw new GraphQLError(
            `Session is full. Current: ${current}/${max}, Requested: ${requestedCapacity}, Available: ${max - current}`
        );
    }

    return {
        canAccommodate,
        current,
        max,
        requested: requestedCapacity
    };
};

/**
 * Update session capacity in session document
 * Returns patch operations
 */
export const update_session_capacity = (
    currentCapacity: number,
    maxCapacity: number,
    mode: string
) => {
    return [
        {
            op: "set",
            path: "/capacity/current",
            value: currentCapacity
        },
        {
            op: "set",
            path: "/capacity/remaining",
            value: Math.max(0, maxCapacity - currentCapacity)
        },
        {
            op: "set",
            path: "/capacity/mode",
            value: mode
        }
    ];
};

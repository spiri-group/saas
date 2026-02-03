/**
 * Event and Tour GraphQL Resolvers
 *
 * Refactored into modular structure for better maintainability
 *
 * Modules:
 * - tour_resolvers: Tour CRUD operations and inventory management
 * - booking_resolvers: Booking creation and management with inventory commitment
 * - session_resolvers: Session queries and capacity management
 * - waitlist_resolvers: Waitlist management for sold-out sessions
 * - ticket_inventory (utils): Inventory operations (commit, deduct, restore)
 * - session_capacity (utils): Capacity validation and calculations
 */

import { tour_resolvers } from './resolvers/tour_resolvers';
import { booking_resolvers } from './resolvers/booking_resolvers';
import { session_resolvers } from './resolvers/session_resolvers';
import { activity_resolvers } from './resolvers/activity_resolvers';
import { vendor_event_resolvers } from './resolvers/vendor_event_resolvers';
import { waitlist_resolvers } from './resolvers/waitlist_resolvers';
import { analytics_resolvers } from './resolvers/analytics_resolvers';
import { public_booking_resolvers } from './resolvers/public_booking_resolvers';

// Manually merge resolvers
const resolvers = {
    Query: {
        ...tour_resolvers.Query,
        ...booking_resolvers.Query,
        ...session_resolvers.Query,
        ...activity_resolvers.Query,
        ...vendor_event_resolvers.Query,
        ...waitlist_resolvers.Query,
        ...analytics_resolvers.Query,
        ...public_booking_resolvers.Query
    },
    Mutation: {
        ...tour_resolvers.Mutation,
        ...booking_resolvers.Mutation,
        ...session_resolvers.Mutation,
        ...activity_resolvers.Mutation,
        ...vendor_event_resolvers.Mutation,
        ...waitlist_resolvers.Mutation,
        ...public_booking_resolvers.Mutation
    },
    Tour: tour_resolvers.Tour,
    TourTicketInventory: tour_resolvers.TourTicketInventory,
    TourBooking: booking_resolvers.TourBooking,
    Session: {
        ...session_resolvers.Session,
        ...waitlist_resolvers.Session
    },
    ActivityList: activity_resolvers.ActivityList,
    WaitlistEntry: waitlist_resolvers.WaitlistEntry
};

export default resolvers;

// Export utility functions for use in other modules (webhooks, etc.)
export {
    commit_ticket_inventory,
    deduct_ticket_inventory,
    restore_ticket_inventory,
    fulfill_ticket_inventory,
    calculate_ticket_availability
} from './utils/ticket_inventory';

export {
    calculate_session_capacity,
    validate_session_capacity
} from './utils/session_capacity';

export {
    process_waitlist_on_slot_open,
    expire_old_notifications,
    mark_as_converted
} from './utils/waitlist_manager';

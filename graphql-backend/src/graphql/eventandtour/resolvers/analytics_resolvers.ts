import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { booking_type, tour_type } from "../types";
import { StatusType } from "../../0_shared/types";
import { ListingTypes } from "../../listing/types";

type DateRangeInput = {
    from?: string;
    to?: string;
};

type BookingStatusCounts = {
    confirmed: number;
    pending: number;
    cancelled: number;
};

type TourBookingCount = {
    tourId: string;
    tourName: string;
    bookingCount: number;
    revenue: { amount: number; currency: string };
};

type BookingsOverTimeEntry = {
    date: string;
    count: number;
    revenue: number;
};

type TourAnalytics = {
    totalBookings: number;
    totalRevenue: { amount: number; currency: string };
    bookingsByStatus: BookingStatusCounts;
    topTours: TourBookingCount[];
    bookingsOverTime: BookingsOverTimeEntry[];
    checkInRate: number;
    averageBookingValue: { amount: number; currency: string };
};

export const analytics_resolvers = {
    Query: {
        tourAnalytics: async (
            _: any,
            args: { vendorId: string; dateRange?: DateRangeInput },
            context: serverContext
        ): Promise<TourAnalytics> => {
            const { vendorId, dateRange } = args;

            // Calculate date range
            let fromDate: string | undefined;
            let toDate: string | undefined;

            if (dateRange) {
                fromDate = dateRange.from;
                toDate = dateRange.to;
            }

            // Build query for bookings
            const whereConditions = ["c.vendorId = @vendorId"];
            const parameters: { name: string; value: any }[] = [
                { name: "@vendorId", value: vendorId }
            ];

            if (fromDate) {
                whereConditions.push("c.datetime >= @fromDate");
                parameters.push({ name: "@fromDate", value: fromDate });
            }

            if (toDate) {
                whereConditions.push("c.datetime <= @toDate");
                parameters.push({ name: "@toDate", value: toDate });
            }

            const query = `SELECT * FROM c WHERE ${whereConditions.join(" AND ")}`;

            // Fetch all bookings for the vendor within the date range
            const bookings = await context.dataSources.cosmos.run_query<booking_type>(
                "Main-Bookings",
                { query, parameters }
            );

            // Fetch all tours for the vendor to get tour names
            const toursQuery = `SELECT * FROM c WHERE c.type = @type`;
            const toursParameters = [
                { name: "@type", value: ListingTypes.TOUR }
            ];

            const tours = await context.dataSources.cosmos.run_query<tour_type>(
                "Main-Listing",
                { query: toursQuery, parameters: toursParameters }
            );

            const tourMap = new Map<string, tour_type>();
            tours.forEach(tour => tourMap.set(tour.id, tour));

            // Calculate metrics
            let totalBookings = 0;
            let totalRevenue = 0;
            let currency = "AUD"; // Default currency
            let confirmedCount = 0;
            let pendingCount = 0;
            let cancelledCount = 0;
            let checkedInCount = 0;

            // Track bookings per tour
            const tourBookingsMap = new Map<string, { count: number; revenue: number; name: string }>();

            // Track bookings over time (by day)
            const bookingsOverTimeMap = new Map<string, { count: number; revenue: number }>();

            for (const booking of bookings) {
                totalBookings++;

                // Get booking amount
                const bookingAmount = booking.totalAmount?.amount || 0;
                if (booking.totalAmount?.currency) {
                    currency = booking.totalAmount.currency;
                }

                // Count by status
                switch (booking.ticketStatus) {
                    case StatusType.COMPLETED:
                    case StatusType.UPCOMING:
                    case StatusType.ON_GOING:
                        confirmedCount++;
                        totalRevenue += bookingAmount;
                        break;
                    case StatusType.AWAITING_PAYMENT:
                    case StatusType.AWAITING_CHARGE:
                        pendingCount++;
                        break;
                    case StatusType.CANCELLED:
                    case StatusType.REFUNDED:
                        cancelledCount++;
                        break;
                    default:
                        // Count as confirmed if paid
                        if (booking.paid) {
                            confirmedCount++;
                            totalRevenue += bookingAmount;
                        } else {
                            pendingCount++;
                        }
                }

                // Count check-ins
                if (booking.checkedIn) {
                    checkedInCount++;
                }

                // Get tour ID from session refs
                if (booking.sessions && booking.sessions.length > 0) {
                    const sessionRef = booking.sessions[0].ref;
                    if (sessionRef && sessionRef.partition && sessionRef.partition.length > 1) {
                        const tourId = sessionRef.partition[1]; // Tour ID is often in partition
                        const tour = tourMap.get(tourId);
                        const tourName = tour?.name || "Unknown Tour";

                        const existing = tourBookingsMap.get(tourId) || { count: 0, revenue: 0, name: tourName };
                        existing.count++;
                        if (booking.paid || booking.ticketStatus === StatusType.COMPLETED) {
                            existing.revenue += bookingAmount;
                        }
                        tourBookingsMap.set(tourId, existing);
                    }
                }

                // Track bookings over time
                if (booking.datetime) {
                    const dateKey = DateTime.fromISO(booking.datetime).toFormat("yyyy-MM-dd");
                    const existing = bookingsOverTimeMap.get(dateKey) || { count: 0, revenue: 0 };
                    existing.count++;
                    if (booking.paid || booking.ticketStatus === StatusType.COMPLETED) {
                        existing.revenue += bookingAmount;
                    }
                    bookingsOverTimeMap.set(dateKey, existing);
                }
            }

            // Calculate check-in rate
            const eligibleForCheckIn = confirmedCount; // Only confirmed bookings can be checked in
            const checkInRate = eligibleForCheckIn > 0 ? (checkedInCount / eligibleForCheckIn) * 100 : 0;

            // Calculate average booking value
            const paidBookings = confirmedCount;
            const averageValue = paidBookings > 0 ? totalRevenue / paidBookings : 0;

            // Build top tours array
            const topTours: TourBookingCount[] = Array.from(tourBookingsMap.entries())
                .map(([tourId, data]) => ({
                    tourId,
                    tourName: data.name,
                    bookingCount: data.count,
                    revenue: { amount: data.revenue, currency }
                }))
                .sort((a, b) => b.bookingCount - a.bookingCount)
                .slice(0, 10); // Top 10 tours

            // Build bookings over time array
            const bookingsOverTime: BookingsOverTimeEntry[] = Array.from(bookingsOverTimeMap.entries())
                .map(([date, data]) => ({
                    date,
                    count: data.count,
                    revenue: data.revenue
                }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return {
                totalBookings,
                totalRevenue: { amount: totalRevenue, currency },
                bookingsByStatus: {
                    confirmed: confirmedCount,
                    pending: pendingCount,
                    cancelled: cancelledCount
                },
                topTours,
                bookingsOverTime,
                checkInRate: Math.round(checkInRate * 10) / 10, // Round to 1 decimal
                averageBookingValue: { amount: Math.round(averageValue * 100) / 100, currency }
            };
        }
    }
};

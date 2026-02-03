import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type DateRangeInput = {
    from?: string;
    to?: string;
};

export type BookingStatusCounts = {
    confirmed: number;
    pending: number;
    cancelled: number;
};

export type TourBookingCount = {
    tourId: string;
    tourName: string;
    bookingCount: number;
    revenue: {
        amount: number;
        currency: string;
    };
};

export type BookingsOverTimeEntry = {
    date: string;
    count: number;
    revenue: number;
};

export type TourAnalytics = {
    totalBookings: number;
    totalRevenue: {
        amount: number;
        currency: string;
    };
    bookingsByStatus: BookingStatusCounts;
    topTours: TourBookingCount[];
    bookingsOverTime: BookingsOverTimeEntry[];
    checkInRate: number;
    averageBookingValue: {
        amount: number;
        currency: string;
    };
};

const queryFn = async (vendorId: string, dateRange?: DateRangeInput) => {
    const resp = await gql<{
        tourAnalytics: TourAnalytics;
    }>(
        `
            query GetTourAnalytics($vendorId: ID!, $dateRange: DateRangeInput) {
                tourAnalytics(vendorId: $vendorId, dateRange: $dateRange) {
                    totalBookings
                    totalRevenue {
                        amount
                        currency
                    }
                    bookingsByStatus {
                        confirmed
                        pending
                        cancelled
                    }
                    topTours {
                        tourId
                        tourName
                        bookingCount
                        revenue {
                            amount
                            currency
                        }
                    }
                    bookingsOverTime {
                        date
                        count
                        revenue
                    }
                    checkInRate
                    averageBookingValue {
                        amount
                        currency
                    }
                }
            }
        `,
        { vendorId, dateRange }
    );

    return resp.tourAnalytics;
};

const UseTourAnalytics = (vendorId: string, dateRange?: DateRangeInput, enabled: boolean = true) => {
    return useQuery({
        queryKey: ["tour-analytics", vendorId, dateRange?.from, dateRange?.to],
        queryFn: () => queryFn(vendorId, dateRange),
        enabled: enabled && !!vendorId,
        staleTime: 60000, // 1 minute
    });
};

export default UseTourAnalytics;

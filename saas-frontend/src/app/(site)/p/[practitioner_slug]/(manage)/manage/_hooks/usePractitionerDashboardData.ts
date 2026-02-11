'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { usePendingBookings } from '../bookings/hooks/UsePendingBookings';
import { useUpcomingBookings } from '../bookings/hooks/UseUpcomingBookings';
import { useMyServiceOrders } from '../services/orders/hooks/UseMyServiceOrders';
import { usePractitionerTestimonials } from '../testimonials/_hooks/UseTestimonials';
import { usePractitionerSchedule } from '../availability/hooks/UsePractitionerSchedule';
import { usePendingFeaturingRequests } from '../featured-by/hooks/UsePractitionerFeaturingRelationships';

export interface AttentionItem {
    id: string;
    type: 'pending_bookings' | 'new_orders' | 'partnership_requests';
    count: number;
    message: string;
    href: string;
}

const usePractitionerServices = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-services', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                catalogue: { id: string }[];
            }>(`
                query PractitionerServices($vendorId: ID!) {
                    catalogue(vendorId: $vendorId, types: ["SERVICE"]) {
                        id
                    }
                }
            `, { vendorId: practitionerId });
            return response.catalogue || [];
        },
        enabled: !!practitionerId,
    });
};

export const usePractitionerDashboardData = (practitionerId: string, slug: string) => {
    const pendingBookings = usePendingBookings(practitionerId);
    const upcomingBookings = useUpcomingBookings(practitionerId);
    const serviceOrders = useMyServiceOrders(practitionerId);
    const testimonials = usePractitionerTestimonials(practitionerId);
    const schedule = usePractitionerSchedule(practitionerId);
    const pendingFeaturingRequests = usePendingFeaturingRequests(practitionerId);
    const services = usePractitionerServices(practitionerId);

    // Compute stats
    const upcomingCount = upcomingBookings.data?.length || 0;
    const pendingBookingsCount = pendingBookings.data?.length || 0;
    const inProgressOrdersCount = serviceOrders.data?.filter(
        o => o.orderStatus === 'PAID' || o.orderStatus === 'IN_PROGRESS'
    ).length || 0;
    const newOrdersCount = serviceOrders.data?.filter(
        o => o.orderStatus === 'PAID'
    ).length || 0;
    const testimonialsCount = testimonials.data?.length || 0;
    const avgRating = testimonialsCount > 0
        ? testimonials.data!.reduce((sum, t) => sum + t.rating, 0) / testimonialsCount
        : 0;

    // Attention items
    const attentionItems: AttentionItem[] = [];

    if (pendingBookingsCount > 0) {
        attentionItems.push({
            id: 'pending_bookings',
            type: 'pending_bookings',
            count: pendingBookingsCount,
            message: `${pendingBookingsCount} booking${pendingBookingsCount !== 1 ? 's' : ''} awaiting confirmation`,
            href: `/p/${slug}/manage/bookings`,
        });
    }

    if (newOrdersCount > 0) {
        attentionItems.push({
            id: 'new_orders',
            type: 'new_orders',
            count: newOrdersCount,
            message: `${newOrdersCount} new order${newOrdersCount !== 1 ? 's' : ''} to fulfill`,
            href: `/p/${slug}/manage/services/orders`,
        });
    }

    const partnershipCount = pendingFeaturingRequests.data?.length || 0;
    if (partnershipCount > 0) {
        attentionItems.push({
            id: 'partnership_requests',
            type: 'partnership_requests',
            count: partnershipCount,
            message: `${partnershipCount} partnership request${partnershipCount !== 1 ? 's' : ''} pending`,
            href: `/p/${slug}/manage/featured-by`,
        });
    }

    // Onboarding state - uses real services query, not orders proxy
    const hasSchedule = schedule.data !== null && schedule.data !== undefined;
    const hasServices = (services.data?.length || 0) > 0;
    const isOnboarded = hasSchedule;

    const isLoading = pendingBookings.isLoading
        || upcomingBookings.isLoading
        || serviceOrders.isLoading
        || testimonials.isLoading
        || schedule.isLoading
        || pendingFeaturingRequests.isLoading
        || services.isLoading;

    return {
        pendingBookings,
        upcomingBookings,
        serviceOrders,
        testimonials,
        schedule,
        pendingFeaturingRequests,
        services,
        stats: {
            upcomingCount,
            pendingBookingsCount,
            inProgressOrdersCount,
            newOrdersCount,
            testimonialsCount,
            avgRating,
        },
        attentionItems,
        onboarding: {
            isOnboarded,
            hasSchedule,
            hasServices,
        },
        isLoading,
    };
};

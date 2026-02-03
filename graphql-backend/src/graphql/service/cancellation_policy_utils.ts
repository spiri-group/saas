import { DateTime } from "luxon";
import { GraphQLError } from "graphql";

export type ServiceCancellationPolicy = {
    id: string;
    merchantId: string;
    serviceCategory: string;
    title: string;
    fullRefundHours?: number;
    partialRefundHours?: number;
    partialRefundPercentage?: number;
    noRefundHours?: number;
    allowRescheduling: boolean;
    maxReschedules?: number;
    rescheduleMinHours?: number;
};

export type RefundCalculation = {
    eligible: boolean;
    refundPercentage: number;
    refundAmount: number;
    reason: string;
};

export type RescheduleEligibility = {
    eligible: boolean;
    reason: string;
    rescheduleCount: number;
    maxReschedules: number;
};

/**
 * Calculate refund eligibility based on cancellation policy
 */
export function calculateRefund(
    policy: ServiceCancellationPolicy,
    appointmentDateTime: string,
    paidAmount: number
): RefundCalculation {
    const now = DateTime.now();
    const appointment = DateTime.fromISO(appointmentDateTime);
    const hoursUntilAppointment = appointment.diff(now, 'hours').hours;

    // Full refund window
    if (policy.fullRefundHours && hoursUntilAppointment >= policy.fullRefundHours) {
        return {
            eligible: true,
            refundPercentage: 100,
            refundAmount: paidAmount,
            reason: `Canceled ${Math.round(hoursUntilAppointment)} hours before appointment (full refund window)`
        };
    }

    // Partial refund window
    if (policy.partialRefundHours && hoursUntilAppointment >= policy.partialRefundHours) {
        const percentage = policy.partialRefundPercentage || 50;
        return {
            eligible: true,
            refundPercentage: percentage,
            refundAmount: paidAmount * (percentage / 100),
            reason: `Canceled ${Math.round(hoursUntilAppointment)} hours before appointment (partial refund window)`
        };
    }

    // No refund window
    if (policy.noRefundHours && hoursUntilAppointment < policy.noRefundHours) {
        return {
            eligible: false,
            refundPercentage: 0,
            refundAmount: 0,
            reason: `Canceled within ${policy.noRefundHours} hours of appointment (no refund)`
        };
    }

    // Default: no refund if past appointment time
    if (hoursUntilAppointment < 0) {
        return {
            eligible: false,
            refundPercentage: 0,
            refundAmount: 0,
            reason: 'Appointment has already passed'
        };
    }

    // Fallback: full refund if no specific rules match
    return {
        eligible: true,
        refundPercentage: 100,
        refundAmount: paidAmount,
        reason: 'No specific cancellation window defined - full refund applied'
    };
}

/**
 * Check if customer is eligible to reschedule
 */
export function checkRescheduleEligibility(
    policy: ServiceCancellationPolicy,
    appointmentDateTime: string,
    currentRescheduleCount: number
): RescheduleEligibility {
    // Check if rescheduling is allowed
    if (!policy.allowRescheduling) {
        return {
            eligible: false,
            reason: 'Rescheduling is not allowed for this service',
            rescheduleCount: currentRescheduleCount,
            maxReschedules: 0
        };
    }

    // Check if max reschedules reached
    const maxReschedules = policy.maxReschedules || 0;
    if (currentRescheduleCount >= maxReschedules) {
        return {
            eligible: false,
            reason: `Maximum reschedules (${maxReschedules}) reached`,
            rescheduleCount: currentRescheduleCount,
            maxReschedules
        };
    }

    // Check if within minimum hours window
    const now = DateTime.now();
    const appointment = DateTime.fromISO(appointmentDateTime);
    const hoursUntilAppointment = appointment.diff(now, 'hours').hours;

    const minHours = policy.rescheduleMinHours || 0;
    if (hoursUntilAppointment < minHours) {
        return {
            eligible: false,
            reason: `Cannot reschedule within ${minHours} hours of appointment`,
            rescheduleCount: currentRescheduleCount,
            maxReschedules
        };
    }

    // Check if appointment has passed
    if (hoursUntilAppointment < 0) {
        return {
            eligible: false,
            reason: 'Appointment has already passed',
            rescheduleCount: currentRescheduleCount,
            maxReschedules
        };
    }

    return {
        eligible: true,
        reason: 'Eligible to reschedule',
        rescheduleCount: currentRescheduleCount,
        maxReschedules
    };
}

/**
 * Fetch the cancellation policy for a service
 */
export async function fetchCancellationPolicy(
    cosmos: any,
    serviceId: string,
    vendorId: string
): Promise<ServiceCancellationPolicy | null> {
    try {
        // Fetch the service to get its cancellationPolicyId
        const service = await cosmos.get_record("Main-Listing", serviceId, vendorId);

        if (!service || !service.cancellationPolicyId) {
            return null;
        }

        // Fetch the policy
        const policy = await cosmos.get_record("Main-VendorSettings", service.cancellationPolicyId, vendorId);

        if (!policy || policy.type !== 'SERVICE_CANCELLATION_POLICY') {
            return null;
        }

        return policy as ServiceCancellationPolicy;
    } catch (error) {
        console.error('Error fetching cancellation policy:', error);
        return null;
    }
}

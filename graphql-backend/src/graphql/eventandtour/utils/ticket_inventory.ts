import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { GraphQLError } from "graphql";
import { PatchOperation } from "@azure/cosmos";
import { tour_ticket_variant_type, tour_type, booking_ticket_type, tour_ticket_transaction_type } from "../types";

/**
 * Calculate available quantity for a ticket variant
 */
export const calculate_ticket_availability = (variant: tour_ticket_variant_type): number => {
    if (!variant.inventory.track_inventory) {
        return 999999; // Unlimited if not tracking
    }
    return variant.inventory.qty_on_hand - variant.inventory.qty_committed;
};

/**
 * Validate if sufficient tickets are available
 * Throws error if insufficient or returns availability info
 */
export const validate_ticket_availability = (
    variant: tour_ticket_variant_type,
    requestedQty: number
): { available: number; canFulfill: boolean; isBackorder: boolean } => {
    const available = calculate_ticket_availability(variant);

    if (available >= requestedQty) {
        return { available, canFulfill: true, isBackorder: false };
    }

    // Check if backorders allowed
    if (variant.inventory.allow_backorder) {
        const currentBackorders = Math.abs(Math.min(0, available));
        const maxBackorders = variant.inventory.max_backorders || 0;
        const backorderSpace = maxBackorders - currentBackorders;

        if (backorderSpace >= requestedQty - available) {
            return { available, canFulfill: true, isBackorder: true };
        }
    }

    throw new GraphQLError(
        `Insufficient ${variant.name} tickets. Available: ${available}, Requested: ${requestedQty}`
    );
};

/**
 * Commit ticket inventory (reserve for pending order)
 * Returns patch operations to update tour document
 */
export const commit_ticket_inventory = (
    tour: tour_type,
    variantId: string,
    quantity: number,
    orderId: string,
    userId: string
): { patches: PatchOperation[]; isBackorder: boolean } => {
    const variantIndex = tour.ticketVariants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        throw new GraphQLError(`Ticket variant ${variantId} not found on tour ${tour.id}`);
    }

    const variant = tour.ticketVariants[variantIndex];
    const { canFulfill, isBackorder } = validate_ticket_availability(variant, quantity);

    if (!canFulfill) {
        throw new GraphQLError(`Cannot commit ${quantity} tickets for variant ${variant.name}`);
    }

    const currentCommitted = variant.inventory.qty_committed;
    const newCommitted = currentCommitted + quantity;

    // Create transaction record
    const transaction: tour_ticket_transaction_type = {
        id: uuidv4(),
        datetime: DateTime.now().toISO(),
        qty_before: currentCommitted,
        qty_after: newCommitted,
        reason: 'COMMITMENT',
        source: 'ORDER',
        reference_id: orderId,
        created_by: userId,
        notes: isBackorder ? 'BACKORDERED' : undefined
    };

    const patches: PatchOperation[] = [
        {
            op: "set",
            path: `/ticketVariants/${variantIndex}/inventory/qty_committed`,
            value: newCommitted
        },
        {
            op: "add",
            path: `/ticketVariants/${variantIndex}/inventory_transactions/-`,
            value: transaction
        }
    ];

    return { patches, isBackorder };
};

/**
 * Deduct ticket inventory (payment succeeded)
 * Decreases qty_on_hand and releases qty_committed
 */
export const deduct_ticket_inventory = (
    tour: tour_type,
    variantId: string,
    quantity: number,
    orderId: string,
    userId: string
): PatchOperation[] => {
    const variantIndex = tour.ticketVariants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        throw new GraphQLError(`Ticket variant ${variantId} not found on tour ${tour.id}`);
    }

    const variant = tour.ticketVariants[variantIndex];
    const newOnHand = variant.inventory.qty_on_hand - quantity;
    const newCommitted = Math.max(0, variant.inventory.qty_committed - quantity);

    // Create transaction record
    const transaction: tour_ticket_transaction_type = {
        id: uuidv4(),
        datetime: DateTime.now().toISO(),
        qty_before: variant.inventory.qty_on_hand,
        qty_after: newOnHand,
        reason: 'SALE',
        source: 'ORDER',
        reference_id: orderId,
        created_by: userId
    };

    return [
        {
            op: "set",
            path: `/ticketVariants/${variantIndex}/inventory/qty_on_hand`,
            value: newOnHand
        },
        {
            op: "set",
            path: `/ticketVariants/${variantIndex}/inventory/qty_committed`,
            value: newCommitted
        },
        {
            op: "add",
            path: `/ticketVariants/${variantIndex}/inventory_transactions/-`,
            value: transaction
        }
    ];
};

/**
 * Restore ticket inventory (refund processed)
 * Increases qty_on_hand
 */
export const restore_ticket_inventory = (
    tour: tour_type,
    variantId: string,
    quantity: number,
    orderId: string,
    userId: string
): PatchOperation[] => {
    const variantIndex = tour.ticketVariants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        console.warn(`Ticket variant ${variantId} not found on tour ${tour.id} - skipping restoration`);
        return [];
    }

    const variant = tour.ticketVariants[variantIndex];
    const newOnHand = variant.inventory.qty_on_hand + quantity;

    // Create transaction record
    const transaction: tour_ticket_transaction_type = {
        id: uuidv4(),
        datetime: DateTime.now().toISO(),
        qty_before: variant.inventory.qty_on_hand,
        qty_after: newOnHand,
        reason: 'REFUND',
        source: 'ORDER',
        reference_id: orderId,
        created_by: userId
    };

    return [
        {
            op: "set",
            path: `/ticketVariants/${variantIndex}/inventory/qty_on_hand`,
            value: newOnHand
        },
        {
            op: "add",
            path: `/ticketVariants/${variantIndex}/inventory_transactions/-`,
            value: transaction
        }
    ];
};

/**
 * Fulfill ticket inventory (tour session completed)
 * Just tracking - no quantity changes
 */
export const fulfill_ticket_inventory = (
    tour: tour_type,
    variantId: string,
    quantity: number,
    sessionId: string,
    userId: string
): PatchOperation[] => {
    const variantIndex = tour.ticketVariants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        return [];
    }

    const variant = tour.ticketVariants[variantIndex];

    // Create transaction record
    const transaction: tour_ticket_transaction_type = {
        id: uuidv4(),
        datetime: DateTime.now().toISO(),
        qty_before: variant.inventory.qty_on_hand,
        qty_after: variant.inventory.qty_on_hand,
        reason: 'FULFILLMENT',
        source: 'SHIPMENT',
        reference_id: sessionId,
        created_by: userId,
        notes: 'Tour session completed'
    };

    return [
        {
            op: "add",
            path: `/ticketVariants/${variantIndex}/inventory_transactions/-`,
            value: transaction
        }
    ];
};

/**
 * Get low stock variants for a tour
 */
export const get_low_stock_variants = (tour: tour_type): tour_ticket_variant_type[] => {
    return tour.ticketVariants.filter(variant => {
        if (!variant.inventory.track_inventory) return false;

        const available = calculate_ticket_availability(variant);
        const threshold = variant.inventory.low_stock_threshold || 0;

        return available <= threshold && available > 0;
    });
};

/**
 * Get out of stock variants
 */
export const get_out_of_stock_variants = (tour: tour_type): tour_ticket_variant_type[] => {
    return tour.ticketVariants.filter(variant => {
        if (!variant.inventory.track_inventory) return false;

        const available = calculate_ticket_availability(variant);
        return available <= 0 && !variant.inventory.allow_backorder;
    });
};

/**
 * Rollback ticket inventory commitment (cancel/failed booking)
 * Decreases qty_committed to release the reservation
 */
export const rollback_ticket_inventory = (
    tour: tour_type,
    variantId: string,
    quantity: number,
    orderId: string,
    userId: string
): PatchOperation[] => {
    const variantIndex = tour.ticketVariants.findIndex(v => v.id === variantId);

    if (variantIndex === -1) {
        console.warn(`Ticket variant ${variantId} not found on tour ${tour.id} - skipping rollback`);
        return [];
    }

    const variant = tour.ticketVariants[variantIndex];
    const newCommitted = Math.max(0, variant.inventory.qty_committed - quantity);

    // Create transaction record
    const transaction: tour_ticket_transaction_type = {
        id: uuidv4(),
        datetime: DateTime.now().toISO(),
        qty_before: variant.inventory.qty_committed,
        qty_after: newCommitted,
        reason: 'COMMITMENT',
        source: 'ORDER',
        reference_id: orderId,
        created_by: userId,
        notes: 'ROLLBACK - Booking failed due to concurrent modification'
    };

    return [
        {
            op: "set",
            path: `/ticketVariants/${variantIndex}/inventory/qty_committed`,
            value: newCommitted
        },
        {
            op: "add",
            path: `/ticketVariants/${variantIndex}/inventory_transactions/-`,
            value: transaction
        }
    ];
};

import { orderLine_type, order_type } from "./types";
import { variant_inventory_type } from "../product/types";
import { serverContext } from "../../services/azFunction";
import { restore_target_on_line } from ".";
import { recordref_type } from "../0_shared/types";

/**
 * Restores inventory quantities when order lines are refunded
 * This function is called by webhooks and mutations to restore stock
 */
export const restore_orderline_quantities_webhook = async (
    lines: orderLine_type[],
    refundedQuantities: Map<string, number>, // Map of line.id -> refunded quantity
    cosmos: serverContext["dataSources"]["cosmos"],
    userId: string
) => {
    const containerName = "Main-Listing";
    const now = new Date().toISOString();

    for (const line of lines) {
        const refundedQty = refundedQuantities.get(line.id);
        if (!refundedQty || refundedQty <= 0) continue;
        if (!line.variantId || !line.merchantId) continue;

        try {
            const variantInventoryId = `invv:${line.variantId}`;

            let currentInventory: variant_inventory_type;
            try {
                currentInventory = await cosmos.get_record<variant_inventory_type>(
                    containerName,
                    variantInventoryId,
                    line.merchantId
                );
            } catch (error) {
                console.error(`Inventory record missing for variant ${line.variantId} during refund. Skipping inventory restoration.`);
                continue; // Don't block refund if inventory record is missing
            }

            if (currentInventory && currentInventory.track_inventory) {
                // Restore qty_on_hand (return stock to available inventory)
                const newQtyOnHand = currentInventory.qty_on_hand + refundedQty;
                await cosmos.patch_record(containerName, variantInventoryId, line.merchantId, [
                    { op: "set", path: '/qty_on_hand', value: newQtyOnHand },
                    { op: "set", path: '/updated_at', value: now }
                ], userId);

                // Create transaction record
                const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const transaction = {
                    id: transactionId,
                    docType: "transaction",
                    vendorId: line.merchantId,
                    product_id: currentInventory.product_id,
                    variant_id: line.variantId,
                    delta: refundedQty, // Positive delta (inventory increase)
                    qty_before: currentInventory.qty_on_hand,
                    qty_after: newQtyOnHand,
                    reason: "REFUND",
                    source: "ORDER",
                    reference_id: line.id, // Reference the order line
                    notes: `Restored ${refundedQty} units from refunded order`,
                    created_at: now,
                    created_by: userId
                };

                await cosmos.add_record(containerName, transaction, line.merchantId, userId);
            }
        } catch (error) {
            console.error(`Failed to restore inventory for variant ${line.variantId}:`, error);
            // Don't throw - allow refund to complete even if inventory restoration fails
        }
    }
}

/**
 * Auto-allocates inventory to backordered items when stock is added
 * Processes oldest backorders first (FIFO)
 * Returns number of orders allocated
 */
export const auto_allocate_backorders = async (
    variant_id: string,
    vendorId: string,
    availableQty: number,
    cosmos: serverContext["dataSources"]["cosmos"]
): Promise<{ allocated_count: number; allocated_orders: string[] }> => {
    if (availableQty <= 0) {
        return { allocated_count: 0, allocated_orders: [] };
    }

    const now = new Date().toISOString();
    const allocatedOrders: string[] = [];

    // Find all backordered order lines for this variant, oldest first
    const backorderedOrders = await cosmos.run_query<order_type>("Main-Orders", {
        query: `
            SELECT * FROM c
            WHERE ARRAY_LENGTH(
                ARRAY(SELECT VALUE line
                      FROM line IN c.lines
                      WHERE line.variantId = @variantId
                      AND line.merchantId = @vendorId
                      AND line.inventory_status = "BACKORDERED")
            ) > 0
            ORDER BY c.created_at ASC
        `,
        parameters: [
            { name: "@variantId", value: variant_id },
            { name: "@vendorId", value: vendorId }
        ]
    }, true);

    let remainingQty = availableQty;

    for (const order of backorderedOrders) {
        if (remainingQty <= 0) break;

        for (let lineIndex = 0; lineIndex < order.lines.length; lineIndex++) {
            const line = order.lines[lineIndex];
            if (line.forObject == "inherit") {
                await restore_target_on_line(line, cosmos);
            }

            if (line.variantId === variant_id &&
                line.merchantId === vendorId &&
                line.inventory_status === "BACKORDERED") {

                // Calculate quantity needed for this line
                const lineQty = line.price_log
                    .filter(log => log.type === "CHARGE" && log.status !== "failed")
                    .reduce((acc, log) => acc + log.price.quantity, 0);

                if (lineQty <= remainingQty) {
                    // Can fully allocate this line
                    await cosmos.patch_record("Main-Orders", order.id, order.id, [
                        { op: "set", path: `/lines/${lineIndex}/inventory_status`, value: "ALLOCATED" },
                        { op: "remove", path: `/lines/${lineIndex}/backordered_at` }
                    ], "SYSTEM");

                    remainingQty -= lineQty;
                    if (!allocatedOrders.includes(order.id)) {
                        allocatedOrders.push(order.id);
                    }

                    // Create transaction record
                    const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const transaction = {
                        id: transactionId,
                        docType: "transaction",
                        vendorId: vendorId,
                        product_id: (line.forObject as recordref_type).id,
                        variant_id: variant_id,
                        delta: 0, // No inventory change, just allocation
                        qty_before: 0,
                        qty_after: 0,
                        reason: "COMMITMENT",
                        source: "ORDER",
                        reference_id: line.id,
                        notes: `Auto-allocated ${lineQty} units to backordered line (Order: ${order.code})`,
                        created_at: now,
                        created_by: "SYSTEM"
                    };

                    await cosmos.add_record("Main-Listing", transaction, vendorId, "SYSTEM");
                }
            }
        }
    }

    return {
        allocated_count: allocatedOrders.length,
        allocated_orders: allocatedOrders
    };
}

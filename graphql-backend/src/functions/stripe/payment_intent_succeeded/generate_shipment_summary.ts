import { PatchOperation } from "@azure/cosmos";
import { order_type } from "../../../graphql/order/types";

export function generate_shipment_summary(order: order_type): PatchOperation[] {
  const patchOps: PatchOperation[] = [];

  order.shipments?.forEach((shipment, idx) => {
    if (shipment.carrierOptions && Array.isArray(shipment.carrierOptions)) {
      // Step 1: Build raw stats
      const rawOptionsByCarrier: Record<string, {
        services: Set<string>;
        minRate: number;
        maxRate: number;
      }> = {};

      shipment.carrierOptions.forEach(rate => {
        if (!rawOptionsByCarrier[rate.carrier_code]) {
          rawOptionsByCarrier[rate.carrier_code] = {
            services: new Set(),
            minRate: Infinity,
            maxRate: -Infinity
          };
        }

        const carrier = rawOptionsByCarrier[rate.carrier_code];
        carrier.services.add(rate.service_code);
        carrier.minRate = Math.min(carrier.minRate, rate.total_rate.amount);
        carrier.maxRate = Math.max(carrier.maxRate, rate.total_rate.amount);
      });

      // Step 2: Convert Set<string> to string[]
      const optionsByCarrier: Record<string, {
        services: string[];
        minRate: number;
        maxRate: number;
      }> = {};

      for (const [carrierCode, stats] of Object.entries(rawOptionsByCarrier)) {
        optionsByCarrier[carrierCode] = {
          services: Array.from(stats.services),
          minRate: stats.minRate,
          maxRate: stats.maxRate
        };
      }

      // Step 3: Identify cheapest option
      const cheapestOption = shipment.carrierOptions.reduce((min, curr) =>
        curr.total_rate.amount < min.total_rate.amount ? curr : min
      );

      // Step 4: Build patch operations
      patchOps.push({
        op: "set",
        path: `/shipments/${idx}/carrierSummary`,
        value: {
          totalOptions: shipment.carrierOptions.length,
          cheapestOption,
          optionsByCarrier
        }
      });

      patchOps.push({
        op: "remove",
        path: `/shipments/${idx}/carrierOptions`
      });
    }
  });

  return patchOps;
}

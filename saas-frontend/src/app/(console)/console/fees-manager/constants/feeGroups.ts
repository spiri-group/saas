import { FeeConfig } from "../FeesManager";

// --- Types ---

export type SimulationInput = {
  volume: number;
  avgSale: number;
};

export type FeeEntry = {
  key: string;
  config: FeeConfig;
};

export type FeeGroup = {
  name: string;
  fees: FeeEntry[];
};

// --- Group mapping ---

const FEE_GROUPS: Record<string, string> = {
  "product-purchase-0": "Marketplace Orders",
  "product-purchase-50": "Marketplace Orders",
  "product-purchase-500": "Marketplace Orders",
  "platform-listing": "Marketplace Orders",
  "platform-processing": "Marketplace Orders",
  "service-booking": "Services & Bookings",
  "tour-booking": "Services & Bookings",
  "reading-single": "Readings",
  "reading-three-card": "Readings",
  "reading-five-card": "Readings",
  "reading-astro-snapshot": "Readings",
  "reading-astro-focus": "Readings",
  "reading-astro-deep-dive": "Readings",
  "case-activity": "Case Activities",
  "subscription-awaken-monthly": "Subscription Plans",
  "subscription-awaken-annual": "Subscription Plans",
  "subscription-manifest-monthly": "Subscription Plans",
  "subscription-manifest-annual": "Subscription Plans",
  "subscription-transcend-monthly": "Subscription Plans",
  "subscription-transcend-annual": "Subscription Plans",
};

/**
 * Contextual descriptions for fees — shown as subtitle under the fee name.
 */
export const FEE_CONTEXT: Record<string, string> = {
  // Readings — spread type context
  "reading-single": "Single Card spread",
  "reading-three-card": "Three Card spread",
  "reading-five-card": "Five Card spread",
  "reading-astro-snapshot": "Astrology · Chart Snapshot",
  "reading-astro-focus": "Astrology · Focused Reading",
  "reading-astro-deep-dive": "Astrology · Full Reading",
  // Subscriptions — tier + interval context
  "subscription-awaken-monthly": "Awaken tier · Monthly",
  "subscription-awaken-annual": "Awaken tier · Annual",
  "subscription-manifest-monthly": "Manifest tier · Monthly",
  "subscription-manifest-annual": "Manifest tier · Annual",
  "subscription-transcend-monthly": "Transcend tier · Monthly",
  "subscription-transcend-annual": "Transcend tier · Annual",
  // Marketplace tiers
  "product-purchase-0": "Orders under $50",
  "product-purchase-50": "Orders $50–$500",
  "product-purchase-500": "Orders over $500",
};

/**
 * Returns true if the fee key represents a subscription plan.
 * Subscription fees are fixed-price (the platform takes 100%).
 */
export function isSubscriptionFee(key: string): boolean {
  return key.startsWith("subscription-");
}

/** Returns true if the fee key represents a reading fee with a base price. */
export function isReadingFee(key: string): boolean {
  return key.startsWith("reading-");
}

/**
 * Get the customer-facing price in cents for a fee entry.
 * - Readings: basePrice (what the customer pays)
 * - Subscriptions: fixed (the subscription price, 100% platform)
 * - Others: null (varies per transaction)
 */
export function getCustomerPrice(key: string, config: FeeConfig): number | null {
  if (isReadingFee(key) && config.basePrice !== undefined) return config.basePrice;
  if (isSubscriptionFee(key)) return config.fixed;
  return null;
}

/**
 * Get the platform percentage for display.
 * Subscriptions are always 100% platform revenue.
 */
export function getPlatformPercent(key: string, config: FeeConfig): number {
  if (isSubscriptionFee(key)) return 100;
  return config.percent;
}

/**
 * Get the platform take in cents for a fee entry (when customer price is known).
 * - Subscriptions: same as customer price (100%), returned for revenue calc only
 * - Readings: basePrice * percent/100 + fixed
 * - Others: null (depends on transaction amount)
 */
export function getPlatformAmount(key: string, config: FeeConfig): number | null {
  if (isSubscriptionFee(key)) return config.fixed;
  if (isReadingFee(key) && config.basePrice !== undefined) {
    return Math.floor(config.basePrice * (config.percent / 100)) + (config.fixed || 0);
  }
  return null;
}


const GROUP_ORDER = [
  "Marketplace Orders",
  "Services & Bookings",
  "Readings",
  "Case Activities",
  "Subscription Plans",
  "Other",
];

// --- Helpers ---

export function formatFeeKey(key: string): string {
  return key
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatPercent(percent: number): string {
  if (percent <= 0) return "-";
  return `${percent % 1 === 0 ? percent : percent.toFixed(1)}%`;
}

export function formatFixed(fixed: number): string {
  if (!fixed || fixed <= 0) return "-";
  const dollars = fixed / 100;
  return `$${dollars.toFixed(2)}`;
}

export function formatCentsAsDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getGroupName(feeKey: string): string {
  return FEE_GROUPS[feeKey] ?? "Other";
}

/**
 * Groups a flat list of fee configs into ordered FeeGroup[].
 */
export function groupFees(feeConfigs: FeeEntry[]): FeeGroup[] {
  const map = new Map<string, FeeEntry[]>();

  for (const entry of feeConfigs) {
    const group = getGroupName(entry.key);
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group)!.push(entry);
  }

  // Sort fees within each group alphabetically
  for (const fees of map.values()) {
    fees.sort((a, b) => a.key.localeCompare(b.key));
  }

  // Return in deterministic order
  const result: FeeGroup[] = [];
  for (const groupName of GROUP_ORDER) {
    const fees = map.get(groupName);
    if (fees && fees.length > 0) {
      result.push({ name: groupName, fees });
    }
  }

  // Any groups not in GROUP_ORDER (shouldn't happen, but safety)
  for (const [groupName, fees] of map.entries()) {
    if (!GROUP_ORDER.includes(groupName) && fees.length > 0) {
      result.push({ name: groupName, fees });
    }
  }

  return result;
}

/**
 * Computes monthly platform revenue in cents for a single fee.
 * For fees with a known customer price (readings, subscriptions),
 * uses the platform take per transaction × volume.
 * For variable-price fees (marketplace), uses avgSale from sim inputs.
 */
export function computeMonthlyRevenue(
  config: FeeConfig,
  sim: SimulationInput,
  key?: string
): number {
  if (sim.volume <= 0) return 0;

  // For fees with known platform take (subscriptions, readings w/ basePrice)
  if (key) {
    const platAmt = getPlatformAmount(key, config);
    if (platAmt !== null) {
      return sim.volume * platAmt;
    }
  }

  // For variable-price fees, use avgSale from simulation inputs
  if (sim.avgSale <= 0 && config.percent > 0) return 0;
  const avgSaleCents = Math.round(sim.avgSale * 100);
  const perTransaction =
    Math.round(avgSaleCents * (config.percent / 100)) + (config.fixed || 0);
  return sim.volume * perTransaction;
}

/**
 * Generates tab-separated text suitable for pasting into spreadsheets.
 */
export function generateClipboardText(
  groups: FeeGroup[],
  simInputs: Record<string, SimulationInput>
): string {
  const lines: string[] = [];

  // Header
  lines.push(
    [
      "Fee Name",
      "Key",
      "Customer $",
      "Platform %",
      "Platform $",
      "Currency",
      "Est. Volume",
      "Monthly Rev ($)",
    ].join("\t")
  );

  let grandTotal = 0;

  for (const group of groups) {
    // Group header
    lines.push(`\n${group.name}`);

    let subtotal = 0;

    for (const { key, config } of group.fees) {
      const sim = simInputs[key] ?? { volume: 0, avgSale: 0 };
      const rev = computeMonthlyRevenue(config, sim);
      subtotal += rev;

      const custPrice = getCustomerPrice(key, config);
      const platPct = getPlatformPercent(key, config);
      const platAmt = getPlatformAmount(key, config);

      lines.push(
        [
          formatFeeKey(key),
          key,
          custPrice !== null ? (custPrice / 100).toFixed(2) : "Varies",
          `${platPct}%`,
          platAmt !== null ? (platAmt / 100).toFixed(2) : "Varies",
          config.currency,
          sim.volume || "",
          rev > 0 ? (rev / 100).toFixed(2) : "",
        ].join("\t")
      );
    }

    lines.push(`\tSubtotal: ${group.name}\t\t\t\t\t\t${(subtotal / 100).toFixed(2)}`);
    grandTotal += subtotal;
  }

  lines.push(`\nGrand Total\t\t\t\t\t\t\t${(grandTotal / 100).toFixed(2)}`);

  return lines.join("\n");
}

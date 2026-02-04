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
  "reading-request": "Readings",
  "case-activity": "Case Activities",
  "subscription-spiriverse-core": "Subscription Plans",
  "subscription-spiriassts": "Subscription Plans",
  "subscription-tours-premium": "Subscription Plans",
  "subscription-shopkeeper-premium": "Subscription Plans",
  "subscription-pro": "Subscription Plans",
};

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
 * Computes monthly revenue in cents for a single fee.
 * Formula: volume * (avgSaleCents * percent/100 + fixed)
 */
export function computeMonthlyRevenue(
  config: FeeConfig,
  sim: SimulationInput
): number {
  if (sim.volume <= 0) return 0;
  // For fixed-only fees (e.g. subscription plans), avgSale is irrelevant
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
      "Percentage",
      "Fixed Amount",
      "Currency",
      "Est. Volume",
      "Avg Sale ($)",
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

      lines.push(
        [
          formatFeeKey(key),
          key,
          formatPercent(config.percent),
          formatFixed(config.fixed),
          config.currency,
          sim.volume || "",
          sim.avgSale || "",
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

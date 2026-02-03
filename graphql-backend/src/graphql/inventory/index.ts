// resolvers/stockReport.ts
const DEFAULT_THRESHOLD = 5;

// --- helpers ---
const getThreshold = (item: any) =>
  item.low_stock_threshold ??
  item._low_stock_threshold_raw ?? // if you’re passing raw from DB
  DEFAULT_THRESHOLD;

const getAvailable = (item: any) =>
  Math.max(0, (item.qty_on_hand ?? 0) - (item.qty_committed ?? 0));

const getStatus = (item: any) => {
  const available = getAvailable(item);
  const threshold = getThreshold(item);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= threshold) return "LOW_STOCK";
  return "IN_STOCK";
};

// Define your rule: cost * qty_on_hand (common for inventory value).
// Adjust to qty_available or retail if that’s your business rule.
const getItemValue = (item: any) => {
  const amount = (item._cost_price ?? item.cost_price ?? 0) * (item.qty_on_hand ?? 0);
  const currency = item._currency ?? item.currency ?? "AUD";
  return { amount, currency };
};

// --- type resolvers ---
const StockReportItem = {
  qty_available: (item: any) => getAvailable(item),

  // If your DB gives is_ooak_effective, surface it; otherwise use the field if already mapped
  is_ooak: (item: any) =>
    item.is_ooak ?? item._is_ooak_effective ?? false,

  // Defaulting chain: explicit per-variant > raw > default
  low_stock_threshold: (item: any) => getThreshold(item),

  // If you’ve kept `status` in DB, this resolver will still override to ensure consistency
  status: (item: any) => getStatus(item),

  // CurrencyAmount
  value: (item: any) => getItemValue(item),
};

const StockReport = {
  total_products: (report: any) =>
    new Set((report.items ?? []).map((i: any) => i.product_id)).size,

  total_variants: (report: any) => (report.items ?? []).length,

  low_stock_items: (report: any) =>
    (report.items ?? []).reduce((n: number, i: any) => n + (getStatus(i) === "LOW_STOCK" ? 1 : 0), 0),

  out_of_stock_items: (report: any) =>
    (report.items ?? []).reduce((n: number, i: any) => n + (getStatus(i) === "OUT_OF_STOCK" ? 1 : 0), 0),

  ooak_items: (report: any) =>
    (report.items ?? []).reduce((n: number, i: any) => n + (i.is_ooak ?? i._is_ooak_effective ? 1 : 0), 0),

  // CurrencyAmount
  total_value: (report: any) => {
    const currency = (report.items ?? []).find(Boolean)?.currency || "AUD";
    const amount = (report.items ?? []).reduce((sum, i) => sum + i.value.amount, 0);
    return { amount, currency };
  },
};

const resolvers = {
    StockReport,
    StockReportItem
}

export { resolvers }
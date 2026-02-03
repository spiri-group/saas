import { packed_box_type } from "../types";

export function detectDeviation(
  actual: packed_box_type[] | undefined,
  suggested: packed_box_type[] | undefined
): {
  wasDeviated: boolean;
  deviationType?: string;
  diffReport?: {
    boxCountChanged?: boolean;
    dimensionsDiffer?: boolean;
    weightDiffered?: boolean;
    skusMoved?: boolean;
    skusAddedOrMissing?: boolean;
  };
} {
  if (!actual || !suggested) return { wasDeviated: false };

  const report = {
    boxCountChanged: false,
    dimensionsDiffer: false,
    weightDiffered: false,
    skusMoved: false,
    skusAddedOrMissing: false
  };

  // Check box count
  if (actual.length !== suggested.length) {
    report.boxCountChanged = true;
  }

  // Check each box's dimensions and weight
  const len = Math.min(actual.length, suggested.length);
  for (let i = 0; i < len; i++) {
    const a = actual[i];
    const b = suggested[i];

    const dimA = `${a.dimensions_cm.depth}x${a.dimensions_cm.width}x${a.dimensions_cm.height}`;
    const dimB = `${b.dimensions_cm.depth}x${b.dimensions_cm.width}x${b.dimensions_cm.height}`;
    if (dimA !== dimB) {
      report.dimensionsDiffer = true;
    }

    const weightDiff = Math.abs(a.used_weight - b.used_weight);
    if (weightDiff > 0.1) {
      report.weightDiffered = true;
    }
  }

  // Flatten item SKU references
  const flattenItems = (boxes: packed_box_type[]) =>
    boxes.flatMap(box => box.items.map(item => ({
      sku: item.variantId ?? item.name,
      quantity: item.quantity,
      boxIndex: boxes.indexOf(box)
    })));

  const actualItems = flattenItems(actual);
  const suggestedItems = flattenItems(suggested);

  const groupBySKU = (items: typeof actualItems) =>
    items.reduce((acc, item) => {
      if (!acc[item.sku]) acc[item.sku] = [];
      acc[item.sku].push(item.boxIndex);
      return acc;
    }, {} as Record<string, number[]>);

  const actualMap = groupBySKU(actualItems);
  const suggestedMap = groupBySKU(suggestedItems);

  const allSKUs = new Set([...Object.keys(actualMap), ...Object.keys(suggestedMap)]);

  for (const sku of allSKUs) {
    const a = actualMap[sku] ?? [];
    const s = suggestedMap[sku] ?? [];

    // Check if SKU was added or missing entirely
    if (a.length === 0 || s.length === 0) {
      report.skusAddedOrMissing = true;
      continue;
    }

    // Check if SKU moved between boxes
    const sameDistribution = a.sort().join(",") === s.sort().join(",");
    if (!sameDistribution) {
      report.skusMoved = true;
    }
  }

  const wasDeviated = Object.values(report).some(flag => flag);

  // Determine primary deviation reason (in priority order)
  const deviationType =
    report.boxCountChanged ? "box_count_changed" :
    report.dimensionsDiffer ? "dimensions_differ" :
    report.weightDiffered ? "weight_differed" :
    report.skusMoved ? "skus_moved_between_boxes" :
    report.skusAddedOrMissing ? "skus_missing_or_added" :
    undefined;

  return {
    wasDeviated,
    deviationType,
    diffReport: report
  };
}

import { flatten, generate_human_friendly_id } from "../../../utils/functions";
import { recordref_type } from "../../0_shared/types";
import { items_with_dimensions, packed_box_type, source_with_boxes_type } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Conservative buffers
const VOLUME_BUFFER = 0.95;
const WEIGHT_BUFFER = 0.95;

const buffers = {
  volume: VOLUME_BUFFER,
  weight: WEIGHT_BUFFER
};

// Master box definitions
export const box_sources = {
  "Australia Post": [
    { name: "Small Box", dimensions_cm: { depth: 22, width: 16, height: 7 }, max_weight_kg: 5 },
    { name: "Medium Box", dimensions_cm: { depth: 24, width: 19, height: 12 }, max_weight_kg: 10 },
    { name: "Large Box", dimensions_cm: { depth: 39, width: 28, height: 14 }, max_weight_kg: 20 },
    { name: "Extra Large Box", dimensions_cm: { depth: 44, width: 27.7, height: 16.8 }, max_weight_kg: 25 },
    { name: "BX5", dimensions_cm: { depth: 40.5, width: 30, height: 26 }, max_weight_kg: 30 },
    { name: "BX20", dimensions_cm: { depth: 50, width: 44, height: 35 }, max_weight_kg: 40 },
    { name: "BX23", dimensions_cm: { depth: 48.5, width: 38.5, height: 28 }, max_weight_kg: 35 },
    { name: "BX24", dimensions_cm: { depth: 41, width: 30, height: 80 }, max_weight_kg: 30 }
  ]
};

// Main entry point
const pack_by_box_sources = (items: items_with_dimensions[]): source_with_boxes_type => {
  const results: source_with_boxes_type = {};

  for (const [box_source, boxTypes] of Object.entries(box_sources)) {
    try {
      const packed = packItemsFFD(items, boxTypes);
      results[box_source] = packed;
    } catch (err) {
      results[box_source] = null;
    }
  }

  return results;
};

// FFD packer — smarter packing!
function packItemsFFD(items: items_with_dimensions[], boxTypes): packed_box_type[] {
  const flatItems = expandItems(items);

  const sortedBoxes = boxTypes
    .map(b => ({
      ...b,
      volume: getVolume(b.dimensions_cm)
    }))
    .sort((a, b) => a.volume - b.volume); // smallest box first

  const packedBoxes: packed_box_type[] = [];

  // FFD step 1 — sort items by volume descending
  const sortedItems = flatItems
    .map(item => ({
      ...item,
      itemVolume: getVolume(item.dimensions)
    }))
    .sort((a, b) => b.itemVolume - a.itemVolume); // biggest items first

  for (const item of sortedItems) {
    const itemVolume = item.itemVolume;

    // FFD step 2 — try to fit in existing boxes first
    let targetBox = packedBoxes
      .filter(pb => fitsWithRotation(item, pb) && canFitMore(pb, item, itemVolume))
      .sort((a, b) => {
        // Prefer box where adding this item will waste least space
        const freeVolumeA = (a.volume * VOLUME_BUFFER) - (a.used_volume + itemVolume);
        const freeVolumeB = (b.volume * VOLUME_BUFFER) - (b.used_volume + itemVolume);
        return freeVolumeA - freeVolumeB;
      })[0]; // take best fit

    // FFD step 3 — if no fit, open new box
    if (!targetBox) {
      const fittingBox = sortedBoxes.find(box =>
        fitsWithRotation(item, box) &&
        item.weight.amount <= box.max_weight_kg * WEIGHT_BUFFER
      );

      if (!fittingBox) {
        throw new Error(`No fitting box found for item: ${item.id}`);
      }

      targetBox = createNewBox(fittingBox);
      packedBoxes.push(targetBox);
    }

    // Pack the item
    targetBox.items.push(item);
    targetBox.used_volume += itemVolume;
    targetBox.used_weight += item.weight.amount;
  }

  for (const box of packedBoxes) {
    box.items = collapsePackedItems(box.items);
  }
  return packedBoxes;
  
}

// Create a new packed box object
function createNewBox(boxTemplate): packed_box_type {
  return {
    ...boxTemplate,
    id: uuidv4(),
    code: generate_human_friendly_id("BX"),
    volume: boxTemplate.volume,
    items: [],
    used_volume: 0,
    used_weight: 0
  };
}

// Flatten items by quantity
function expandItems(items: items_with_dimensions[]): items_with_dimensions[] {
  if (!items || items.length === 0) return [];

  return items.flatMap(item =>
    Array.from({ length: item.quantity }, () => ({ ...item, quantity: 1 }))
  );
}

function collapsePackedItems(items: items_with_dimensions[]): items_with_dimensions[] {
  const collapsed = new Map<string, items_with_dimensions & { quantity: number }>();
  // ensure all for objects are not "inherit"
  if (items.some(item => item.forObject === "inherit")) {
    throw new Error("Cannot collapse items with 'inherit' forObject");
  }

  for (const item of items) {
    const forObject = item.forObject as recordref_type
    const key = `${forObject.id}::${flatten(forObject.partition)}::${item.variantId}`;
    const existing = collapsed.get(key);

    if (existing) {
      existing.quantity += 1;
    } else {
      collapsed.set(key, {
        ...item,
        quantity: 1
      });
    }
  }

  return Array.from(collapsed.values());
}

// Check if item can fit in box with any 90-degree orientation
function fitsWithRotation(item: items_with_dimensions, box): boolean {
  const { depth, width, height } = item.dimensions;
  const { depth: bd, width: bw, height: bh } = box.dimensions_cm ?? box.dimensions_cm;

  const orientations = [
    [depth, width, height],
    [depth, height, width],
    [width, depth, height],
    [width, height, depth],
    [height, depth, width],
    [height, width, depth]
  ];

  return orientations.some(([d, w, h]) =>
    d <= bd && w <= bw && h <= bh
  );
}

// Check if the item can be added to the existing box
function canFitMore(box, item: items_with_dimensions, itemVolume: number): boolean {
  const fitsByVolume = (box.used_volume + itemVolume) <= (box.volume * VOLUME_BUFFER);
  const fitsByWeight = (box.used_weight + item.weight.amount) <= (box.max_weight_kg * WEIGHT_BUFFER);
  return fitsByVolume && fitsByWeight;
}

// Volume calculation helper
function getVolume(dim: { depth: number; width: number; height: number }): number {
  return dim.depth * dim.width * dim.height;
}

export { pack_by_box_sources, buffers };
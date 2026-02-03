//#region Product

import { currency_amount_type, media_type, recordref_type, stripe_details_type, thumbnail_type } from "../0_shared/types"
import { vendor_type } from "../vendor/types"
import { crystal_form, crystal_color, crystal_reference_type } from "../crystal-reference/types"

// Crystal grade type (moved from crystal-listing)
export type crystal_grade = 'A' | 'AA' | 'AAA' | 'museum' | 'specimen' | 'polished';

// Product type discriminator
export type product_type_discriminator = 'STANDARD' | 'CRYSTAL';

// Crystal-specific type data
export type crystal_type_data = {
    crystalRefId: string;
    crystalRef?: crystal_reference_type; // Resolved from crystalRefId
    crystalForm: crystal_form;
    crystalGrade?: crystal_grade;
    crystalLocality?: string;
    crystalColor?: crystal_color;
};

// Union of all type-specific data
export type product_type_data = {
    crystal?: crystal_type_data;
};

export type product_type = {
    id: string,
    name: string,
    slug?: string,
    description: string,
    vendor: vendor_type,
    ref: recordref_type,
    thumbnail?: thumbnail_type,
    defaultVariantId: string,
    defaultVariant?: variant_type,
    variants: variant_type[],
    offers: offer_type[],
    listingFee?: stripe_details_type,
    is_ooak?: boolean,
    refundRules?: refund_rules_type,
    // Product type discriminator for crystal vs standard products
    productType?: product_type_discriminator,
    typeData?: product_type_data
}

export type variant_type = {
    id: string;
    isDefault?: boolean;
    name: string;
    code?: string;
    description: string;
    countryOfOrigin?: string;
    countryOfManufacture?: string;
    harmonizedTarrifCode?: {
        hsCode: string;
        formattedHsCode: string;
        description: string;
    };
    dimensions: variant_dimensions_type;
    weight: variant_weight_type;
    requireReturnShipping?: boolean;
    properties?: variant_property_type[];
    images: media_type[];
    defaultPrice: currency_amount_type;
    otherPrices?: currency_amount_type[];
    inventory: variant_inventory_type;
};

export type variant_property_type = {
    key: string,
    valueType: string,
    value: string,
    values: string[]
}

export type variant_dimensions_type = {
    height: number,
    width: number,
    depth: number,
    uom: string
}

export type variant_weight_type = {
    amount: number,
    uom: string
}

export type offer_type = {
    id: string,
    variantId: string,
    quantity: number, 
    currency: string,
    price: number
}

export type prerecord_type = {
    id: string,
    title: string,
    type: media_type,
    topic: string,
    datetime: string,
    description: string,
    thumbnail: thumbnail_type,
    fullPrice: currency_amount_type
    rentPrice: currency_amount_type
    media_content: media_type
}

export type preRecord_input_type = {
    id: string,
    title: string,
    type: media_type,
    topic: string,
    datetime: string,
    description: string,
    thumbnail: media_type,
    media_content: media_type,
    name: string
    rating: string,
    fullPrice: currency_amount_type
    rentPrice: currency_amount_type
    currency: string
}

export type variant_inventory_type = {
    variant_id: string;
    product_id: string;
    vendorId: string;
    track_inventory: boolean;
    qty_on_hand: number;
    qty_committed: number;
    low_stock_threshold?: number;
    is_ooak_effective?: boolean;
    location_id: string;
    updated_at: string;
    allow_backorder?: boolean;
    max_backorders?: number; // Max negative qty_on_hand allowed (e.g., 10 means can go to -10)
}

export type inventory_alert_type = {
    id: string;
    variant_id: string;
    product_id: string;
    vendorId: string;
    alert_type: 'LOW_STOCK' | 'OUT_OF_STOCK';
    threshold?: number;
    current_qty: number;
    status: 'OPEN' | 'ACKED' | 'CLOSED';
    created_at: string;
    acknowledged: boolean;
    acknowledged_at?: string;
    acknowledged_by?: string;
    snoozed_until?: string;
}

export type inventory_transaction_type = {
    id: string;
    vendorId: string;
    product_id: string;
    variant_id: string;
    delta: number;
    qty_before: number;
    qty_after: number;
    reason: 'SALE' | 'RETURN' | 'RESTOCK' | 'ADJUSTMENT' | 'GIFTED' | 'DAMAGED' | 'LOST' | 'FOUND' | 'CORRECTION' | 'COMMITMENT' | 'FULFILLMENT' | 'RECEIVED' | 'REFUND';
    source?: 'ORDER' | 'MANUAL' | 'SHIPMENT' | 'DELIVERY';
    reference_id?: string;
    recipient?: string;
    notes?: string;
    created_at: string;
    created_by: string;
}

export type inventory_adjustment_input_type = {
    variant_id: string;
    delta: number;
    reason: 'ADJUSTMENT' | 'GIFTED' | 'DAMAGED' | 'LOST' | 'FOUND' | 'RESTOCK' | 'CORRECTION' | 'COMMITMENT' | 'FULFILLMENT' | 'RECEIVED';
    recipient?: string;
    notes?: string;
}

export type inventory_rule_type = {
    id: string;
    vendorId: string;
    low_stock_threshold_default: number;
    notify_email?: string;
    enabled: boolean;
    snooze_minutes: number;
}

export type stock_report_item_type = {
    product_id: string;
    product_name: string;
    variant_id: string;
    variant_name: string;
    qty_on_hand: number;
    qty_available: number;
    qty_committed: number;
    is_ooak: boolean;
    low_stock_threshold?: number;
    value: currency_amount_type;
    status: string;
}

export type stock_report_type = {
    total_products: number;
    total_variants: number;
    low_stock_items: number;
    out_of_stock_items: number;
    ooak_items: number;
    total_value: currency_amount_type;
    location_id: string;
    generated_at: string;
    items: stock_report_item_type[];
}

export type refund_rules_type = {
    allowAutoReturns?: boolean;
    productCost?: currency_amount_type;
    refundWithoutReturn?: boolean;
    useDefaultAddress?: boolean;
    customAddress?: refund_address_type;
    requirePhoto?: boolean;
    refundTiming?: 'immediate' | 'carrier_scan' | 'delivered' | 'manual';
}

export type refund_address_type = {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
}

//#endregion
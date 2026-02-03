import { ShipEngineRate } from "../../services/shipengine/types";
import { currency_amount_type } from "../0_shared/types"
import { orderLine_type } from "../order/types"
import { variant_dimensions_type, variant_weight_type } from "../product/types";

export type shipment_type = {
  id: string;
  code: string;

  sendTo: shipment_address_type;
  sendFrom: shipment_address_type;

  carrierOptions?: estimate_record_type[];
  carrierInfo?: carrier_info_type;

  finalizedConfiguration?: {
    boxes: packed_box_type[];
    pricing: {
      tax_amount: currency_amount_type;
      subtotal_amount: currency_amount_type;
    };
    estimated_delivery_date?: string;
    delivery_days?: number;
  };

  suggestedConfiguration?: {
    source?: string;
    boxes: packed_box_type[];
    pricing: {
      tax_amount: currency_amount_type;
      subtotal_amount: currency_amount_type;
    };
    estimated_delivery_date?: string;
    delivery_days?: number;
  };

  carrierSummary?: {
    totalOptions: number;
    cheapestOption: estimate_record_type;
    optionsByCarrier: Record<
      string,
      {
        services: string[];
        minRate: number;
        maxRate: number;
      }
    >;
  };

  packingMetadata?: {
    wasDeviated: boolean;
    deviationType?: string;
    diffReport?: {
      boxCountChanged: boolean;
      dimensionsDiffer: boolean;
      weightDiffered: boolean;
      skusMoved: boolean;
      skusAddedOrMissing: boolean;
    };
  };

  label?: label_info_type;
  isFinalized?: boolean;

  // Resolver-injected
  orderRef?: {
    id: string;
    partition: string;
  };

  // Computed: current status + tracking event log
  trackingStatus?: tracking_event_type

  trackingEvents?: tracking_event_type[];
};

export type tracking_event_type = {
  description?: string; // optional description for better UX

  status_code: string;
  status_description: string;
  occurred_at: string;
  city_locality?: string;
  state_province?: string;
  postal_code?: string;
  country_code?: string;
  company_name?: string;
  signer?: string;
  event_code?: string;
  event_description?: string;
  carrier_detail_code?: string;
  latitude?: number;
  longitude?: number;

  location?: string;

  status_source: 'carrier' | 'manual';
  triggered_by?: string;
  reason?: string;
}

export type carrier_info_type = {
    rate_id: string,
    code: string,
    name: string,
    service: {
        code: string,
        name: string,
        delivery_days: number
    }
}

export type shipment_address_type = {
    id: string,
    name: string,
    city: string,
    country: string,
    line1: string,
    line2: string,
    postal_code: string,
    state: string,
    vendorId?: string
    accountId?: string
}

export type estimate_record_type = {
    rate_id: string,
    carrier_id: string,
    shipping_amount: currency_amount_type,
    insurance_amount: currency_amount_type,
    confirmation_amount: currency_amount_type,
    other_amount: currency_amount_type,
    requested_comparison_amount: currency_amount_type,
    rate_details: rate_detail_type[],
    tax_amount: currency_amount_type,
    total_rate: currency_amount_type,
    zone: string,
    package_type: string,
    delivery_days: number,
    guaranteed_service: boolean,
    estimated_delivery_date: string,
    carrier_delivery_days: number,
    ship_date: string,
    negotiated_rate: boolean,
    service_type: string,
    service_code: string,
    trackable: boolean,
    carrier_code: string,
    carrier_nickname: string,
    carrier_friendly_name: string,
    validation_status: string,
    warning_messages: string[],
    error_messages: string[]
}

export type rate_detail_type = {
    rate_detail_type: string
    carrier_description: string,
    carrier_billing_code: string,
    carrier_memo: string,
    amount: currency_amount_type,
    billing_source: string
}

export type packed_box_type = {
  code: string;
  label: string;
  dimensions_cm: { depth: number; width: number; height: number };
  max_weight_kg: number;
  volume: number;
  items: items_with_dimensions[];
  used_volume: number;
  used_weight: number;
}


export type items_with_dimensions = {
  name: string;
  tax_code: string;
  country_of_manufacture: string;
  country_of_origin: string;
  harmonized_tariff_code: { hsCode: string };
  dimensions: { depth: number; width: number; height: number; uom: string };
  weight: { amount: number; uom: string };
} & orderLine_type

export type source_with_boxes_type = {
  [key: string]: packed_box_type[];
}

export interface rate_record_type extends ShipEngineRate {
  total_rate: currency_amount_type;
}

export type carrier_option_type = 
        rate_record_type & {
            boxes: packed_box_type[];
        }

export type label_download_formats_type = {
  pdf?: string;
  png?: string;
  zpl?: string;
};

export type label_package_info_types = {
  package_id: string;
  tracking_number?: string;
  label_download: label_download_formats_type;
  weight?: variant_weight_type;
  dimensions?: variant_dimensions_type;
  sequence?: number;
};

export type label_info_type = {
  label_id: string;
  status?: string;
  tracking_number?: string;
  tracking_status?: string;
  tracking_url?: string;
  shipment_id?: string;
  ship_date?: string; // ISO date string
  created_at?: string; // ISO date string
  is_return_label?: boolean;
  is_international?: boolean;
  carrier_id?: string;
  carrier_code?: string;
  service_code?: string;
  label_format?: string;
  label_layout?: string;
  confirmation?: string;
  shipment_cost?: currency_amount_type;
  insurance_cost?: currency_amount_type;
  rate_details?: rate_detail_type[];
  label_download: label_download_formats_type;
  packages: label_package_info_types[];
  // Auto-refund safety tracking
  paid_at?: string; // ISO timestamp when customer paid for label
  delivered_at?: string; // ISO timestamp when carrier confirmed delivery
  auto_refund_deadline?: string; // ISO timestamp: delivered_at + 7 days
  label_cost_refund_deadline?: string; // ISO timestamp: paid_at + 30 days
  auto_processed?: boolean; // True if refund was auto-processed by cron
  auto_processed_at?: string; // ISO timestamp when auto-processed
  label_cost_refunded?: boolean; // True if label cost was refunded
  label_cost_refunded_at?: string; // ISO timestamp when label cost refunded
};


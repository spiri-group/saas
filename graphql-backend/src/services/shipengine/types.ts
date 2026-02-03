// types/shipengine.ts

// #region Events
export interface ShipEngineEvent<T = unknown> {
  resource_url: string;
  resource_type: string;
  data: T;
}
// #endregion

// #region Shared Primitives
export interface ShipEngineAmount {
  currency: string;
  amount: number;
}

export interface ShipEngineWeight {
  value: number;
  unit: string;
}

export interface ShipEngineDimensions {
  unit: string;
  length: number;
  width: number;
  height: number;
}

export interface ShipEngineLabelMessages {
  reference1: string | null;
  reference2: string | null;
  reference3: string | null;
}
// #endregion

// #region Address & Package
export interface ShipEngineAddress {
  geolocation: any | null;
  instructions: string | null;
  name: string;
  phone: string;
  email: string | null;
  company_name: string;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator: string;
}

export interface ShipEngineShipmentPackage {
  shipment_package_id: string;
  package_id: string;
  package_code: string;
  package_name: string;
  weight: ShipEngineWeight;
  dimensions: ShipEngineDimensions;
  insured_value: ShipEngineAmount;
  label_messages: ShipEngineLabelMessages;
  external_package_id: string | null;
  content_description: string | null;
  products: any | null;
}
// #endregion

// #region Rate & RateResponse
export interface ShipEngineRateDetail {
  rate_detail_type: string;
  carrier_description: string;
  carrier_billing_code: string;
  carrier_memo: string | null;
  amount: ShipEngineAmount;
  billing_source: string;
}

export interface ShipEngineRate {
  rate_id: string;
  rate_type: string;
  carrier_id: string;
  shipping_amount: ShipEngineAmount;
  insurance_amount: ShipEngineAmount;
  confirmation_amount: ShipEngineAmount;
  other_amount: ShipEngineAmount;
  tax_amount: ShipEngineAmount;
  requested_comparison_amount: ShipEngineAmount;
  rate_details: ShipEngineRateDetail[];
  zone: string | null;
  package_type: string | null;
  delivery_days: number | null;
  guaranteed_service: boolean;
  estimated_delivery_date: string | null;
  carrier_delivery_days: number | null;
  ship_date: string;
  negotiated_rate: boolean;
  service_type: string;
  service_code: string;
  trackable: boolean;
  carrier_code: string;
  carrier_nickname: string;
  carrier_friendly_name: string;
  validation_status: string;
  warning_messages: string[];
  error_messages: string[];
}

export interface ShipEngineRateResponse {
  rates: ShipEngineRate[];
  invalid_rates: any[];
  rate_request_id: string;
  shipment_id: string;
  created_at: string;
  status: string;
  errors: any[];
}

export interface ShipEngineRateResponseWrapper {
  rate_response: ShipEngineRateResponse;
  shipment_id: string;
  carrier_id: string;
  service_code: string | null;
  requested_shipment_service: string | null;
  external_shipment_id: string | null;
  shipment_number: string | null;
  hold_until_date: string | null;
  ship_date: string;
  ship_by_date: string | null;
  created_at: string;
  modified_at: string;
  shipment_status: string;
  ship_to: ShipEngineAddress;
  ship_from: ShipEngineAddress;
  warehouse_id: string | null;
  return_to: ShipEngineAddress;
  is_return: boolean;
  confirmation: string;
  customs: any | null;
  external_order_id: string | null;
  order_source_code: string | null;
  advanced_options: ShipEngineAdvancedOptions;
  comparison_rate_type: string | null;
  retail_rate: any | null;
  shipping_rule_id: string | null;
  insurance_provider: string;
  tags: string[];
  store_id: string;
  packages: ShipEngineShipmentPackage[];
  total_weight: ShipEngineWeight;
  items: any[];
  notes_from_buyer: string | null;
  notes_for_gift: string | null;
  is_gift: boolean;
  assigned_user: string | null;
  amount_paid: number | null;
  shipping_paid: number | null;
  tax_paid: number | null;
  zone: string | null;
}
// #endregion

// #region Tracking
export interface ShipEngineTrackingEvent {
  occurred_at: string;
  carrier_occurred_at: string;
  description: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  company_name: string;
  signer: string;
  event_code: string;
  event_description: string;
  carrier_detail_code: string | null;
  status_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ShipEngineTrackingUpdate {
  tracking_number: string;
  status_code: string;
  status_description: string;
  carrier_status_code: string | null;
  carrier_status_description: string | null;
  ship_date: string;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  exception_description: string | null;
  events: ShipEngineTrackingEvent[];
}
// #endregion

// #region Advanced Options
export interface ShipEngineAdvancedOptions {
  bill_to_account: string | null;
  bill_to_country_code: string | null;
  bill_to_party: string | null;
  bill_to_postal_code: string | null;
  contains_alcohol: boolean;
  delivered_duty_paid: boolean;
  non_machinable: boolean;
  saturday_delivery: boolean;
  dry_ice: boolean;
  dry_ice_weight: ShipEngineWeight | null;
  fedex_freight: any | null;
  third_party_consignee: boolean;
  ancillary_endorsements_option: string | null;
  freight_class: string | null;
  custom_field1: string | null;
  custom_field2: string | null;
  custom_field3: string | null;
  collect_on_delivery: any | null;
  return_pickup_attempts: number | null;
  additional_handling: boolean;
  own_document_upload: boolean;
  limited_quantity: boolean;
  event_notification: boolean;
}
// #endregion

// #region Input Types
export interface ShipEngineInputAddress {
  name: string;
  phone: string;
  company_name: string;
  address_line1: string;
  address_line2?: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: 'yes' | 'no';
}

export interface ShipEngineInputPackage {
  package_code: string;
  items: {
    harmonized_tariff_code: string;
    country_of_manufacture: string;
    country_of_origin: string;
    quantity: number;
    description: string;
    value: {
      amount: number;
      currency: string;
    };
  }[];
  weight: {
    value: number;
    unit: string;
  };
  dimensions?: {
    unit: string;
    length: number;
    width: number;
    height: number;
  };
}
// #endregion

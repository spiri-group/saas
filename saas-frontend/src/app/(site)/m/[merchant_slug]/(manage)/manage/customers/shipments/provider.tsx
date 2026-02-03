'use client';

import React, { createContext, useReducer, useContext, useEffect, useMemo } from 'react';
import useMerchantShipments from './_hooks/useMerchantShipments';
import { recordref_type } from '@/utils/spiriverse';

//
// Types — single source of truth!
//

export type PackedItem = {
  id: string;
  forObject: recordref_type;
  variantId: string;
  name: string;
  quantity: number;
  weight: {
    amount: number;
    uom: string;
  };
  packed: number;
};

export type PackedBox = {
  id: string;
  name: string;
  code: string;
  dimensions_cm: {
    depth: number;
    width: number;
    height: number;
  };
  
  used_volume: number;
  used_weight: number;
  max_weight_kg: number;
  items: PackedItem[];

  label?: ShipmentPackageLabel
};

export type ShipmentLabel = {
  label_id: string;
  tracking_number: string;
  tracking_url: string;
};

export type ShipmentPackageLabel = {
  package_id: number;
  tracking_number: string;
  label_download: {
    pdf?: string;
    png?: string;
    zpl?: string;
  };
};

export type ShipmentAddress = {
  id: string;
  name: string;
  city: string;
  country: string;
  line1: string;
  line2?: string;
  postal_code: string;
  state?: string;
}

export type CurrencyAmount = {
  amount: number;
  currency: string;
};

export type Shipment = {
  id: string;
  orderRef: recordref_type;
  code: string; // Added code property for better display
  sendFrom: ShipmentAddress;
  sendTo: ShipmentAddress;
  carrierInfo?: {
    rate_id: string;
    code: string;
    name: string;
    service: {
      code: string;
      name: string;
      delivery_days: number;
    };
  };
  suggestedBoxes: PackedBox[];
  suggestedPricing: {
    tax_amount: CurrencyAmount;
    subtotal_amount: CurrencyAmount;
  };
  packedBoxes?: PackedBox[];
  packedPricing?: {
    tax_amount: CurrencyAmount;
    subtotal_amount: CurrencyAmount;
  };
  packingMetadata?: {
    wasDeviated: boolean;
    deviationType?: string;
  };

  label?: ShipmentLabel
};



export interface SimplifiedEstimateRecord {
    rate_id: string;
    carrier_code: string;
    carrier_friendly_name: string;
    service_code: string;
    service_type: string;
    delivery_days?: number;
    tax_amount: CurrencyAmount;
    total_rate: CurrencyAmount;
}

//
// State & actions
//

interface ShipmentsState {
  shipments: Shipment[];
  selectedShipmentId: string | null;
  estimatingShipmentId: string | null;
  finalizingShipmentId: string | null;
  packingState: 'idle' | 'packing' | 'completed';
  loading: boolean;
  error: Error | null;
}

type Action =
  | { type: 'SET_SHIPMENTS'; payload: Shipment[] }
  | { type: 'SET_SELECTED_SHIPMENT'; payload: string }
  | { type: 'SET_PACKING_STATE'; payload: 'idle' | 'packing' | 'completed' }
  | { type: 'SET_PACKED_BOXES'; payload: { shipmentId: string; boxes: PackedBox[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'ABANDON_CONFIGURATION' }
  | { type: 'SET_ESTIMATE'; payload: { shipmentId: string; estimate: SimplifiedEstimateRecord; packedBoxes: PackedBox[] } }
  | { type: 'START_ESTIMATE'; payload: string } // string = shipmentId
  | { type: 'START_FINALIZE'; payload: string }
  | { type: 'SET_FINALIZED'; payload: { shipmentId: string; shipmentLabel: ShipmentLabel; shipmentPackageLabels: ShipmentPackageLabel[]; packingMetadata: Shipment['packingMetadata'] } }
  | { type: 'REMOVE_SHIPMENT'; payload: { shipmentId: string } };

//
// Reducer
//

const initialState: ShipmentsState = {
  shipments: [],
  selectedShipmentId: null,
  packingState: 'idle',
  loading: false,
  error: null,
  estimatingShipmentId: null,
  finalizingShipmentId: null
};

function reducer(state: ShipmentsState, action: Action): ShipmentsState {
  switch (action.type) {
    case 'SET_SHIPMENTS':
      return { ...state, shipments: action.payload };
    case 'SET_SELECTED_SHIPMENT':
      return { ...state, selectedShipmentId: action.payload };
    case 'SET_PACKING_STATE':
      return { ...state, packingState: action.payload };
    case 'SET_PACKED_BOXES': {
      const { shipmentId, boxes } = action.payload;
      return {
        ...state,
        shipments: state.shipments.map((s) =>
          s.id === shipmentId ? { ...s, packedBoxes: boxes } : s
        ),
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ABANDON_CONFIGURATION':
      return { ...state, packingState: 'idle', shipments: state.shipments.map((s) => ({ ...s, packedBoxes: [] })) };
    case 'START_ESTIMATE':
      return { ...state, estimatingShipmentId: action.payload };
    case 'SET_ESTIMATE': {
    const { shipmentId, estimate, packedBoxes } = action.payload;
        return {
            ...state,
            estimatingShipmentId: null,
            shipments: state.shipments.map((s) =>
                s.id === shipmentId
                    ? {
                          ...s,
                          packedBoxes: packedBoxes,
                          packedPricing: {
                              tax_amount: estimate.tax_amount,
                              subtotal_amount: estimate.total_rate
                          }
                      }
                    : s
            )
        };
    }
    case 'START_FINALIZE':
      return { ...state, finalizingShipmentId: action.payload }; // reuse same loading state

    case 'SET_FINALIZED': {
      const { shipmentId, shipmentLabel, shipmentPackageLabels, packingMetadata } = action.payload;

      return {
        ...state,
        finalizingShipmentId: null,
        shipments: state.shipments.map((s) => {
          if (s.id !== shipmentId) return s;

          const updatedPackedBoxes =
            s.packedBoxes && shipmentPackageLabels?.length
              ? s.packedBoxes.map((box, i) => {
                  const pkg = shipmentPackageLabels[i];
                  return {
                    ...box,
                    label: {
                      package_id: pkg.package_id,
                      tracking_number: pkg.tracking_number,
                      label_download: pkg.label_download
                    }
                  };
                })
              : s.packedBoxes;

          return {
            ...s,
            packedBoxes: updatedPackedBoxes,
            label: {
              label_id: shipmentLabel.label_id,
              tracking_number: shipmentLabel.tracking_number,
              tracking_url: shipmentLabel.tracking_url || '',
            },
            packingMetadata
          };
        })
      };
    }


    case 'REMOVE_SHIPMENT': {
      const { shipmentId } = action.payload;
      return {
        ...state,
        shipments: state.shipments.filter(s => s.id !== shipmentId),
        selectedShipmentId: state.selectedShipmentId === shipmentId ? null : state.selectedShipmentId
      };
    }

    default:
      return state;
  }
}

//
// Context
//

const ShipmentsContext = createContext<{
  state: ShipmentsState;
  dispatch: React.Dispatch<Action>;
  selectedShipment: Shipment | undefined;
  boxes: PackedBox[];
} | null>(null);

//
// Provider
//

export const ShipmentsProvider: React.FC<{ merchantId: string; children: React.ReactNode }> = ({
  merchantId,
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { data: shipments, isLoading, error } = useMerchantShipments(merchantId);

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, [isLoading]);

  useEffect(() => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, [error]);

  useEffect(() => {
    if (shipments) {
      dispatch({ type: 'SET_SHIPMENTS', payload: shipments });
    }
  }, [shipments]);

  // Derived values — the magic:

  const selectedShipment = useMemo(() => {
    return state.shipments.find((s) => s.id === state.selectedShipmentId);
  }, [state.shipments, state.selectedShipmentId]);

  const boxes = useMemo(() => {
    if (!selectedShipment) return [];
    return (selectedShipment.packedBoxes?.length ?? 0) > 0
      ? selectedShipment.packedBoxes || []
      : selectedShipment.suggestedBoxes || [];
  }, [selectedShipment?.packedBoxes, selectedShipment?.suggestedBoxes]);

  return (
    <ShipmentsContext.Provider value={{ state, dispatch, selectedShipment, boxes }}>
      {children}
    </ShipmentsContext.Provider>
  );
};

//
// Hook
//

export function useShipmentsContext() {
  const context = useContext(ShipmentsContext);
  if (!context) {
    throw new Error('useShipmentsContext must be used within a ShipmentsProvider');
  }
  return context;
}

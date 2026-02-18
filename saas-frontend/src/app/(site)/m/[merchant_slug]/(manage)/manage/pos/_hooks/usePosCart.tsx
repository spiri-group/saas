'use client';

import { useReducer, useCallback, useState, useEffect } from "react";
import { PosVariant } from "./UseMerchantProducts";

export type PosCartItem = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  image?: string;
  price: { amount: number; currency: string };
  quantity: number;
  maxQuantity: number | null; // null = unlimited (no inventory tracking)
  forObject: { id: string; partition: string[] } | null;
  isCustom?: boolean;
};

export type PosDiscount = {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  reason: string;
};

export type PosCartState = {
  items: PosCartItem[];
  paymentMethod: 'CASH' | 'EXTERNAL_TERMINAL';
  customerEmail: string;
  notes: string;
  discount: PosDiscount | null;
};

export type ParkedSale = {
  id: string;
  items: PosCartItem[];
  paymentMethod: 'CASH' | 'EXTERNAL_TERMINAL';
  customerEmail: string;
  notes: string;
  discount: PosDiscount | null;
  label: string;
  parkedAt: string;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: PosCartItem }
  | { type: 'UPDATE_QUANTITY'; payload: { variantId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { variantId: string } }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'CASH' | 'EXTERNAL_TERMINAL' }
  | { type: 'SET_CUSTOMER_EMAIL'; payload: string }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_DISCOUNT'; payload: PosDiscount | null }
  | { type: 'RESTORE'; payload: Omit<PosCartState, never> }
  | { type: 'CLEAR' };

const initialState: PosCartState = {
  items: [],
  paymentMethod: 'CASH',
  customerEmail: '',
  notes: '',
  discount: null,
};

function cartReducer(state: PosCartState, action: CartAction): PosCartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(item => item.variantId === action.payload.variantId);
      if (existing) {
        const newQty = existing.quantity + action.payload.quantity;
        if (existing.maxQuantity !== null && newQty > existing.maxQuantity) {
          return state; // Can't add more than available stock
        }
        return {
          ...state,
          items: state.items.map(item =>
            item.variantId === action.payload.variantId
              ? { ...item, quantity: newQty }
              : item
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.variantId !== action.payload.variantId),
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.variantId === action.payload.variantId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.variantId !== action.payload.variantId),
      };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.payload };
    case 'SET_CUSTOMER_EMAIL':
      return { ...state, customerEmail: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'SET_DISCOUNT':
      return { ...state, discount: action.payload };
    case 'RESTORE':
      return action.payload;
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

const PARKED_SALES_KEY = (merchantId: string) => `pos-parked-sales-${merchantId}`;
const REGISTER_KEY = (merchantId: string) => `pos-register-${merchantId}`;

export type RegisterState = {
  openedAt: string;
  openingFloat: number;
  currency: string;
};

export const usePosCart = (merchantId?: string) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
  const [registerState, setRegisterState] = useState<RegisterState | null>(null);

  // Load parked sales and register state from localStorage
  useEffect(() => {
    if (!merchantId) return;
    try {
      const stored = localStorage.getItem(PARKED_SALES_KEY(merchantId));
      if (stored) setParkedSales(JSON.parse(stored));
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem(REGISTER_KEY(merchantId));
      if (stored) {
        const reg = JSON.parse(stored);
        // Only restore if opened today
        if (new Date(reg.openedAt).toDateString() === new Date().toDateString()) {
          setRegisterState(reg);
        } else {
          localStorage.removeItem(REGISTER_KEY(merchantId));
        }
      }
    } catch { /* ignore */ }
  }, [merchantId]);

  const addItem = useCallback((
    productId: string,
    productName: string,
    variant: PosVariant,
    forObject: { id: string; partition: string[] },
    quantity: number = 1
  ) => {
    const inv = variant.inventory;
    const maxQuantity = inv?.track_inventory ? inv.qty_on_hand - inv.qty_committed : null;

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId,
        productName,
        variantId: variant.id,
        variantName: variant.name,
        image: variant.images?.[0]?.url,
        price: variant.defaultPrice,
        quantity,
        maxQuantity,
        forObject,
      },
    });
  }, []);

  const addCustomItem = useCallback((
    name: string,
    amount: number,
    currency: string,
    quantity: number = 1
  ) => {
    const customId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: customId,
        productName: name,
        variantId: customId,
        variantName: name,
        price: { amount, currency },
        quantity,
        maxQuantity: null,
        forObject: null,
        isCustom: true,
      },
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { variantId, quantity } });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { variantId } });
  }, []);

  const setPaymentMethod = useCallback((method: 'CASH' | 'EXTERNAL_TERMINAL') => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  }, []);

  const setCustomerEmail = useCallback((email: string) => {
    dispatch({ type: 'SET_CUSTOMER_EMAIL', payload: email });
  }, []);

  const setNotes = useCallback((notes: string) => {
    dispatch({ type: 'SET_NOTES', payload: notes });
  }, []);

  const setDiscount = useCallback((discount: PosDiscount | null) => {
    dispatch({ type: 'SET_DISCOUNT', payload: discount });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  // Park current sale
  const parkSale = useCallback((label?: string) => {
    if (!merchantId || state.items.length === 0) return;
    const parked: ParkedSale = {
      id: `parked-${Date.now()}`,
      items: state.items,
      paymentMethod: state.paymentMethod,
      customerEmail: state.customerEmail,
      notes: state.notes,
      discount: state.discount,
      label: label || `Sale (${state.items.length} item${state.items.length !== 1 ? 's' : ''})`,
      parkedAt: new Date().toISOString(),
    };
    const updated = [...parkedSales, parked];
    setParkedSales(updated);
    localStorage.setItem(PARKED_SALES_KEY(merchantId), JSON.stringify(updated));
    dispatch({ type: 'CLEAR' });
  }, [merchantId, state, parkedSales]);

  // Restore a parked sale
  const restoreParkedSale = useCallback((parkedId: string) => {
    if (!merchantId) return;
    const sale = parkedSales.find(s => s.id === parkedId);
    if (!sale) return;
    dispatch({
      type: 'RESTORE',
      payload: {
        items: sale.items,
        paymentMethod: sale.paymentMethod,
        customerEmail: sale.customerEmail,
        notes: sale.notes,
        discount: sale.discount,
      },
    });
    const updated = parkedSales.filter(s => s.id !== parkedId);
    setParkedSales(updated);
    localStorage.setItem(PARKED_SALES_KEY(merchantId), JSON.stringify(updated));
  }, [merchantId, parkedSales]);

  // Delete a parked sale
  const deleteParkedSale = useCallback((parkedId: string) => {
    if (!merchantId) return;
    const updated = parkedSales.filter(s => s.id !== parkedId);
    setParkedSales(updated);
    localStorage.setItem(PARKED_SALES_KEY(merchantId), JSON.stringify(updated));
  }, [merchantId, parkedSales]);

  // Cash register management
  const openRegister = useCallback((openingFloat: number, currency: string) => {
    if (!merchantId) return;
    const reg: RegisterState = {
      openedAt: new Date().toISOString(),
      openingFloat,
      currency,
    };
    setRegisterState(reg);
    localStorage.setItem(REGISTER_KEY(merchantId), JSON.stringify(reg));
  }, [merchantId]);

  const closeRegister = useCallback(() => {
    if (!merchantId) return;
    setRegisterState(null);
    localStorage.removeItem(REGISTER_KEY(merchantId));
  }, [merchantId]);

  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price.amount * item.quantity,
    0
  );

  let discountAmount = 0;
  if (state.discount) {
    if (state.discount.type === 'PERCENTAGE') {
      discountAmount = Math.round(subtotal * (state.discount.value / 100));
    } else {
      discountAmount = Math.min(state.discount.value, subtotal);
    }
  }

  const total = subtotal - discountAmount;
  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const currency = state.items[0]?.price.currency || 'USD';

  return {
    ...state,
    subtotal,
    discountAmount,
    total,
    itemCount,
    currency,
    addItem,
    addCustomItem,
    updateQuantity,
    removeItem,
    setPaymentMethod,
    setCustomerEmail,
    setNotes,
    setDiscount,
    clear,
    // Park/hold
    parkedSales,
    parkSale,
    restoreParkedSale,
    deleteParkedSale,
    // Register
    registerState,
    openRegister,
    closeRegister,
  };
};

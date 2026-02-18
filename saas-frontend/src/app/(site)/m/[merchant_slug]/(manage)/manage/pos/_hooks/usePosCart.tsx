'use client';

import { useReducer, useCallback } from "react";
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
  forObject: { id: string; partition: string[] };
};

export type PosCartState = {
  items: PosCartItem[];
  paymentMethod: 'CASH' | 'EXTERNAL_TERMINAL';
  customerEmail: string;
  notes: string;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: PosCartItem }
  | { type: 'UPDATE_QUANTITY'; payload: { variantId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { variantId: string } }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'CASH' | 'EXTERNAL_TERMINAL' }
  | { type: 'SET_CUSTOMER_EMAIL'; payload: string }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'CLEAR' };

const initialState: PosCartState = {
  items: [],
  paymentMethod: 'CASH',
  customerEmail: '',
  notes: '',
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
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

export const usePosCart = () => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

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

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price.amount * item.quantity,
    0
  );

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const currency = state.items[0]?.price.currency || 'USD';

  return {
    ...state,
    subtotal,
    itemCount,
    currency,
    addItem,
    updateQuantity,
    removeItem,
    setPaymentMethod,
    setCustomerEmail,
    setNotes,
    clear,
  };
};

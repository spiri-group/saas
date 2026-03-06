'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { currency_amount_type, recordref_type } from '@/utils/spiriverse';

// ============================================================================
// Types
// ============================================================================

export type CartItemType = 'PRODUCT' | 'SERVICE';

export type CartItem = {
    id: string;
    itemType: CartItemType;
    descriptor: string;
    quantity: number;
    price: currency_amount_type;
    merchantId: string;
    imageUrl?: string | null;

    // Reference to the listing (product or service)
    listingRef?: recordref_type;

    // Product-specific
    variantId?: string;

    // Service-specific
    isService?: boolean;
    serviceId?: string;
    service?: {
        id: string;
        name: string;
        vendorId: string;
        thumbnail?: {
            image: {
                media: {
                    url: string;
                };
            };
        };
        pricing: {
            type: string;
            fixedPrice?: currency_amount_type;
            packages?: Array<{ price: currency_amount_type }>;
            hourlyRate?: currency_amount_type;
        };
    };
    questionnaireResponses?: Array<{
        questionId: string;
        question: string;
        answer: string;
    }>;
    selectedAddOns?: string[];

    // Sync status (local only, not persisted to backend)
    _pendingSync?: boolean;
    _localOnly?: boolean;
};

export type ShoppingCart = {
    id: string;
    items: CartItem[];
};

type AddProductInput = {
    productRef: recordref_type;
    variantId: string;
    descriptor: string;
    quantity: number;
    price: currency_amount_type;
    imageUrl?: string;
};

type AddServiceInput = {
    serviceId: string;
    questionnaireResponses?: Array<{
        questionId: string;
        question: string;
        answer: string;
    }>;
    selectedAddOns?: string[];
};

// ============================================================================
// LocalStorage helpers
// ============================================================================

const CART_STORAGE_KEY = 'spiriverse_cart_cache';
const PENDING_OPERATIONS_KEY = 'spiriverse_cart_pending_ops';

type PendingOperation = {
    id: string;
    type: 'ADD_PRODUCT' | 'ADD_SERVICE' | 'UPDATE_QUANTITY' | 'REMOVE';
    payload: any;
    timestamp: number;
};

function getLocalCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function setLocalCart(items: CartItem[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save cart to localStorage:', e);
    }
}

function getPendingOperations(): PendingOperation[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(PENDING_OPERATIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function addPendingOperation(op: Omit<PendingOperation, 'id' | 'timestamp'>) {
    if (typeof window === 'undefined') return;
    try {
        const ops = getPendingOperations();
        ops.push({
            ...op,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        });
        localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(ops));
    } catch (e) {
        console.error('Failed to save pending operation:', e);
    }
}

function removePendingOperation(id: string) {
    if (typeof window === 'undefined') return;
    try {
        const ops = getPendingOperations().filter(op => op.id !== id);
        localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(ops));
    } catch (e) {
        console.error('Failed to remove pending operation:', e);
    }
}

function clearPendingOperations() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PENDING_OPERATIONS_KEY);
}

// ============================================================================
// Cart Event for UI updates
// ============================================================================

export const UNIFIED_CART_EVENT = 'unifiedCartEvent';

function dispatchCartEvent(items: CartItem[]) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(UNIFIED_CART_EVENT, { detail: items }));
    }
}

// ============================================================================
// GraphQL Operations
// ============================================================================

async function fetchCart(): Promise<ShoppingCart> {
    const response = await gql<{ shoppingCart: ShoppingCart }>(`
        query GetShoppingCart {
            shoppingCart {
                id
                items {
                    id
                    itemType
                    descriptor
                    quantity
                    price {
                        amount
                        currency
                    }
                    merchantId
                    imageUrl
                    listingRef {
                        id
                        partition
                        container
                    }
                    variantId
                    isService
                    serviceId
                    service {
                        id
                        name
                        vendorId
                        thumbnail {
                            image {
                                media {
                                    url
                                }
                            }
                        }
                        pricing {
                            type
                            fixedPrice {
                                amount
                                currency
                            }
                            packages {
                                price {
                                    amount
                                    currency
                                }
                            }
                            hourlyRate {
                                amount
                                currency
                            }
                        }
                    }
                    questionnaireResponses {
                        questionId
                        question
                        answer
                    }
                    selectedAddOns
                }
            }
        }
    `, {});

    return response.shoppingCart;
}

async function addProductToCartMutation(input: AddProductInput) {
    const response = await gql<{
        add_product_to_cart: {
            success: boolean;
            message: string;
            shoppingCart: ShoppingCart;
        };
    }>(`
        mutation AddProductToCart($input: AddProductToCartInput!) {
            add_product_to_cart(input: $input) {
                success
                message
                shoppingCart {
                    id
                    items {
                        id
                        itemType
                        descriptor
                        quantity
                        price {
                            amount
                            currency
                        }
                        merchantId
                        imageUrl
                        productRef {
                            id
                            partition
                            container
                        }
                        variantId
                        isService
                        serviceId
                    }
                }
            }
        }
    `, { input });

    return response.add_product_to_cart;
}

async function addServiceToCartMutation(input: AddServiceInput) {
    const response = await gql<{
        add_service_to_cart: {
            success: boolean;
            message: string;
            shoppingCart: ShoppingCart;
        };
    }>(`
        mutation AddServiceToCart($serviceId: ID!, $questionnaireResponses: [QuestionResponseInput], $selectedAddOns: [ID]) {
            add_service_to_cart(serviceId: $serviceId, questionnaireResponses: $questionnaireResponses, selectedAddOns: $selectedAddOns) {
                success
                message
                shoppingCart {
                    id
                    items {
                        id
                        itemType
                        descriptor
                        quantity
                        price {
                            amount
                            currency
                        }
                        merchantId
                        listingRef {
                            id
                            partition
                            container
                        }
                        isService
                        serviceId
                        service {
                            id
                            name
                            vendorId
                            thumbnail {
                                image {
                                    media {
                                        url
                                    }
                                }
                            }
                            pricing {
                                type
                                fixedPrice {
                                    amount
                                    currency
                                }
                                packages {
                                    price {
                                        amount
                                        currency
                                    }
                                }
                                hourlyRate {
                                    amount
                                    currency
                                }
                            }
                        }
                        questionnaireResponses {
                            questionId
                            question
                            answer
                        }
                        selectedAddOns
                    }
                }
            }
        }
    `, {
        serviceId: input.serviceId,
        questionnaireResponses: input.questionnaireResponses || null,
        selectedAddOns: input.selectedAddOns || null
    });

    return response.add_service_to_cart;
}

async function updateQuantityMutation(itemId: string, quantity: number) {
    const response = await gql<{
        update_cart_item_quantity: {
            success: boolean;
            message: string;
            shoppingCart: ShoppingCart;
        };
    }>(`
        mutation UpdateCartItemQuantity($itemId: ID!, $quantity: Int!) {
            update_cart_item_quantity(itemId: $itemId, quantity: $quantity) {
                success
                message
                shoppingCart {
                    id
                    items {
                        id
                        itemType
                        descriptor
                        quantity
                        price {
                            amount
                            currency
                        }
                        merchantId
                    }
                }
            }
        }
    `, { itemId, quantity });

    return response.update_cart_item_quantity;
}

async function removeFromCartMutation(itemId: string) {
    const response = await gql<{
        remove_from_cart: {
            success: boolean;
            message: string;
            shoppingCart: ShoppingCart;
        };
    }>(`
        mutation RemoveFromCart($itemId: ID!) {
            remove_from_cart(itemId: $itemId) {
                success
                message
                shoppingCart {
                    id
                    items {
                        id
                        itemType
                        descriptor
                        quantity
                    }
                }
            }
        }
    `, { itemId });

    return response.remove_from_cart;
}

async function clearCartMutation() {
    const response = await gql<{
        clear_cart: {
            success: boolean;
            message: string;
            shoppingCart: ShoppingCart;
        };
    }>(`
        mutation ClearCart {
            clear_cart {
                success
                message
                shoppingCart {
                    id
                    items {
                        id
                    }
                }
            }
        }
    `, {});

    return response.clear_cart;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useUnifiedCart(options?: { enabled?: boolean }) {
    const queryClient = useQueryClient();
    const syncInProgressRef = useRef(false);
    const enabled = options?.enabled ?? true;

    // Query backend cart
    const cartQuery = useQuery({
        queryKey: ['unified-cart'],
        queryFn: fetchCart,
        staleTime: 0,
        refetchOnWindowFocus: true,
        enabled,
    });

    // Sync pending operations when cart loads or comes online
    const syncPendingOperations = useCallback(async () => {
        if (syncInProgressRef.current) return;

        const pendingOps = getPendingOperations();
        if (pendingOps.length === 0) return;

        syncInProgressRef.current = true;

        for (const op of pendingOps) {
            try {
                switch (op.type) {
                    case 'ADD_PRODUCT':
                        await addProductToCartMutation(op.payload);
                        break;
                    case 'ADD_SERVICE':
                        await addServiceToCartMutation(op.payload);
                        break;
                    case 'UPDATE_QUANTITY':
                        await updateQuantityMutation(op.payload.itemId, op.payload.quantity);
                        break;
                    case 'REMOVE':
                        await removeFromCartMutation(op.payload.itemId);
                        break;
                }
                removePendingOperation(op.id);
            } catch (e) {
                console.error('Failed to sync pending operation:', op, e);
                // Keep the operation for retry
            }
        }

        syncInProgressRef.current = false;

        // Refresh cart after sync
        queryClient.invalidateQueries({ queryKey: ['unified-cart'] });
    }, [queryClient]);

    // Sync on mount and when coming back online
    useEffect(() => {
        syncPendingOperations();

        const handleOnline = () => {
            syncPendingOperations();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncPendingOperations]);

    // Update localStorage when backend cart changes
    useEffect(() => {
        if (cartQuery.data?.items) {
            setLocalCart(cartQuery.data.items);
            dispatchCartEvent(cartQuery.data.items);
        }
    }, [cartQuery.data?.items]);

    // Add product mutation with optimistic update
    const addProduct = useMutation({
        mutationFn: addProductToCartMutation,
        onMutate: async (input: AddProductInput) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['unified-cart'] });

            // Snapshot previous value
            const previousCart = queryClient.getQueryData<ShoppingCart>(['unified-cart']);

            // Optimistically update
            const optimisticItem: CartItem = {
                id: crypto.randomUUID(),
                itemType: 'PRODUCT',
                listingRef: input.productRef,
                variantId: input.variantId,
                descriptor: input.descriptor,
                quantity: input.quantity,
                price: input.price,
                imageUrl: input.imageUrl,
                merchantId: input.productRef.partition[0],
                _pendingSync: true,
            };

            queryClient.setQueryData<ShoppingCart>(['unified-cart'], (old) => {
                if (!old) return { id: '', items: [optimisticItem] };

                // Check for existing item to merge
                const existingIndex = old.items.findIndex(
                    item => item.itemType === 'PRODUCT' &&
                        item.listingRef?.id === input.productRef.id &&
                        item.variantId === input.variantId
                );

                if (existingIndex >= 0) {
                    const updated = [...old.items];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: updated[existingIndex].quantity + input.quantity,
                        _pendingSync: true,
                    };
                    return { ...old, items: updated };
                }

                return { ...old, items: [optimisticItem, ...old.items] };
            });

            // Update localStorage immediately
            const currentItems = getLocalCart();
            const existingLocalIndex = currentItems.findIndex(
                item => item.itemType === 'PRODUCT' &&
                    item.listingRef?.id === input.productRef.id &&
                    item.variantId === input.variantId
            );

            if (existingLocalIndex >= 0) {
                currentItems[existingLocalIndex].quantity += input.quantity;
            } else {
                currentItems.unshift(optimisticItem);
            }
            setLocalCart(currentItems);
            dispatchCartEvent(currentItems);

            return { previousCart };
        },
        onError: (err, input, context) => {
            // Rollback on error
            if (context?.previousCart) {
                queryClient.setQueryData(['unified-cart'], context.previousCart);
                setLocalCart(context.previousCart.items);
                dispatchCartEvent(context.previousCart.items);
            }

            // Save to pending operations for retry
            addPendingOperation({ type: 'ADD_PRODUCT', payload: input });

            toast.error('Failed to add to cart', {
                description: 'Item saved locally. Will sync when back online.'
            });
        },
        onSuccess: (data) => {
            // Update with server response
            queryClient.setQueryData<ShoppingCart>(['unified-cart'], {
                id: data.shoppingCart.id,
                items: data.shoppingCart.items
            });
            setLocalCart(data.shoppingCart.items);
            dispatchCartEvent(data.shoppingCart.items);

            toast.success('Added to cart', {
                description: data.message
            });
        },
    });

    // Add service mutation with optimistic update
    const addService = useMutation({
        mutationFn: addServiceToCartMutation,
        onMutate: async (input: AddServiceInput) => {
            await queryClient.cancelQueries({ queryKey: ['unified-cart'] });
            const previousCart = queryClient.getQueryData<ShoppingCart>(['unified-cart']);

            // We don't have full service info for optimistic update, just show pending
            const optimisticItem: CartItem = {
                id: crypto.randomUUID(),
                itemType: 'SERVICE',
                descriptor: 'Service',
                quantity: 1,
                price: { amount: 0, currency: 'USD' },
                merchantId: '',
                isService: true,
                serviceId: input.serviceId,
                questionnaireResponses: input.questionnaireResponses,
                selectedAddOns: input.selectedAddOns,
                _pendingSync: true,
            };

            queryClient.setQueryData<ShoppingCart>(['unified-cart'], (old) => {
                if (!old) return { id: '', items: [optimisticItem] };
                return { ...old, items: [optimisticItem, ...old.items] };
            });

            return { previousCart };
        },
        onError: (err, input, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(['unified-cart'], context.previousCart);
                setLocalCart(context.previousCart.items);
                dispatchCartEvent(context.previousCart.items);
            }

            addPendingOperation({ type: 'ADD_SERVICE', payload: input });

            toast.error('Failed to add service to cart', {
                description: 'Will retry when back online.'
            });
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ShoppingCart>(['unified-cart'], {
                id: data.shoppingCart.id,
                items: data.shoppingCart.items
            });
            setLocalCart(data.shoppingCart.items);
            dispatchCartEvent(data.shoppingCart.items);

            toast.success('Added to cart', {
                description: data.message
            });
        },
    });

    // Update quantity mutation
    const updateQuantity = useMutation({
        mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
            updateQuantityMutation(itemId, quantity),
        onMutate: async ({ itemId, quantity }) => {
            await queryClient.cancelQueries({ queryKey: ['unified-cart'] });
            const previousCart = queryClient.getQueryData<ShoppingCart>(['unified-cart']);

            queryClient.setQueryData<ShoppingCart>(['unified-cart'], (old) => {
                if (!old) return old;

                if (quantity <= 0) {
                    return { ...old, items: old.items.filter(item => item.id !== itemId) };
                }

                return {
                    ...old,
                    items: old.items.map(item =>
                        item.id === itemId ? { ...item, quantity, _pendingSync: true } : item
                    )
                };
            });

            // Update localStorage
            const currentItems = getLocalCart();
            if (quantity <= 0) {
                setLocalCart(currentItems.filter(item => item.id !== itemId));
            } else {
                setLocalCart(currentItems.map(item =>
                    item.id === itemId ? { ...item, quantity } : item
                ));
            }
            dispatchCartEvent(getLocalCart());

            return { previousCart };
        },
        onError: (err, { itemId, quantity }, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(['unified-cart'], context.previousCart);
                setLocalCart(context.previousCart.items);
                dispatchCartEvent(context.previousCart.items);
            }

            addPendingOperation({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ShoppingCart>(['unified-cart'], {
                id: data.shoppingCart.id,
                items: data.shoppingCart.items
            });
            setLocalCart(data.shoppingCart.items);
            dispatchCartEvent(data.shoppingCart.items);
        },
    });

    // Remove item mutation
    const removeItem = useMutation({
        mutationFn: removeFromCartMutation,
        onMutate: async (itemId: string) => {
            await queryClient.cancelQueries({ queryKey: ['unified-cart'] });
            const previousCart = queryClient.getQueryData<ShoppingCart>(['unified-cart']);

            queryClient.setQueryData<ShoppingCart>(['unified-cart'], (old) => {
                if (!old) return old;
                return { ...old, items: old.items.filter(item => item.id !== itemId) };
            });

            const currentItems = getLocalCart();
            setLocalCart(currentItems.filter(item => item.id !== itemId));
            dispatchCartEvent(getLocalCart());

            return { previousCart };
        },
        onError: (err, itemId, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(['unified-cart'], context.previousCart);
                setLocalCart(context.previousCart.items);
                dispatchCartEvent(context.previousCart.items);
            }

            addPendingOperation({ type: 'REMOVE', payload: { itemId } });
        },
        onSuccess: (data) => {
            queryClient.setQueryData<ShoppingCart>(['unified-cart'], {
                id: data.shoppingCart.id,
                items: data.shoppingCart.items
            });
            setLocalCart(data.shoppingCart.items);
            dispatchCartEvent(data.shoppingCart.items);

            toast.success('Removed from cart');
        },
    });

    // Clear cart mutation
    const clearCart = useMutation({
        mutationFn: clearCartMutation,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['unified-cart'] });
            const previousCart = queryClient.getQueryData<ShoppingCart>(['unified-cart']);

            queryClient.setQueryData<ShoppingCart>(['unified-cart'], (old) => {
                if (!old) return old;
                return { ...old, items: [] };
            });

            setLocalCart([]);
            clearPendingOperations();
            dispatchCartEvent([]);

            return { previousCart };
        },
        onError: (err, _, context) => {
            if (context?.previousCart) {
                queryClient.setQueryData(['unified-cart'], context.previousCart);
                setLocalCart(context.previousCart.items);
                dispatchCartEvent(context.previousCart.items);
            }

            toast.error('Failed to clear cart');
        },
        onSuccess: () => {
            toast.success('Cart cleared');
        },
    });

    // Get cart items (prefer query data, fallback to localStorage)
    const items = cartQuery.data?.items ?? getLocalCart();

    // Calculate totals
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + (item.price?.amount ?? 0) * item.quantity, 0);

    return {
        // Data
        items,
        totalItems,
        totalAmount,
        isLoading: cartQuery.isLoading,
        isError: cartQuery.isError,
        hasPendingOperations: getPendingOperations().length > 0,

        // Mutations
        addProduct: addProduct.mutate,
        addService: addService.mutate,
        updateQuantity: (itemId: string, quantity: number) => updateQuantity.mutate({ itemId, quantity }),
        removeItem: removeItem.mutate,
        clearCart: clearCart.mutate,

        // Mutation states
        isAddingProduct: addProduct.isPending,
        isAddingService: addService.isPending,
        isUpdating: updateQuantity.isPending,
        isRemoving: removeItem.isPending,
        isClearing: clearCart.isPending,

        // Manual sync
        syncPendingOperations,
        refetch: () => queryClient.invalidateQueries({ queryKey: ['unified-cart'] }),
    };
}

export default useUnifiedCart;

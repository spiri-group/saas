'use client'

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import ReactDOM from "react-dom"
import { gql } from "@/lib/services/gql"
import { useUnifiedCart, CartItem } from "./useUnifiedCart"
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { useUserPreferences } from "@/lib/context/UserPreferencesContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import UseEventListener from "@/components/utils/Events/UseEventListener"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel"
import { useSession } from "next-auth/react"
import { v4 as uuid } from "uuid"
import { currency_amount_type, recordref_type, stripe_details_type } from "@/utils/spiriverse"
import StripePayment from "@/app/(site)/components/StripePayment"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import useFormStatus from "@/components/utils/UseFormStatus"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export const TOGGLE_DETAILED_CART = "TOGGLE_DETAILED_CART"

type cart_summary_type = {
    quantity: number,
    subtotal: currency_amount_type,
    fees: currency_amount_type,
    total: currency_amount_type,
    discount: currency_amount_type
}

const summariseCart = async (items: CartItem[], userCurrency = "USD"): Promise<cart_summary_type> => {
    if (items.length === 0) {
        return {
            quantity: 0,
            subtotal: { amount: 0, currency: userCurrency },
            fees: { amount: 0, currency: userCurrency },
            total: { amount: 0, currency: userCurrency },
            discount: { amount: 0, currency: userCurrency }
        }
    }

    // Build order lines using forObject format
    const lines = items.map((item) => {
        const baseLine = {
            id: uuid(),
            quantity: item.quantity,
            price: item.price,
            descriptor: item.descriptor,
            merchantId: item.merchantId,
        };

        if (!item.listingRef) {
            // Optimistic items (pending sync) may lack listingRef — skip silently
            if (!item._pendingSync) {
                console.warn('Cart item missing listingRef:', item);
            }
            return null;
        }

        return {
            ...baseLine,
            forObject: item.listingRef,
            variantId: item.variantId,
            // Optional service-specific details
            ...(item.questionnaireResponses || item.selectedAddOns ? {
                service: {
                    questionnaireResponses: item.questionnaireResponses,
                    selectedAddOns: item.selectedAddOns
                }
            } : {})
        };
    }).filter(Boolean); // Filter out null items (missing listingRef)

    const resp = await gql<{
        estimate: cart_summary_type
    }>(`
        query estimateCart($target: String!, $lines: [OrderLineInput]) {
            estimate(target: $target, lines: $lines) {
                quantity,
                subtotal { amount currency }
                fees { amount currency }
                discount { amount currency }
                total { amount currency }
            }
        }`, {
        target: "CUSTOMER-WEB-ORDER",
        lines
    });

    return resp.estimate;
}

const useBL = () => {
    const session = useSession()
    const { currency: userCurrency = "USD" } = useUserPreferences()
    const [visible, setVisibility] = useState(false);

    // Use the unified cart
    const cart = useUnifiedCart();

    // Create a stable key for cart items to avoid infinite loops in useEffect
    // Only recalculates when item IDs or quantities actually change
    const cartItemsKey = useMemo(() => {
        return cart.items.map(item => `${item.id}:${item.quantity}`).join(',');
    }, [cart.items]);

    const [orderRef, setOrderRef] = useState<recordref_type | null>(null)
    const [stripe, setStripe] = useState<stripe_details_type | null>(null)
    const [stripePaymentAmount, setStripePaymentAmount] = useState<cart_summary_type | null>(null)
    const [savedItems, setSavedItems] = useState<CartItem[] | null>(null)
    const [summary, setSummary] = useState<cart_summary_type | null>(null)
    const [stripePaymentVisibility, setStripePaymentVisibility] = useState(true)

    useEffect(() => {
        if (visible) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "auto"
        }
    }, [visible])

    const [element, setElement] = useState<HTMLElement | null>(null)
    useEffect(() => {
        setElement(document.getElementById("modal-div"))
    }, [])

    UseEventListener(TOGGLE_DETAILED_CART, () => {
        setVisibility(!visible)
    })

    const createOrderStatus = useFormStatus();

    const create_order = async () => {
        if (session.data?.user == null) return;
        if (isNullOrUndefined(summary)) return;
        if (cart.items.length === 0) return;

        await createOrderStatus.submit(async () => {
            // Build order lines using listingRef
            const allLines = cart.items.map((item) => {
                if (!item.listingRef) {
                    console.error('Cart item missing listingRef:', item);
                    return null;
                }

                return {
                    id: uuid(),
                    quantity: item.quantity,
                    price: item.price,
                    descriptor: item.descriptor,
                    merchantId: item.merchantId,
                    forObject: item.listingRef,
                    variantId: item.variantId,
                    // Optional service-specific details
                    ...(item.questionnaireResponses || item.selectedAddOns ? {
                        service: {
                            questionnaireResponses: item.questionnaireResponses || [],
                            selectedAddOns: item.selectedAddOns || []
                        }
                    } : {})
                };
            }).filter(Boolean);

            const resp = await gql<{
                create_order: {
                    order: {
                        id: string,
                        ref: recordref_type,
                        stripe: stripe_details_type
                    }
                }
            }>(`
                mutation create_order($customerEmail: String!, $lines: [OrderLineInput], $target: String!) {
                    create_order(customerEmail: $customerEmail, lines: $lines, target: $target) {
                        order {
                            id
                            ref {
                                id
                                partition
                                container
                            }
                            stripe {
                                accountId
                                setupIntentId
                                setupIntentSecret
                            }
                        }
                    }
                }
            `, {
                customerEmail: session.data?.user?.email ?? "",
                lines: allLines,
                target: "CUSTOMER-WEB-ORDER"
            })

            return {
                details: resp.create_order.order,
                amount: summary.total
            }
        }, {}, async (data) => {
            setStripePaymentAmount(summary)
            setSavedItems([...cart.items])

            // Clear the unified cart
            cart.clearCart()

            setOrderRef(data.details.ref)
            setStripe(data.details.stripe)
        })
    }

    // Update summary when cart items change
    useEffect(() => {
        const updateSummary = async () => {
            if (cart.items.length === 0) {
                setSummary({
                    quantity: 0,
                    subtotal: { amount: 0, currency: userCurrency },
                    fees: { amount: 0, currency: userCurrency },
                    total: { amount: 0, currency: userCurrency },
                    discount: { amount: 0, currency: userCurrency }
                });
                return;
            }

            setSummary(null) // Show loading state
            try {
                const newSummary = await summariseCart(cart.items, userCurrency);
                setSummary(newSummary);
            } catch (e) {
                console.error('Failed to summarise cart:', e);
                // Fallback to simple sum
                const total = cart.items.reduce((sum, item) =>
                    sum + (item.price?.amount ?? 0) * item.quantity, 0
                );
                setSummary({
                    quantity: cart.totalItems,
                    subtotal: { amount: total, currency: userCurrency },
                    fees: { amount: 0, currency: userCurrency },
                    total: { amount: total, currency: userCurrency },
                    discount: { amount: 0, currency: userCurrency }
                });
            }
        }

        updateSummary();
    }, [cartItemsKey, userCurrency])

    const cancelOrder = () => {
        // Restore items would require re-adding them - for now just close
        setStripePaymentVisibility(false)
        setStripe(null)
        setVisibility(false)
        createOrderStatus.reset()
    }

    const alterOrder = () => {
        // Would need to restore items - for now just show cart
        setStripePaymentVisibility(false)
        setStripe(null)
        createOrderStatus.reset()
        setVisibility(true)
    }

    return {
        visible,
        toggleVisibility: () => setVisibility(!visible),
        savedItems,
        element,
        cart,
        summary,
        orderRef,
        stripe: {
            details: stripe,
            amount: stripePaymentAmount,
            visibility: stripePaymentVisibility,
        },
        status: createOrderStatus,
        submit: create_order,
        cancelOrder,
        alterOrder,
    }
}

const ShoppingCart = () => {
    const bl = useBL();

    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 450 : false;

    // Stripe payment dialog
    if (bl.stripe.details != null && bl.stripe.amount != null && bl.orderRef != null) {
        return (
            <Dialog open={bl.stripe.visibility}>
                <DialogContent>
                    <VisuallyHidden><DialogTitle>Payment</DialogTitle></VisuallyHidden>
                    <StripePayment
                        type="SETUP"
                        orderRef={bl.orderRef}
                        stripeAccountId={bl.stripe.details.accountId}
                        clientSecret={bl.stripe.details.setupIntentSecret}
                        onCancel={bl.cancelOrder}
                        onAlter={bl.alterOrder}
                        amount={bl.stripe.amount.total}
                        items={bl.savedItems?.map((item) => ({
                            name: item.descriptor,
                            quantity: item.quantity,
                            price: item.price,
                            itemType: item.itemType
                        }))}
                        paymentSummary={bl.stripe.amount}
                    />
                </DialogContent>
            </Dialog>
        )
    }

    // Cart drawer
    if (bl.element != null && bl.visible) {
        return ReactDOM.createPortal(
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ ease: "easeInOut", duration: 0.5 }}
                    onClick={bl.toggleVisibility}
                    className="fixed z-20 left-0 top-0 w-full h-screen bg-black"
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isMobile ? window.innerWidth : 450 }}
                    exit={{ width: 0 }}
                    transition={{ ease: "easeInOut", duration: 0.75 }}
                    className="fixed z-50 right-0 bottom-0 h-4/5 bg-white p-3 rounded-t-lg"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ ease: "easeInOut", duration: 0.5, delay: 0.75 }}
                        className="flex flex-col items-center w-full h-full"
                    >
                        <div className="flex flex-row w-full">
                            <h1 className="flex-grow text-center text-xl">Cart</h1>
                        </div>

                        <Carousel className="w-full flex flex-col flex-grow min-h-0 my-4" orientation="vertical">
                            <CarouselPrevious style="RECTANGLE" className="w-full" />
                            <CarouselContent outerClassName="w-full flex-grow min-h-0 py-3">
                                {bl.cart.items.length === 0 ? (
                                    <CarouselItem className="flex items-center justify-center h-full">
                                        <p className="text-gray-500">Your cart is empty</p>
                                    </CarouselItem>
                                ) : (
                                    bl.cart.items.map((item) => (
                                        <CartItemRow
                                            key={item.id}
                                            item={item}
                                            onUpdateQuantity={bl.cart.updateQuantity}
                                            onRemove={bl.cart.removeItem}
                                        />
                                    ))
                                )}
                            </CarouselContent>
                            <CarouselNext style="RECTANGLE" className="w-full" />
                        </Carousel>

                        {/* Cart Summary */}
                        {isNullOrUndefined(bl.summary) ? (
                            <div className="flex flex-col bg-gray-50 p-4 animate-pulse w-full rounded-lg mb-2">
                                <span className="flex-grow">Quantity</span>
                                <span className="flex-grow">Subtotal</span>
                                <span className="flex-grow">Fees</span>
                                <span className="flex-grow">Total</span>
                            </div>
                        ) : (
                            <div className="flex flex-col w-full p-4 bg-slate-100 rounded-lg mb-2">
                                <div className="flex flex-row w-full">
                                    <span className="flex-grow">Quantity</span>
                                    <span className="flex-grow text-right">{bl.summary.quantity}</span>
                                </div>
                                <div className="flex flex-row w-full">
                                    <span className="flex-grow">Subtotal</span>
                                    <CurrencySpan withAnimation={false} value={bl.summary.subtotal} />
                                </div>
                                <div className="flex flex-row w-full">
                                    <span className="flex-grow">Fees</span>
                                    <CurrencySpan withAnimation={false} value={bl.summary.fees} />
                                </div>
                                <div className="h-[0.5px] w-full bg-slate-400 my-2" />
                                <div className="flex flex-row w-full font-bold">
                                    <span className="flex-grow">Total</span>
                                    <CurrencySpan withAnimation={false} value={bl.summary.total} />
                                </div>
                                <span className="mt-2 text-slate-600 text-sm">Shipping and Tax calculated at Checkout</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-row w-full space-x-3">
                            <Button
                                type="button"
                                onClick={bl.toggleVisibility}
                                variant="destructive"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    bl.cart.clearCart();
                                    bl.toggleVisibility();
                                }}
                                disabled={bl.cart.isClearing}
                            >
                                {bl.cart.isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clear'}
                            </Button>
                            <Button
                                type="button"
                                className="flex-grow"
                                onClick={bl.submit}
                                disabled={
                                    bl.status.formState === "processing" ||
                                    isNullOrUndefined(bl.summary) ||
                                    bl.cart.items.length === 0
                                }
                                variant={bl.status.button.variant}
                                data-testid="checkout-btn"
                            >
                                {bl.status.formState === "idle" ? "Checkout" :
                                    bl.status.formState === "error" ? bl.status.button.title
                                        : "Loading payment ..."}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            </>,
            bl.element
        )
    }

    return null;
}

// Separate component for cart item row
type CartItemRowProps = {
    item: CartItem;
    onUpdateQuantity: (itemId: string, quantity: number) => void;
    onRemove: (itemId: string) => void;
};

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdateQuantity, onRemove }) => {
    const isService = item.itemType === "SERVICE" || item.isService;

    // Get image URL
    let imageUrl: string | null = null;
    if (item.imageUrl) {
        imageUrl = item.imageUrl;
    } else if (item.service?.thumbnail?.image?.media?.url) {
        imageUrl = item.service.thumbnail.image.media.url;
    }

    return (
        <CarouselItem className="flex flex-row space-x-3 w-full">
            {!isNullOrWhitespace(imageUrl) ? (
                <div className="relative flex-none w-[100px] h-[100px] rounded-xl bg-white drop-shadow-lg">
                    <Image
                        className="flex-none p-2 rounded-xl"
                        src={imageUrl!}
                        alt={item.descriptor}
                        style={{ objectFit: 'contain' }}
                        fill={true}
                    />
                </div>
            ) : (
                <div className="w-[100px] h-[100px] flex items-center justify-center bg-gray-200 rounded-xl">
                    No image
                </div>
            )}
            <div className="flex flex-col flex-grow space-y-1 pt-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{item.descriptor}</span>
                    {isService && (
                        <Badge variant="secondary" className="text-xs">Service</Badge>
                    )}
                </div>
                {item.price && <CurrencySpan withAnimation={false} value={item.price} />}

                {/* Only show quantity input for products */}
                {!isService && (
                    <Input
                        aria-label="item quantity"
                        className="w-full"
                        type="number"
                        min={1}
                        withButtons={false}
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                    />
                )}

                {/* Show questionnaire info for services */}
                {isService && item.questionnaireResponses && item.questionnaireResponses.length > 0 && (
                    <div className="text-xs text-gray-500">
                        {item.questionnaireResponses.length} question{item.questionnaireResponses.length > 1 ? 's' : ''} answered
                    </div>
                )}

                <span
                    onClick={() => onRemove(item.id)}
                    className="ml-auto text-blue-400 cursor-pointer text-sm"
                >
                    Remove
                </span>
            </div>
        </CarouselItem>
    );
};

export default ShoppingCart;

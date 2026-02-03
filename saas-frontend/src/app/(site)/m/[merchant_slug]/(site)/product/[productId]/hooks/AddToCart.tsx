'use client';

import { useUnifiedCart } from "@/app/(site)/components/Catalogue/components/ShoppingCart/useUnifiedCart";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Panel, PanelContent } from "@/components/ux/Panel"
import { isNullOrUndefined, isNullOrWhitespace, isNumeric } from "@/lib/functions";
import { cn } from "@/lib/utils";
import { media_type, recordref_type, variant_type } from "@/utils/spiriverse"
import React from "react";

type Props = {
    productRef: recordref_type,
    image: media_type | undefined,
    variant: variant_type,
    productTitle: string,
    className?: string,
    useMerchantTheming?: boolean
}

const AddToCart: React.FC<Props> = ({ className, productRef, image, productTitle, variant, useMerchantTheming }) => {
    const [quantity, setQuantity] = React.useState<number>(1)
    const { addProduct, isAddingProduct } = useUnifiedCart();

    // Determine styling based on merchant theming flag
    const panelStyle = useMerchantTheming ? {
        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
        color: `rgb(var(--merchant-panel-primary-foreground))`,
        borderColor: `rgb(var(--merchant-primary), 0.2)`,
        boxShadow: `var(--shadow-merchant-lg)`
    } : {};

    const textClass = useMerchantTheming ? "text-merchant-default-foreground" : "";
    const linkClass = useMerchantTheming ? "text-merchant-links" : "text-links";

    return (
        <TooltipProvider>
        <Panel className={cn(className, "w-72")} style={panelStyle}>
            <PanelContent className="flex flex-col h-full">
                <div className="mb-3">
                    <CurrencySpan
                        className={cn("text-3xl", textClass)}
                        withAnimation={false}
                        value={{
                            currency: variant.defaultPrice.currency,
                            amount: variant.defaultPrice.amount * quantity
                        }} />
                </div>
                <Input type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => {
                        if (!isNumeric(e.target.value)) setQuantity(1)
                        else setQuantity(parseInt(e.target.value))}
                    } />
                <Button
                    onClick={() => {
                        let imageUrl: string | undefined = undefined
                        if (!isNullOrUndefined(image) && !isNullOrWhitespace(image.url)) {
                            imageUrl = image.url
                        }

                        addProduct({
                            productRef: productRef,
                            variantId: variant.id,
                            imageUrl,
                            price: variant.defaultPrice,
                            descriptor: productTitle,
                            quantity: quantity
                        })

                        // reset quantity to 1
                        setQuantity(1)
                    }}
                    disabled={isAddingProduct}
                    className="w-full my-4">
                    {isAddingProduct ? 'Adding...' : 'Add to Cart'}
                </Button>
                <div className="mt-auto">
                    <div className={cn("flex flex-row items-center text-sm", textClass)}>
                        <span>Payment</span>
                        <span className="mx-3 text-gray-300">|</span>
                        <Tooltip>
                            <TooltipTrigger className={linkClass}>Secure Payment</TooltipTrigger>
                            <TooltipContent className="w-44">
                                We partner with Stripe to ensure all of your payment information is submitted securely.
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </PanelContent>
        </Panel>
        </TooltipProvider>
    )
}

export default AddToCart
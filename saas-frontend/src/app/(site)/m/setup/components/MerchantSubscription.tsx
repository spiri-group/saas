'use client'

import { product_type, variant_type } from "@/utils/spiriverse"
import React, { useEffect, useState } from "react"
import UseMerchantSubscriptionPlans from "../hooks/UseMerchantSubscriptionPlans";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import CurrencySpan from "@/components/ux/CurrencySpan";
import ComboBox from "@/components/ux/ComboBox";
import { Square, SquareCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatch } from "react-hook-form";
import { Panel, PanelContent } from "@/components/ux/Panel";
import { isNullOrUndefined } from "@/lib/functions";

type BLProps = {
    vendorId?: string,
    currency: string,
    control: any
}

const useBL = (props: BLProps) => {
    const [payFrequency, setPayFrequency] = useState<{increment: string, label: string}>({
        increment: "month",
        label: "Monthly"
    });
    const currency = props.currency
    const [subscriptionOptions, setSubscriptionOptions] = useState<product_type[]>([])
    const merchantSubscriptionOptions = UseMerchantSubscriptionPlans(currency);

    // Watch the current selected plans
    const selectedPlans = useWatch({
        control: props.control,
        name: "subscription.plans" as any,
        defaultValue: []
    }) || []

    useEffect(() => {
        if (merchantSubscriptionOptions.data != null) {
            let data = merchantSubscriptionOptions.data
            // we sort the data so that coming soon is at the end
            data.sort((a, b) => {
                if (a.description == null || a.description.toLowerCase() == "coming soon") {
                    return 1
                } else if (b.description == null || b.description.toLowerCase() == "coming soon") {
                    return -1
                } else {
                    return 0
                }
            })
            // now we only select the prices according to the pay frequency
            data = 
                data
                .filter(x => x.defaultVariant != null) 
                .map(x => {
                    const defaultVariant = x.defaultVariant as variant_type
                    const allPrices = [defaultVariant.defaultPrice, ...(defaultVariant.otherPrices ?? [])]
                    const defaultPrice = allPrices.find(x => x.recurring?.interval == payFrequency.increment)
                    if (defaultPrice == null) return x
                    const otherPrices = allPrices.filter(y =>
                        y.id !== defaultPrice?.id
                    )
                    return {
                        ...x,
                        defaultVariant: {
                            ...defaultVariant,
                            defaultPrice, otherPrices
                        }
                    }
                })
            
            // Ensure base plan is always selected
            const basePlan = data.find(x => x.name === "Essentials")
            if (!basePlan?.defaultVariant?.defaultPrice) {
                setSubscriptionOptions(data)
                return;
            }

            setSubscriptionOptions(data)
        }
    }, [merchantSubscriptionOptions.data, selectedPlans, payFrequency, props.control])

    return {
        loading: merchantSubscriptionOptions.isLoading,
        set: {
            payFrequency: setPayFrequency
        },
        data: {
            basePlan: subscriptionOptions.find(x => x.name == "Essentials"),
            addOns: subscriptionOptions.filter(x => x.name !== "Essentials"),
            payFrequency
        }
    }
}

type Props = BLProps & {
}

const SubscriptionsTotal: React.FC<{control: any, field_name: string, subscriptions: product_type[], cell_size: string} &
    React.HTMLAttributes<HTMLDivElement>> = ({control, field_name, subscriptions, className, cell_size, ...props}) => {

    const items = useWatch({
        control,
        name: field_name as any
    })

    const currency : undefined | string = subscriptions[0]?.defaultVariant?.defaultPrice?.currency;
    let total = 0;
    if (items.length > 0) {
        total = items.reduce((acc, field) => {
            return acc + field["price"].amount
        }, total)
    }

    return (
        <div className={cn("ml-auto flex flex-row items-center space-x-6 pt-2 pr-4", className)} {...props}>
            <div className="flex-none w-16 flex flex-col space-y-1">
                <span className="text-md font-bold">Total</span>
                <span className="text-xs">Excl. Tax</span>
            </div>
            <Panel className="">
                <PanelContent className={`flex-none ${cell_size} flex items-center justify-center`}>
                    {isNullOrUndefined(currency) ? <div>0</div> :
                        <CurrencySpan 
                            asDiv={true}
                            className="font-bold text-accent" 
                            withAnimation={true}
                            value={{
                                amount: total,
                                currency: currency!
                            }} />
                    }
                </PanelContent>
            </Panel>
        </div>
    )
}

const Subscriptions: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.data.basePlan == null) {
        return <div className="text-sm text-slate-400"> Loading pricing plan options ... </div>
    }

    const cell_size = "w-24 h-8"

    return (
        <>
            <div className="flex flex-col" data-testid="merchant-subscription-section">
                <div className='flex flex-row justify-between mt-3 mb-2'>
                    <div className='flex flex-row space-x-3'>
                        <div className="flex flex-col space-y-2">
                            <ComboBox
                                value={bl.data.payFrequency}
                                className="flex-none w-40"
                                onChange={(e) => {
                                    bl.set.payFrequency(e)
                                }}
                                fieldMapping={{
                                    keyColumn: "increment",
                                    labelColumn: "label"
                                }}
                                items={[
                                    {increment: "month", label: "Monthly"},
                                    {increment: "year", label: "Yearly"}
                                ]} />
                        </div>
                    </div>
                    <div className="flex flex-row items-center space-x-6 pr-4" data-testid="base-plan-price">
                        <span className="flex-none w-16 text-md font-bold">Base</span>
                        <Panel className="">
                            <PanelContent className={`flex-none ${cell_size} flex items-center justify-center`}>
                                <CurrencySpan
                                    asDiv={true}
                                    className="font-bold text-accent"
                                    withAnimation={false}
                                    value={bl.data.basePlan!.defaultVariant!.defaultPrice} />
                            </PanelContent>
                        </Panel>
                    </div>
                </div>
                {
                    bl.loading ? <div> Loading... </div>
                    :
                    <>
                    <div className="flex-grow flex flex-col space-y-2">
                        <FormField
                            name="subscription.plans"
                            control={props.control}
                            render={({ field }) => {
                                // Ensure base plan is always first - check on every render
                                if (bl.data.basePlan?.defaultVariant?.defaultPrice) {
                                    const currentValue = field.value ?? [];
                                    const hasBasePlan = currentValue.some(p => p?.productId === bl.data.basePlan?.id);

                                    if (!hasBasePlan) {
                                        const basePlanData = {
                                            productId: bl.data.basePlan.id,
                                            variantId: bl.data.basePlan.defaultVariant.id,
                                            name: bl.data.basePlan.name,
                                            price: bl.data.basePlan.defaultVariant.defaultPrice
                                        };
                                        // Set it synchronously
                                        setTimeout(() => {
                                            field.onChange([basePlanData, ...currentValue], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                        }, 0);
                                    }
                                }

                                return (
                                <FormItem className="flex flex-col mt-2">
                                    <FormControl>
                                        <div>
                                        {bl.data.addOns && bl.data.addOns.length > 0 ? (
                                            <>
                                                {bl.data.addOns.map((option) => {
                                                    const isAvailable = option.defaultVariant != null && option.description.toLowerCase() != "coming soon"
                                                    const isSelected = (field.value ?? []).some(
                                                        x => x.productId == option.id    
                                                    )
                                                    return (
                                                    <div
                                                        className={`flex flex-row items-center cursor-pointer px-4 pb-4 rounded border-b border-primary`}
                                                        key={option.id}
                                                        data-testid={`addon-plan-${option.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                        aria-label={`Add-on plan: ${option.name}`}
                                                        onClick={() => {
                                                            if (isAvailable && option.defaultVariant != null) {
                                                                const selected = {
                                                                    productId: option.id,
                                                                    variantId: option.defaultVariant.id,
                                                                    name: option.name,
                                                                    price: option.defaultVariant.defaultPrice
                                                                }
                                                                const currentValue = field.value ?? []
                                                                if (currentValue.some(x => 
                                                                    x.productId == selected.productId
                                                                )) {
                                                                    field.onChange(currentValue.filter(
                                                                        x => x.productId != selected.productId
                                                                    ),{shouldValidate: true});
                                                                } else {
                                                                    field.onChange(currentValue.concat(
                                                                        selected
                                                                    ), {shouldValidate: true});
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        { 
                                                            isAvailable ?
                                                                isSelected ? 
                                                                <SquareCheck className="-ml-1 mr-2 flex-none h-4 w-4 text-green-600" /> 
                                                                : <Square className="-ml-1  mr-2 flex-none h-4 w-4 text-gray-600" /> 
                                                            : <Square className="-ml-1  mr-2 flex-none h-4 w-4 text-gray-300" /> }
                                                        <div className="flex flex-col md:flex-row md:ml-3 md:mr-3">
                                                            <span className="flex-none text-[15px] font-bold mb-3 md:mb-0 w-full md:w-32"> {option.name} </span>
                                                            <span className="text-sm"> {option.description} </span>
                                                        </div>
                                                        {option.defaultVariant != null &&
                                                            <Panel className="ml-auto">
                                                                <PanelContent className={`flex-none ${cell_size} flex items-center justify-center`}>
                                                                    <CurrencySpan 
                                                                        asDiv={true}
                                                                        className={cn("text-md", (field.value ?? []).some(
                                                                            x => x.productId == option.id    
                                                                        ) ? 'text-accent font-bold': 'text-default')}
                                                                        value={option.defaultVariant.defaultPrice} />
                                                                </PanelContent>
                                                            </Panel>
                                                        }
                                                    </div>
                                                    )
                                                })}
                                            </>
                                        ) : (
                                            <div> No plans available </div>
                                        )}
                                        </div>
                                    </FormControl>
                                </FormItem>
                                )
                            }}
                        />
                    </div>
                    </>
                }
                <SubscriptionsTotal
                    control={props.control}
                    field_name="subscription.plans"
                    subscriptions={bl.data.addOns}
                    cell_size={cell_size} />
            </div>
        </>
       
    )
}

export default Subscriptions;
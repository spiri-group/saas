'use client';

import ExternalCurrencyInput from "react-currency-input-field"
import { decodeAmountFromSmallestUnit, encodeAmountToSmallestUnit, getCurrencySymbols } from "@/lib/functions"
import { z } from "zod"
import { Input } from "../ui/input"
import { currency_amount_type } from "@/utils/spiriverse"
import { useEffect, useState } from "react"
import useDebounce from "./UseDebounce"
import { cn } from "@/lib/utils";

export type CurrencyAmountSchema = z.infer<typeof CurrencyAmountSchema>

export const CurrencyAmountSchema = z.object({
    id: z.string().optional(),
    currency: z.string().min(1),
    amount: z.coerce.number()
})

type Props = {
    "aria-label"?: string,
    "aria-placeholder"?: string,
    decimalLimit?: number
    placeholder?: string,
    readOnly?: boolean,
    max?: number,
    min?: number,
    className?: string,
    value: currency_amount_type | undefined,
    glass?: boolean,
    onChange: (value: { amount: number | undefined, currency: string}) => void,
    onValueChange?: (value: currency_amount_type) => void
}

const CurrencyInput: React.FC<Props & { glass?: boolean }> = ({
    decimalLimit = 2,
    value,
    onChange,
    onValueChange,
    glass = true,
    ...props
}) => {
    const [inputValue, setInputValue] = useState<string>("")

    useEffect(() => {
        if (value?.amount !== undefined) {
            setInputValue(decodeAmountFromSmallestUnit(value.amount, value.currency).toFixed(decimalLimit))
        }
    }, [value, decimalLimit])

    const debouncedAmount = useDebounce(inputValue, 1000)

    useEffect(() => {
        if (debouncedAmount !== "" && debouncedAmount !== undefined && value !== undefined) {
            const numericValue = parseFloat(debouncedAmount)
            const encodedAmount = numericValue ? encodeAmountToSmallestUnit(numericValue, value.currency) : undefined
            
            onChange({ currency: value.currency, amount: encodedAmount })

            if (onValueChange && encodedAmount !== undefined) {
                onValueChange({ currency: value.currency, amount: encodedAmount })
            }
        }
    }, [debouncedAmount])

    if (!value) return <Input disabled={true} />
    if (!value.currency) throw new Error('Currency must be defined on schema to use currency input')

    return (
        <ExternalCurrencyInput
            placeholder={props.placeholder}
            aria-label={props["aria-label"]}
            aria-placeholder={props["aria-placeholder"]}
            value={inputValue}
            type="text"
            max={props.max}
            readOnly={props.readOnly}
            decimalsLimit={decimalLimit}
            className={cn(
                "flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                glass
                  ? "bg-white/70 backdrop-blur-sm border-white/20 text-black placeholder:text-black/60 shadow-inner"
                  : "bg-white border border-input text-black",
                props.className
            )}
            prefix={getCurrencySymbols(value.currency).prefix}
            onFocus={(e) => {
                // Select all text when the input is focused
                e.target.select();
            }}
            onValueChange={(val) => {
                const sanitizedValue = val ? val.replace(/[^0-9.]/g, "") : ""
                setInputValue(sanitizedValue)
            }}
        />
    )
}

export default CurrencyInput;
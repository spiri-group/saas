import { Button } from "../ui/button"
import CurrencyInput, { CurrencyAmountSchema } from "./CurrencyInput"
import PercentageInput from "./PercentageInput"
import { useState } from "react"
import { currency_amount_type } from "@/utils/spiriverse"
import CancelDialogButton from "./CancelDialogButton"
import CurrencySpan from "./CurrencySpan"
import { escape_key } from "@/lib/functions"
import { cn } from "@/lib/utils"

type RefundUIProps = {
    "aria-label"?: string,
    originalAmount: CurrencyAmountSchema,
    value: CurrencyAmountSchema | undefined,
    onChange: (value: CurrencyAmountSchema) => void,
    className?: string
}

export const RefundInput: React.FC<RefundUIProps> = (props) => {
    const currency = props.originalAmount.currency

    const originalAmount = props.originalAmount
    const [refundAmount, setRefundAmount] = useState<currency_amount_type>(props.value ?? {
        amount: 0,
        currency: props.originalAmount.currency
    })

    const percentage = Math.max(0, refundAmount.amount == 0 ? 0 : refundAmount.amount / originalAmount.amount); // e.g. 0.8
    const finalCharge = {
        amount: Math.max(0, originalAmount.amount - refundAmount.amount),
        currency: props.originalAmount.currency
    };

    return (
        <div className={cn("flex flex-col space-y-2 w-80", props.className)}>
            <PercentageInput 
                mode="slider"
                value={percentage ?? ""}
                aria-label={`${props["aria-label"]}-percentage-slider`}
                onChange={(value) => {
                    setRefundAmount({
                        currency,
                        amount: Math.round(originalAmount.amount * value)
                    })
                }}
            />
            <div className="flex flex-row justify-between items-center">
                <PercentageInput
                    mode="input"
                    className="bg-transparent"
                    aria-label={`${props["aria-label"]}-percentage-input`}
                    value={percentage}
                    onChange={(value) => {
                        setRefundAmount({
                            currency,
                            amount: Math.round(originalAmount.amount * value)
                        })
                    }} />
                <div className="flex flex-col items-center mx-2">
                    <span> or </span>
                    <Button
                     aria-label={`${props["aria-label"]}-full-button`}
                     variant="link" type="button" onClick={() => {
                        setRefundAmount(originalAmount)
                    }}> Full </Button>
                </div>
                <CurrencyInput
                    aria-label={`${props["aria-label"]}-revised-amount-input`}
                    value={refundAmount}
                    onChange={({amount, currency}) => {
                        setRefundAmount({
                            currency,
                            amount: amount ?? 0
                        })
                    }}
                    max={originalAmount.amount}
                    placeholder="amount"              
                />
            </div>
            {refundAmount.amount < 0 ? 
                <span className="text-destructive">You cannot refund more than the paid amount.</span> :
                <span className="">The remaining paid will be <CurrencySpan value={finalCharge} className="font-bold" /></span>
            }
            <div className="grid grid-cols-2 space-x-2">
                <CancelDialogButton aria-label={`${props["aria-label"]}-cancel-button`} />
                <Button 
                    disabled={finalCharge.amount < 0}
                    aria-label={`${props["aria-label"]}-confirm-button`}
                    type="button"
                    onClick={() => {
                        props.onChange(refundAmount)
                        escape_key()
                    }}
                    >Confirm</Button>
            </div>
        </div>
    )
    
}

export default RefundInput;
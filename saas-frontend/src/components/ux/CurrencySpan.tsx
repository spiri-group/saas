'use client'

import { useUserPreferences } from "@/lib/context/UserPreferencesContext";
import { decodeAmountFromSmallestUnit, isNullOrWhitespace } from "@/lib/functions";
import { currency_amount_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";

type Props = {
    value: currency_amount_type,
    defaultLabel?: string,
    delay?: number,
    className?: string,
    withAnimation?: boolean,
    asDiv?: boolean // New optional parameter
}

export const formatCurrency = (value: number, currency: string, formatter?: Intl.NumberFormat) => {
    const fmt = formatter ?? Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency,
    })
    return fmt.format(decodeAmountFromSmallestUnit(value, currency))
}

const CurrencySpan : React.FC<Props> = ({defaultLabel="-", withAnimation=false, asDiv=false, ...props}) => {
    const { locale } = useUserPreferences();
    if (isNullOrWhitespace(locale)) return null;

    const [dollarAmount, setDollarAmount] = useState<number | null>(null);
    const [newDollarAmount, setNewDollarAmount] = useState<number | null>(null);
    const [oldDollarAmount, setOldDollarAmount] = useState<number | null>(null);

    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: props.value.currency,
        currencyDisplay: 'code'
    });
    
    // we want to have a useEffect which updates the dollar amount in increments of 0.01 every 10ms
    useEffect(() => {
        if (dollarAmount != null && newDollarAmount != null && oldDollarAmount != null) {
            // otherwise we're good to go
            const difference = newDollarAmount - dollarAmount;
            const increment = difference / 5;
            let currentDollarAmount = dollarAmount;
            const interval = setInterval(() => {
                if (increment == 0) {
                    setNewDollarAmount(null);
                    setOldDollarAmount(null);
                }
                currentDollarAmount += increment;
                setDollarAmount(currentDollarAmount);
            }, 30);
            return () => clearInterval(interval);
        }
    }, [dollarAmount, newDollarAmount, oldDollarAmount])
    
    useEffect(() => {
        setTimeout(() => {
            if (props.value != undefined) {
                if (withAnimation) {
                    setOldDollarAmount(0)
                    setDollarAmount(0)
                    setNewDollarAmount(props.value.amount)
                } else {
                    setDollarAmount(props.value.amount)
                }
            }
        }, props.delay ?? 0)
    },[props.delay, props.value, withAnimation])

    const currencyText = dollarAmount != null ? `${formatCurrency(dollarAmount, props.value.currency, formatter)}` : defaultLabel;
    return asDiv ? <div className={props.className}>{currencyText}</div> : <span className={props.className}>{currencyText}</span>
}

export default CurrencySpan;
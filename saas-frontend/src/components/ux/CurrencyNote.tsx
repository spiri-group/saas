import { cn } from "@/lib/utils";

type Props = {
    currency: string;
    className?: string;
};

const CURRENCY_NAMES: Record<string, string> = {
    AUD: "Australian Dollars",
    USD: "US Dollars",
    GBP: "British Pounds",
    EUR: "Euros",
    NZD: "New Zealand Dollars",
    CAD: "Canadian Dollars",
    JPY: "Japanese Yen",
    SGD: "Singapore Dollars",
};

const CurrencyNote: React.FC<Props> = ({ currency, className }) => {
    const name = CURRENCY_NAMES[currency] || currency;
    return (
        <p className={cn("text-xs text-slate-400", className)}>
            All amounts in {currency} ({name})
        </p>
    );
};

export default CurrencyNote;

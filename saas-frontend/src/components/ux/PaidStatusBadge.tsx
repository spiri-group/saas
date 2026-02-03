import BouncingDots from "@/icons/BouncingDots";
import { cn } from "@/lib/utils";

type Props = {
    className?: string,
    status: string,
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const statusClasses = {
    AWAITING_PAYMENT: "text-yellow-800 bg-yellow-200",
    PAID: "text-green-800",
    PARTIAL_REFUND: "text-blue-800 bg-blue-200",
    FULL_REFUND: "text-red-800",
};

const statusText = {
    AWAITING_PAYMENT: <span>Awaiting Payment</span>,
    PAID: <span>Paid</span>,
    PARTIAL_REFUND: <span>Partially Refunded</span>,
    FULL_REFUND: <span>Refunded</span>,
    AWAITING_REFUND: <BouncingDots />
};

const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-5 py-2.5 text-lg",
    xl: "px-6 py-3 text-xl"
};

const PaidStatusBadge: React.FC<Props> = ({status, className, size = 'md'}) => {
    const badge_cn = `rounded-xl items-center justify-between ${className || ''}`;
    const classes = statusClasses[status] || '';
    const text = statusText[status] || '';
    const sizeClass = sizeClasses[size];

    return (
        <div className={cn(badge_cn, classes, sizeClass)}>
            {text}
        </div>
    );
}

export default PaidStatusBadge;
import { cn } from "@/lib/utils";

type Props = {
    status: string
}

const RefundStatusBadge: React.FC<Props> = ({status}) => {
    const badge_cn = `text-sm text-center`

    if (status == "APPROVED") {
        return (
            <span className={cn(badge_cn, `text-green-600`)}> Approved </span>
        )
    } else if (status == "REJECTED") {
        return (
            <span className={cn(badge_cn, `text-red-500`)}> Rejected </span> 
        )
    } else if (status = "PENDING") {
        return (
            <span className={cn(badge_cn, `text-yellow-500`)}> Pending </span>
        )
    } else if (status = "FULL REFUND") {
        return (
            <span className={cn(badge_cn, `text-green-600`)}> Full Refund </span> 
        )
    } else if (status = "PARTIAL REFUND") {
        return (
            <span className={cn(badge_cn, `text-yellow-500`)}> Partial Refund </span> 
        )
    } else if (status = "CANCELLED") {
        return (
            <span className={cn(badge_cn, `text-gray-500`)}> Cancelled </span>
        )
    } else {
        return <></>
    }
}

export default RefundStatusBadge
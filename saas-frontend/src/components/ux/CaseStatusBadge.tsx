import { cn } from "@/lib/utils";
import { JSX } from "react";

type Props = {
    status: string,
    children: JSX.Element | JSX.Element[] | any
}

const CaseStatusBadge: React.FC<Props> = (props) => {

    return (
        <div className={cn("rounded-md p-3", `bg-case-status-${props.status}`)}>
            {props.children}
        </div>
    )
}

export default CaseStatusBadge
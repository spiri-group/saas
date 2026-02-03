'use client'

import { cn } from "@/lib/utils";
import { useCustomerViewMode } from "../_hooks/UseCustomerViewMode";

type Props = {
    merchantAccessGranted: boolean;
    children: React.ReactNode;
}

const LayoutContent: React.FC<Props> = ({ merchantAccessGranted, children }) => {
    const isCustomerViewMode = useCustomerViewMode();
    
    return (
        <div 
            style={{
                backgroundImage: "var(--merchant-background-image)"
            }}
            className={
                cn(
                    "h-full flex-grow bg-no-repeat bg-scroll bg-merchant-background bg-center bg-cover",
                    // Show sidenav margin only if merchant has access AND not in customer view
                    merchantAccessGranted && !isCustomerViewMode ? "ml-0 md:ml-[200px]" : ""
                )
            }>
            {children}
        </div>
    );
};

export default LayoutContent;
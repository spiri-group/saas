'use client'

import { useParams, useRouter } from "next/navigation";
import SideNav from "@/components/ui/sidenav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import UseUserComplete from "../settings/hooks/UseUserComplete";
import { JSX, useEffect } from "react";

const useBL = () => {
    const params = useParams();
    if (params == null) throw new Error("params is null");

    const options = [
        {
            label: "My Details",
            href: "/c/[customerId]/settings"
        },
        {
            label: "Messages",
            href: "/c/[customerId]/messages"
        },
        {
            label: "Orders",
            href: "/c/[customerId]/orders"
        },
        {
            label: "Bookings",
            href: "/c/[customerId]/bookings"
        },
        {
            label: "Payments",
            href: "/c/[customerId]/payments"
        }
    ]

    const dialogMapping = {

    } as Record<string, () => JSX.Element>
    
    const optionsEnhanced = options.map((option) => (
        {
            ...option,
            href: option.href?.replace("[customerId]", params.customerId as string)
        }
    ))

    const renderDialog = (dialogKey: string) => {
        const DialogComponent = dialogMapping[dialogKey];
        return DialogComponent ? DialogComponent() : <></>;
    };

    return {
        options: {
            get: optionsEnhanced
        },
        renderDialog
    }
}

const CustomerSideNav : React.FC = () => {
    const bl = useBL();
    const router = useRouter();
    const params = useParams();
    if (params == null) throw new Error("params is null");

    const { data, isLoading} = UseUserComplete(params.customerId as string);
    useEffect(() => {
        if (data == null) return;
        if (data.requiresInput) {
            // redirect
            router.replace(`/u/${params.customerId}/setup`);
        }
    }, [data])

    if (isLoading || data?.requiresInput) return <></>;

    return (
        <>
            <div className="hidden md:block">
                <SideNav className="ml-3 mt-3" navOptions={bl.options.get} renderDialog={bl.renderDialog} />
            </div>
            <div className="block md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="w-full p-2" variant="outline">Menu</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                        <SideNav navOptions={bl.options.get} renderDialog={bl.renderDialog}  />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}

//#endregion

export default CustomerSideNav;
'use client' 

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Panel } from "@/components/ux/Panel";
import { ChevronUp, ChevronsUpDown } from "lucide-react";
import React from "react";
import UseVendorInformation from "./hooks/UseVendorInformation";
import { useSearchParams } from "next/dist/client/components/navigation";

type Props = {
    defaultOpen?: boolean,
    gql_conn: gql_conn_type
}

const NameTag : React.FC<Props> = ({defaultOpen = false}) => {
    const params = useSearchParams();
    const [isOpen, setIsOpen] = React.useState(defaultOpen)
    
    const {data} = UseVendorInformation(params.get("merchantId") as string);
    
    return (
        <Panel className="flex flex-col p-2 h-40"> 
            {data != null ? (
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex flex-row">
                    <Avatar>
                        <AvatarFallback>SD</AvatarFallback>
                    </Avatar>
                    <span className="ml-2 mt-1 font-bold"> {data.name} </span>
                    <div className="ml-auto">
                        <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" /> } 
                            <span className="sr-only">Toggle</span>
                        </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent>
                    <div className="flex flex-col text-sm p-2">
                        <span> Phone: <a href={`tel:${data.contact.public.phoneNumber.value}`}>{data.contact.public.phoneNumber.displayAs}</a></span>
                        <span> Address: {data.address} </span> 
                        <span> Website: {data.website}  </span>
                    </div>
                </CollapsibleContent>
                </Collapsible>
            ) : <></>}
        </Panel>
    )
}

export default NameTag;
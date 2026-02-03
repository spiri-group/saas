'use client'

import React, { useState } from "react"
import CustomerList from "./components/CustomerList"

import { recordref_type } from "@/utils/spiriverse"
import CustomerPurchases from "./components/CustomerPurchases"
import UIContainer from "@/components/uicontainer"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
    me: { id: string }
}

const useBL = () => {
    const [selectedCustomerRef, setSelectedCustomerRef] = useState<recordref_type | null>(null)

    return {
        selectedCustomerRef: {
            get: selectedCustomerRef,
            set: setSelectedCustomerRef
        }
    }
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL();

    return (
        <UIContainer me={props.me}>
            <div className="flex flex-row space-x-2 px-2 py-2 h-screen-minus-nav">
                <div className="flex flex-col flex-none w-72">
                    <CustomerList merchantId={props.merchantId} onSelect={bl.selectedCustomerRef.set} />
                </div>
                <CustomerPurchases  
                    className="flex-wrap flex-grow"
                    merchantId={props.merchantId} 
                    customerId={bl.selectedCustomerRef.get ? bl.selectedCustomerRef.get.id : undefined} />
            </div>
        </UIContainer>
    );
}

export default UI;
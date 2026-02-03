'use client' 

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import UseCustomerLists from "../hooks/UseCustomerList";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Panel } from "@/components/ux/Panel";
import { recordref_type } from "@/utils/spiriverse";

type BLProps = {
    merchantId: string,
    onSelect: (selected: recordref_type) => void
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {
    
    const customerLists = UseCustomerLists(props.merchantId)

    return {
        customerLists: {
            isLoading: customerLists.isLoading,
            get: customerLists.data ?? []
        }
    }
}

const CustomerList: React.FC<Props> = (props) => {
    const [filter, setFilter] = useState<string>("")
    const [selectedCustomer, setSelectedCustomer] = useState<recordref_type | null>(null)

    const bl = useBL(props);

    const filteredCustomers = bl.customerLists.get.filter((customer) => {
        const firstName = customer.firstname ? customer.firstname.toLowerCase() : ""
        const email = customer.email ? customer.email.toLowerCase() : ""
        return firstName.includes(filter.toLowerCase()) || email.includes(filter.toLowerCase())
    })

    return (
        <Panel className="flex-grow">
            <h1 className="text-xl font-bold mb-3">Your Customers</h1>
            {bl.customerLists.isLoading ? (
                <span className="text-xs">Loading...</span>
            ) : (
                filteredCustomers.length > 0 ? (
                    <>
                    <Input
                        placeholder="Search customer"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        className="max-w-sm"
                    />
                    <ul>
                        {filteredCustomers.map((customer) => (
                            <div key={customer.id}>
                                <li className="flex flex-row p-2">
                                    <div className="text-xs flex flex-col">
                                        <span>{customer.firstname}</span>
                                        <span>{customer.email}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        className="ml-auto text-xs"
                                        variant="link"
                                        onClick={() => {
                                            setSelectedCustomer(customer.ref)
                                            props.onSelect(customer.ref)
                                        }}
                                        disabled={selectedCustomer === customer.ref}
                                    >
                                        {selectedCustomer === customer.ref ? "Selected" : "Select"}
                                    </Button>
                                </li>
                                <Separator />
                            </div>
                        ))}
                    </ul>
                    </>
                ) : (
                    <span className="text-md">No customers found.</span>
                )
            )}
        </Panel>
    )
}

export default CustomerList;
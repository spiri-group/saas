'use client';

import React, { useState } from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PropertyHouseForm from "./components/PropertyHouseForm";
import PropertyApartmentForm from "./components/PropertyApartmentForm";
import { Form } from "@/components/ui/form";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import UseUpsertDeliveryInstructions, { deliveryInstructions_type } from "./hooks/UseUpsertDeliveryInstructions"; 
import PropertyBusinessForm from "./components/PropertyBusinessForm";
import { escape_key } from "@/lib/functions";

type BLProps = {
    userId: string
    addressId: string
}

type Props = BLProps & {
    onCancel: () => void
}

const useBL = (props: BLProps) => {
    const upsertDeliveryInstructions = UseUpsertDeliveryInstructions(props.userId, props.addressId)

    return {
        form: upsertDeliveryInstructions.form,
        values: upsertDeliveryInstructions.form.getValues(),
        save: async (values: deliveryInstructions_type) => {
            await upsertDeliveryInstructions.mutation.mutateAsync(values)
            escape_key()
        }
    }
}

const DeliveryInstructionsForm: React.FC<Props> = (props) => {
    const [selectedPropertyType, setSelectedPropertyType] = useState<string>('House' as deliveryInstructions_type['propertyType'])
    const bl = useBL(props)

    return (
        <>
             <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.save)} className="flex flex-col w-full space-y-3 p-2">
                    <DialogTitle>Set delivery instructions</DialogTitle>
                    <div className="flex flex-row space-x-4">
                        <span className="mt-2">Property type</span>
                        <Button
                            onClick={() => {
                                setSelectedPropertyType('House');
                                bl.form.setValue('propertyType', "HOUSE");
                            }}
                            variant={selectedPropertyType === 'House' ? 'default' : 'outline'}
                        >
                            House
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedPropertyType('Apartment');
                                bl.form.setValue('propertyType', "APARTMENT");
                            }}
                            variant={selectedPropertyType === 'Apartment' ? 'default' : 'outline'}
                        >
                            Apartment
                        </Button>
                        <Button
                            onClick={() => {
                                setSelectedPropertyType('Business');
                                bl.form.setValue('propertyType', "BUSINESS");
                            }}
                            variant={selectedPropertyType === 'Business' ? 'default' : 'outline'}
                        >
                            Business
                        </Button>
                    </div>
                    {selectedPropertyType === 'House' && 
                        <PropertyHouseForm 
                            control={bl.form.control} />
                    }
                    {selectedPropertyType === 'Apartment' && 
                        <PropertyApartmentForm  
                            control={bl.form.control} />
                    }
                    {selectedPropertyType === 'Business' && 
                        <PropertyBusinessForm 
                            control={bl.form.control} />
                    }
                    <span className="text-xs"> Your instructions help us deliver your packages to your expectations and will be used when possible. </span>
                        <div className="flex flex-row space-x-2 mt-2">
                            <CancelDialogButton onCancel={props.onCancel}/>
                            <Button className="w-full" type="submit"> Set </Button>
                        </div>
                </form>
            </Form> 
        </>
    )
}

export default DeliveryInstructionsForm;
import { gql } from "@/lib/services/gql"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import UseDeliveryInstructions from "./UseDeliveryInstructions";
import { useEffect } from "react";

export type deliveryInstructions_type = z.infer<typeof DeliveryInstructionsSchema>

const DeliveryInstructionsSchema = z.object({
    propertyType: z.enum([
        "HOUSE",
        "APARTMENT",
        "BUSINESS"
    ]),
    dropOffPackage: z.enum([
        "FRONT_DOOR", 
        "MAIL_ROOM", 
        "PROPERTY_STAFF",  
        "BUILDING_RECEPTION", 
        "LEASING_OFFICE",  
        "LOADING_DOCK", 
        "BACK_DOOR", 
        "SIDE_PORCH", 
        "OUTSIDE_GARAGE", 
        "NO_PREFERENCE"
    ]).nullable(),
    onDefaultDays: z.array(z.string()).optional().nullable(),
    onFederalHolidays: z.boolean().optional().nullable(),
    openSaturday: z.boolean().optional().nullable(),
    openSunday: z.boolean().optional().nullable(),
    haveDog: z.boolean().optional().nullable(),
    securityCode: z.string().optional().nullable(),
    callBox: z.string().optional().nullable(),
    details: z.string().optional().nullable()
})

const UseUpsertDeliveryInstructions = (userId: string, addressId: string) => {
    
    const form = useForm<z.infer<typeof DeliveryInstructionsSchema>>({
        resolver: zodResolver(DeliveryInstructionsSchema),
        defaultValues: {
            propertyType: "HOUSE",
            onDefaultDays: []
        }
    })

    const {data} = UseDeliveryInstructions(userId, addressId)

    useEffect(() => {
        if (data) {
            form.reset({
                propertyType: data.propertyType,
                dropOffPackage: data.dropOffPackage,
                onFederalHolidays: data.onFederalHolidays,
                openSaturday: data.openSaturday,
                openSunday: data.openSunday,
                haveDog: data.haveDog,
                securityCode: data.securityCode,
                callBox: data.callBox,
                details: data.details,
            })
        }
    }, [data]);
    
    
    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: deliveryInstructions_type) => {
                const resp = await gql<{
                    upsert_deliveryInstructions: {
                        deliveryInstructions: deliveryInstructions_type
                    }
                }>(
                   `mutation upsert_deliveryInstructions($customerId: ID, $addressId: ID, $deliveryInstructions: DeliveryInstructionsInput) { 
                        upsert_deliveryInstructions(customerId: $customerId, addressId: $addressId, deliveryInstructions: $deliveryInstructions) {
                            address { 
                                deliveryInstructions {
                                    propertyType
                                    dropOffPackage
                                    onDefaultDays
                                    onFederalHolidays
                                    openSaturday
                                    openSunday
                                    haveDog
                                    securityCode
                                    callBox
                                    details
                                }
                            }
                        }
                    }`,
                    {
                        customerId: userId,
                        addressId: addressId,
                        deliveryInstructions: values
                    }
                )
                return resp.upsert_deliveryInstructions
            }
        })
    }
}
  
export default UseUpsertDeliveryInstructions;
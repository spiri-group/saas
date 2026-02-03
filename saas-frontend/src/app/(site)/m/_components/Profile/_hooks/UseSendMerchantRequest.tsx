'use client';

import useFormStatus from "@/components/utils/UseFormStatus";
import { PhoneSchema } from "@/components/ux/PhoneInput";
import { countWords } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";

export const Schema = z.object({
    id: z.string().uuid(),
    request: z.string().min(1).refine(x => countWords(x) <= 500, {
        message: "Description must be less than 500 words"
    }),
    isLoggedIn: z.boolean(),
    customerDetails: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        emailVerified: z.boolean(),
        phoneNumber: PhoneSchema.optional()
    }).optional()
}).refine(x => {
    if (!x.isLoggedIn) {
        return x.customerDetails != null && x.customerDetails.emailVerified
    } else {
        return true
    }
});

export type Schema = z.infer<typeof Schema>

const UseSendMerchantRequest = (merchantId: string, user?: {id: string}) => {

    const form = useForm<Schema>({
        resolver: zodResolver(Schema),
        defaultValues: user == null ? {
            id: uuid(),
            request: "",
            isLoggedIn: false,
            customerDetails: {
                name: "",
                email: "",
                emailVerified: false,
                phoneNumber: undefined
            }
        } : {
            id: uuid(),
            request: "",
            isLoggedIn: true
        }
    })
    const status = useFormStatus()

    return {
        form,
        status,
        mutation: useMutation({
            mutationFn: async (values: Schema) => {

                const payload = {
                    merchantId,
                    request: values.request
                } as any;

                if (!values.isLoggedIn && values.customerDetails != null) {
                    payload.customerDetails = {
                        name: values.customerDetails.name,
                        email: values.customerDetails.email,
                        phone: values.customerDetails.phoneNumber == undefined ? undefined : values.customerDetails.phoneNumber.displayAs
                    }
                }

                await gql<any>(`
                    mutation sendMerchantRequest($merchantId: ID!, $request: String!, $customerDetails: MerchantRequestCustomerDetailsInput) { 
                        sendMerchantRequest(merchantId: $merchantId, request: $request, customerDetails: $customerDetails) {
                            code
                        }
                    }
                    `,
                    payload
                )
        
                return merchantId
            },
            onSuccess: async () => {
            }
        })
    }
}

export default UseSendMerchantRequest;
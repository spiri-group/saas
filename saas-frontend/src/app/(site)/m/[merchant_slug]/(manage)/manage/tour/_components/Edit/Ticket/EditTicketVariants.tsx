'use client';

import { Button } from "@/components/ui/button";
import React from "react";
import UseEditTicketVariants, { updateTicketVariants_type } from "./hooks/UseEditTicketVariants";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { escape_key } from "@/lib/functions";
import UpsertTicketVariants from "../../Create/components/UpsertTicketVariants";
import UseVendorCurrency from "@/app/(site)/m/_hooks/UseVendorCurrency";
import { Loader2 } from "lucide-react";

type EditTicketVariantsFormProps = {
    merchantId: string
    tourId: string
}

const EditTicketVariantsForm: React.FC<EditTicketVariantsFormProps> = (props) => {
    const bl = UseEditTicketVariants(props.merchantId, props.tourId);
    const vendorCurrency = UseVendorCurrency(props.merchantId);

    const merchantCurrency = vendorCurrency.data?.vendor.currency || "USD";

    const submit = async (values: updateTicketVariants_type) => {
        await bl.mutation.mutateAsync(values);
        escape_key()
    }

    if (bl.isLoading || vendorCurrency.isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading ticket variants...</span>
            </div>
        );
    }

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(submit)} className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto p-4">
                    <FormField
                        name="ticketVariants"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <UpsertTicketVariants
                                        {...field}
                                        currency={merchantCurrency}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex flex-row mt-auto space-x-3 p-4 border-t">
                    <CancelDialogButton />
                    <Button
                        type="submit"
                        className="flex-grow"
                        disabled={bl.mutation.isPending}
                    >
                        {bl.mutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Ticket Variants"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

export default EditTicketVariantsForm;

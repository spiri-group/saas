'use client'

import UseUpsertCaseOffer from "../hooks/UseUpsertCaseOffer"
import { escape_key } from "@/lib/functions"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { z } from "zod"
import RichTextInput from "@/components/ux/RichTextInput"
import CurrencyInput from "@/components/ux/CurrencyInput"
import { Button } from "@/components/ui/button"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { caseOffer_type, currency_amount_type } from "@/utils/spiriverse"
import useFormStatus from "@/components/utils/UseFormStatus"
import { Checkbox } from "@/components/ui/checkbox"
import CurrencySpan from "@/components/ux/CurrencySpan"

type BLProps = {
    merchantId: string
    caseId: string,
    caseBalance: currency_amount_type,
    type: 'APPLICATION' | 'RELEASE' | 'CLOSE'
    offer?: caseOffer_type
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {
    
    const applyCase = UseUpsertCaseOffer(props.merchantId, props.type, props.caseId, undefined)
    const status = useFormStatus();

    return {
        form: applyCase.form,
        values: applyCase.form.getValues(),
        status,
        submit: async (data: z.infer<typeof applyCase.schema>) => {
            await status.submit(applyCase.mutation.mutateAsync, data, () => {
                escape_key();
            })
        }
    }
}

const UpsertCaseOffer : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (   
        <>
            <Form {...bl.form}>
                <form className="flex flex-col flex-grow h-full space-y-3 w-[500px]" onSubmit={bl.form.handleSubmit(bl.submit)}>
                    <FormField 
                    name="description"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <RichTextInput 
                                className="w-full h-[300px]"
                                aria-label="textInput-create-offer-details"
                                maxWords={85}
                                label={props.type === "APPLICATION" ? "Application details" : `Reason for ${props.type.toLowerCase()}`}
                                description={
                                    props.type === "APPLICATION" ?
                                        "Describe why you / your team is the ideal investigator for this case."
                                        : props.type === "RELEASE" ?
                                            "We understand that sometimes things don't work out. Please describe the reason for releasing the case so that we can show the customer."
                                            : "Please describe the reason you / your team think this case is able to be closed. This will be shown to the customer."
                                }
                                {...field} 
                                placeholder="Describe your offer to the client" 
                            />
                        )
                    }} /> 
                    {["RELEASE"].includes(props.type) && (
                        <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                            <span className="text-sm">Outstanding Balance</span>
                            <CurrencySpan value={props.caseBalance} />
                        </div>
                        <FormField 
                        name="price"
                        control={bl.form.control}
                            render={({ field }) => {
                                return (
                                    <FormItem className="flex flex-row space-x-3 items-center">
                                        <FormLabel className="flex-none">Your Offer</FormLabel>
                                        <FormControl className="flex-grow">
                                            <CurrencyInput
                                                {...field}
                                                min={0}
                                                placeholder="Amount" 
                                                aria-label="input-create-offer-price"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )
                            }}
                        />
                        </div>
                    )}
                    { ["RELEASE"].includes(props.type) && (
                        <FormField
                            name="acknowledgement"
                            control={bl.form.control}
                            render={({ field }) => {
                                return (
                                    <FormItem className="flex flex-row space-x-3 items-center">
                                        <FormControl className="flex-grow">
                                            <Checkbox 
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                 />
                                        </FormControl>
                                        <FormLabel className="text-wrap">I confirm that all outstanding fees have been included, and I consent to the {props.type === "RELEASE" ? "release" : "closure"} of this case upon settlement of this offer.</FormLabel>
                                    </FormItem>
                                )
                            }} />
                    )}
                    <div className="grid grid-cols-2 space-x-2 pt-2">
                        <CancelDialogButton />
                        <Button className="ml-2" type="submit" variant={bl.status.button.variant}> 
                            { bl.status.formState == "idle" ? 
                            props.type === "APPLICATION" ? "Apply" : props.type === "RELEASE" ? "Release" : "Close"
                            : bl.status.button.title } 
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    )
}

export default UpsertCaseOffer;
'use client'

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import ChatControl from "@/components/ux/ChatControl"
import { CommunicationModeType, caseOffer_type } from "@/utils/spiriverse"
import React, { useState } from "react"
import { z } from "zod"
import RichTextInput from "@/components/ux/RichTextInput"
import CurrencyInput from "@/components/ux/CurrencyInput"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { cn } from "@/lib/utils"
import { capitalize, escape_key, isNullOrUndefined } from "@/lib/functions"
import { DialogTitle } from "@/components/ui/dialog"
import UseUpsertCaseOffer from "../hooks/UseUpsertCaseOffer"
import UseAcceptCaseOffer from "../hooks/UseAcceptCaseOffer"
import UseRejectCaseOffer from "../hooks/UseRejectCaseOffer"
import UseCancelRequestReleaseCase from "@/app/(site)/track/case/hooks/UseCancelRequestRelease"
import StripePayment from "@/app/(site)/components/StripePayment"
import useFormStatus from "@/components/utils/UseFormStatus"
import { HoverCard, HoverCardContent } from "@/components/ui/hover-card"
import { HoverCardTrigger } from "@radix-ui/react-hover-card"
import { HelpCircleIcon } from "lucide-react"

type BLProps = {
    caseOffer: caseOffer_type,
    page: 'trackCase' | 'case'
    type: 'APPLICATION' | 'RELEASE' | 'CLOSE'
}

type Props = BLProps & {
    className?: string
}

const useBL = (props: BLProps) => {

    const [mode, setMode] = useState<"view"|"update">("view")
    const [showStripe, setShowStripe] = useState<boolean>(false);

    const updateCaseOffer = UseUpsertCaseOffer(props.caseOffer.merchantId, props.type, props.caseOffer.caseId, props.caseOffer)
    const acceptCaseOffer = UseAcceptCaseOffer()
    const acceptCaseOfferStatus = useFormStatus();

    const rejectCaseOffer = UseRejectCaseOffer()
    const rejectCaseOfferStatus = useFormStatus();

    const cancelReqReleaseCase = UseCancelRequestReleaseCase()

    return {
        mode,
        setMode,
        form: updateCaseOffer.form,
        submit: async (data: z.infer<typeof updateCaseOffer.schema>) => {
            await updateCaseOffer.mutation.mutateAsync({
                ...data
            })
            setMode("view")
        },
        acceptOffer: {
            submit: async () => {
                await acceptCaseOfferStatus.submit(
                    acceptCaseOffer.mutation.mutateAsync,
                    props.caseOffer.ref,
                    () => {
                        if (props.page === "trackCase") {
                            window.location.reload()
                        } else {
                            escape_key() // close the dialog / drawer
                        }
                    }
                )
            },
            status: acceptCaseOfferStatus
        },
        rejectOffer: {
            submit: async () => {
                await rejectCaseOfferStatus.submit(
                    rejectCaseOffer.mutation.mutateAsync,
                    props.caseOffer.ref,
                    () => {
                        if (props.page === "trackCase") {
                            window.location.reload()
                        } else {
                            escape_key() // close the dialog / drawer
                        }
                    }
                )
            },
            status: rejectCaseOfferStatus
        },  
        showStripe,
        setShowStripe,
        cancelReqReleaseCase
    }

}

const ViewCaseOffer : React.FC<Props> = (props) => {
    
    const bl = useBL(props)

    const payment_required = props.caseOffer.order && props.caseOffer.order.paymentSummary.due && props.caseOffer.order.paymentSummary.due.total.amount > 0

    return (  
        <>
            <div className="flex flex-col space-y-3 w-[600px] min-h-[500px]">
                <>
                    {bl.showStripe ? (
                        <div className="flex flex-col flex-grow">
                            <h1 className="text-xl font-bold mb-2"> Enter payment information </h1>
                            <StripePayment
                                type="SETUP"
                                className="flex-grow"
                                onCancel={() => {}}
                                onAlter={() => {}}
                                amount={props.caseOffer.order.paymentSummary.due.total}
                                stripeAccountId={props.caseOffer.stripe.accountId}
                                clientSecret={props.caseOffer.stripe.setupIntentSecret}
                                return_url={window.location.origin}
                            />
                        </div>
                ) : (
                    <>
                        {bl.mode === "view" && (
                            <>
                                {props.page === "trackCase" ? (
                                    ["RELEASE", "CLOSE"].includes(props.type) ? (
                                        <div className="flex flex-row items-center">
                                            <div className="flex flex-col space-y-2">
                                            <p>
                                                {props.type === "RELEASE" ?
                                                   `${props.caseOffer.merchant?.name} has requested to release this case.`
                                                   : `${props.caseOffer.merchant?.name} has requested to close this case.`
                                                }
                                            </p>
                                            {!payment_required && (
                                                <p className="text-gray-500">No payment required</p>
                                            )}
                                            </div>
                                            <div className="ml-auto">
                                            {
                                                props.caseOffer.type === "CLOSE" && bl.acceptOffer.status.formState === "idle" && (
                                                    <Button
                                                        variant="destructive"
                                                        onClick={bl.rejectOffer.submit}
                                                        aria-label="button-reject-offerCase"
                                                    >
                                                        { bl.rejectOffer.status.formState === "idle" ? "Reject" : bl.rejectOffer.status.button.title }
                                                    </Button>
                                                )
                                            }
                                            {
                                                !isNullOrUndefined(props.caseOffer.order) ?
                                                        <>
                                                        <Button
                                                            type="button"
                                                            onClick={() => bl.setShowStripe(true)}
                                                            aria-label="button-pay-offerCase"
                                                        >
                                                            <span className="mr-1">Pay</span>
                                                            <CurrencySpan withAnimation={false} value={props.caseOffer.order.paymentSummary.due.total} />
                                                        </Button>
                                                        </>
                                                    :
                                                    <Button
                                                        type="button"
                                                        variant="success"
                                                        onClick={bl.acceptOffer.submit}
                                                        aria-label="button-accept-offerCase"
                                                        >
                                                            {bl.acceptOffer.status.formState == "idle" ? (props.caseOffer.type === "RELEASE" ? "Confirm" : "Accept") : bl.acceptOffer.status.button.title}
                                                    </Button>
                                            }
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-row items-center">
                                            <h2 className="text-xl font-bold">{props.caseOffer.merchant?.name}&apos;s Offer</h2>
                                            <div className="flex flex-row space-x-2 ml-auto">
                                                { bl.acceptOffer.status.formState === "idle" && (
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        onClick={bl.rejectOffer.submit}
                                                        aria-label="button-reject-offerCase"
                                                    >
                                                        { bl.rejectOffer.status.formState === "idle" ? "Reject" : bl.rejectOffer.status.button.title }
                                                    </Button>    
                                                )}
                                                { bl.rejectOffer.status.formState === "idle" && (
                                                    <Button
                                                        type="button"
                                                        className="bg-green-600"
                                                        onClick={bl.acceptOffer.submit}
                                                        aria-label="button-accept-offerCase"
                                                    >
                                                        { bl.acceptOffer.status.formState === "idle" ? "Accept" : bl.acceptOffer.status.button.title }
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-row items-center">
                                        <h2 className="text-xl font-bold">Your {capitalize(props.caseOffer.type)} Offer</h2>
                                        <Button
                                            type="button"
                                            variant="link"
                                            onClick={() => bl.setMode("update")}
                                            aria-label="button-update-offerCase"
                                        >
                                            Update
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="p-2 md:grid grid-cols-2 gap-3 flex-grow h-0">
                            {bl.mode === "view" && (
                                <>
                                    {props.caseOffer.merchantResponded == false ? (
                                        <div className="flex flex-col space-y-2">
                                            <DialogTitle>Request has been successfully submitted.</DialogTitle>
                                            <span>We are currently awaiting processing from the merchant. Thank you for your patience.</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="hidden md:flex flex-col min-h-0 space-y-2">
                                                <div className="flex flex-row justify-between" aria-label="case-offer-code">
                                                    <span className="text-sm text-slate-600">Offer {props.caseOffer.code}</span>
                                                    {props.caseOffer.order && props.caseOffer.order.paymentSummary.due && (
                                                        <HoverCard>
                                                            <HoverCardTrigger className="flex flex-row space-x-1 items-center">
                                                                <CurrencySpan value={props.caseOffer.order.paymentSummary.due.total} />
                                                                <HelpCircleIcon className="w-5 h-5 text-slate-600" />
                                                            </HoverCardTrigger>
                                                            <HoverCardContent>
                                                            <div className="flex flex-row space-x-2">
                                                                <span>Subtotal:</span><CurrencySpan value={props.caseOffer.order.paymentSummary.due.subtotal} />
                                                            </div>
                                                            <div className="flex flex-row space-x-2">
                                                                <span>Fees:</span><CurrencySpan value={props.caseOffer.order.paymentSummary.due.fees} />
                                                            </div>
                                                            <div className="flex flex-row space-x-2">
                                                                <span>Total:</span><CurrencySpan value={props.caseOffer.order.paymentSummary.due.total} />
                                                            </div>
                                                            </HoverCardContent>
                                                        </HoverCard>
                                                    )}
                                                </div>
                                                <div className="leading-6 p-3 bg-slate-50 text-sm flex-grow rounded-md overflow-y-auto">
                                                    <p className="prose" dangerouslySetInnerHTML={{ __html: props.caseOffer.description }} />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                            {bl.mode == "update" && (
                                <Form {...bl.form}>
                                    <form className="flex flex-col flex-grow h-full space-y-2" onSubmit={bl.form.handleSubmit(bl.submit)}>
                                        <div className="grid grid-cols-2 space-x-2">
                                            <Button type="button" variant="destructive" onClick={() => {
                                                bl.form.reset()
                                                bl.setMode("view")
                                            }}> Cancel </Button> 
                                            <Button aria-label="button-confirm-update-offerCase" type="submit"className="bg-green-600">Confirm</Button> 
                                        </div>
                                        <FormField 
                                            name="description"
                                            control={bl.form.control}
                                            render={({field}) => {
                                                return (
                                                    <RichTextInput
                                                        {...field} 
                                                        value={field.value} 
                                                        label="Details"
                                                        className={cn(["RELEASE", "CLOSE"].includes(props.type) ? "h-[250px]" : "h-[300px]")}
                                                        maxWords={85}
                                                        aria-label="richTextInput-update-offer-details"
                                                    />
                                                )
                                            }} /> 
                                            {["RELEASE", "CLOSE"].includes(props.type) && (
                                                <FormField 
                                                name="price"
                                                control={bl.form.control}
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem className="flex flex-col">
                                                                <div className="flex flex-row space-x-3 items-center">
                                                                    <FormLabel className="flex-none">Your price</FormLabel>
                                                                    <FormControl className="flex-grow">
                                                                        <CurrencyInput
                                                                            {...field}
                                                                            value={field.value}
                                                                            placeholder="Amount" 
                                                                            aria-label="input-update-offer-price"
                                                                        />
                                                                    </FormControl>
                                                                </div>
                                                                <FormDescription>Please include all outstanding charge amounts in this price.</FormDescription>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            )}
                                    </form>
                                </Form>
                            )}
                            <ChatControl
                                    className="hidden md:flex"
                                    allowResponseCodes={false}
                                    vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                                    forObject={props.caseOffer.ref}
                                    merchantId={props.page == 'trackCase' ? undefined : props.caseOffer.merchantId}
                                    withDiscussion={false}
                                    defaultMode={CommunicationModeType.PLATFORM} 
                                    withAttachments={true}                           
                                />
                        </div>
                        {props.caseOffer.type === "RELEASE" && 
                        <p className="p-3 bg-slate-50 rounded-xl text-sm">After this offer has been paid its case will go back into the available help requests and be open for applications from new investigators.</p>}
                        {props.caseOffer.clientRequested && !props.caseOffer.merchantResponded && (
                            <Button variant="destructive"> Cancel request </Button>
                        )}
                    </>
                )}
                </>
            </div>
        </>
    )
}

export default ViewCaseOffer;
'use client';

import { Button, buttonSize } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useEffect, useState } from "react";
import UseVendorInformation from "../../Nametag/hooks/UseVendorInformation";
import { Textarea } from "@/components/ui/textarea";
import UseSendMerchantRequest, { Schema } from "../_hooks/UseSendMerchantRequest";
import { isNullOrWhitespace } from "@/lib/functions";
import { Input } from "@/components/ui/input";
import { generateAndSendOTP, verifyOTP } from "@/lib/services/otp";
import useFormStatus from "@/components/utils/UseFormStatus";
import { MailIcon, PhoneIcon } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ux/PhoneInput";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";

type BLProps = {
    merchantId: string,
    user?: { id: string }
}

type Props = BLProps & {
}

const useBL = ({merchantId, user}: BLProps) => {

    const [showDialog, setShowDialog] = useState(false)
    const toggleDialog = () => setShowDialog(!showDialog)

    const merchantInformation = UseVendorInformation(merchantId)
    const {form, status, mutation} = UseSendMerchantRequest(merchantId, user)

    const sendEmailOTPStatus = useFormStatus();
    const verifyEmailStatus = useFormStatus();
    const values = form.getValues()

    const [enteredEmailOTP, setEnteredEmailOTP] = useState<string | null>(null);
    // when they type 6 digits, we will verify the OTP
    useEffect(() => {
        if (enteredEmailOTP != null && enteredEmailOTP.length === 6 && values.customerDetails != null) {
            verifyEmailStatus.submit(
                verifyOTP,
                {
                    email: values.customerDetails.email,
                    otp: enteredEmailOTP
                },
                (result) => {
                    form.setValue("customerDetails.emailVerified", result, { shouldDirty: true })
                }
            )
        }
    }, [enteredEmailOTP])

    const reset = () => {
        form.reset()
        status.reset()
        sendEmailOTPStatus.reset()
        verifyEmailStatus.reset()
    }

    return {
        form,
        values,
        status,
        dialog: {
            show: showDialog,
            toggle: toggleDialog
        },
        isReady: merchantInformation.isSuccess,
        data: {
            merchant: merchantInformation.data
        },
        verify: {
            email: {
                status: verifyEmailStatus.formState,
                sentStatus: sendEmailOTPStatus.formState,
                send: async () => {
                    if (values.customerDetails == null) return;

                    await sendEmailOTPStatus.submit(
                        generateAndSendOTP,
                        {
                            to: values.customerDetails.email,
                            strategy: "email"
                        },
                        () => {}
                    )
                },
                enteredOTP: enteredEmailOTP,
                setEnteredOTP: setEnteredEmailOTP
            },
        },
        save: async (values: Schema) => {
            await status.submit(
                mutation.mutateAsync, 
                values,
                () => {
                    reset()
                    toggleDialog()
                }
            )
        }
    }

}

const MerchantRequestForm : React.FC<Props> = ({...props}) => {
    const bl = useBL(props)

    if (bl.isReady == false) {
        return null
    }

    return (
        <div className="flex flex-row space-x-3 flex-grow">
            <Button
                className="flex-grow text-white bg-black hover:bg-slate-800 flex flex-row space-x-1 border border-slate-600 shadow-sm"
                variant={"default"}
                type="button"
                >
                    <SpiriAssistLogo height={16} />
                    <span>SpiriAssist</span>
            </Button>
            { !isNullOrWhitespace(bl.data.merchant?.contact.public.email) &&
                <div className="flex-grow">
                    <Dialog
                        open={bl.dialog.show}
                        >
                        <DialogTrigger asChild>
                            <Button
                                type="button"
                                className="w-full bg-merchant-primary text-merchant-primary-foreground hover:bg-merchant-primary/90"
                                onClick={bl.dialog.toggle}>
                                Enquire
                            </Button>
                        </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Make your request</DialogTitle>
                            <DialogDescription>
                                {bl.data.merchant?.name} is looking forward to hear from you.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...bl.form}>
                            <form onSubmit={bl.form.handleSubmit(bl.save)} className="w-[600px]">
                                <div className="flex flex-row space-x-2">
                                    {bl.values.isLoggedIn == false && 
                                        <div className="flex flex-col space-y-4">
                                            <FormField
                                                name="customerDetails.name"
                                                render={({field}) => (
                                                <FormItem>
                                                    <FormLabel>Your Name</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                                )} />
                                            <FormField
                                                name="customerDetails.email"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex flex-row justify-between items-center space-x-2">
                                                            <FormLabel className="flex flex-row items-center space-x-2">
                                                                <MailIcon className="text-slate-500" />
                                                                <span>Email</span>
                                                            </FormLabel>
                                                            {
                                                                bl.values.customerDetails != null
                                                                && bl.values.customerDetails.emailVerified ?
                                                                    <span className={cn(buttonSize.default, "text-success")}>Verified</span>
                                                                    :
                                                                    bl.verify.email.sentStatus == "success" ?
                                                                        bl.verify.email.status === 'idle' ?
                                                                        <InputOTP 
                                                                            maxLength={6}
                                                                            onChange={(value) => bl.verify.email.setEnteredOTP(value)}>
                                                                            <InputOTPGroup>
                                                                                <InputOTPSlot index={0} />
                                                                                <InputOTPSlot index={1} />
                                                                                <InputOTPSlot index={2} />
                                                                                <InputOTPSlot index={3} />
                                                                                <InputOTPSlot index={4} />
                                                                                <InputOTPSlot index={5} />
                                                                            </InputOTPGroup>
                                                                        </InputOTP>
                                                                            : <span className={cn(buttonSize.default)}>Processing</span>
                                                                        : <Button 
                                                                                type="button"
                                                                                onClick={bl.verify.email.send}
                                                                                disabled={bl.values.customerDetails == null || isNullOrWhitespace(bl.values.customerDetails.email)} 
                                                                                variant="link">
                                                                                    { bl.verify.email.sentStatus === 'idle' ? "Verify" : "Sending Code" }
                                                                            </Button>
                                                            }
                                                        </div>
                                                        <Input {...field} />
                                                    </FormItem>
                                                )} />
                                            <FormField
                                                name="customerDetails.phoneNumber"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-4 mb-2">
                                                        <FormLabel className="flex flex-row items-center justify-between">
                                                            <div className="flex flex-row items-center space-x-2">
                                                                <PhoneIcon className="text-slate-500" />
                                                                <span>Phone number</span>
                                                            </div>
                                                            <span className="text-xs text-slate-500">Optional</span>
                                                        </FormLabel>
                                                        <PhoneInput 
                                                            {...field}
                                                            value={field.value || { displayAs: "", value: "", raw: "" }}
                                                            defaultCountry="AU"
                                                            />
                                                    </FormItem>
                                                )} />
                                        </div> 
                                    }
                                    <FormField  
                                        name="request"
                                        render={({field}) => (
                                        <FormItem className="flex-grow">
                                            <FormLabel>Details</FormLabel>
                                            <FormControl>
                                                <Textarea style={{ resize: "none" }} className="h-[250px] overflow-y-auto w-full bg-white border-input" {...field} />
                                            </FormControl>
                                        </FormItem>    
                                        )} />
                                </div>
                                <DialogFooter className="mt-4 w-full grid grid-cols-2 grid-rows-3 gap-3">
                                    <p className="mt-4 p-4 rounded-lg bg-info text-slate-800 text-sm col-span-2 row-span-2">
                                        As a part of this process we will share your email address and if available, your phone number with {bl.data.merchant?.name}. This will be sent as an email and you will be placed on the cc address.
                                    </p>
                                    <Button 
                                        type="button" 
                                        variant={"destructive"}
                                        onClick={bl.dialog.toggle}>
                                            Cancel
                                    </Button>
                                    <Button 
                                        type="submit"
                                        className="flex-grow"
                                        variant={bl.status.button.variant}>
                                            {bl.status.formState == "idle" ? "Confirm and Send" : bl.status.button.title }</Button>
                                </DialogFooter>
                            </form> 
                        </Form>
                    </DialogContent>
                    </Dialog>
                </div>
            }
        </div>
    )
}

export default MerchantRequestForm
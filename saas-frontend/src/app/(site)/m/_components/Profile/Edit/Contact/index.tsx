'use client';

import { DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import PhoneInput from "@/components/ux/PhoneInput";
import { Input } from "@/components/ui/input";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Button, buttonSize } from "@/components/ui/button";
import UseEditVendorContactDetails, { UpdateVendorFormSchema } from "./_hooks/UseEditVendorContactDetails";
import { escape_key, isNullOrWhitespace } from "@/lib/functions";
import useFormStatus from "@/components/utils/UseFormStatus";
import { generateAndSendOTP, verifyOTP } from "@/lib/services/otp";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CircleAlert, MailIcon, PhoneIcon, Smartphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type BLProps = {
    merchantId: string
}

const useBL = (props: BLProps) => {
    
    const formStatus = useFormStatus();
    const editVendor = UseEditVendorContactDetails(props.merchantId)

    const sendEmailOTPStatus = useFormStatus();
    const sendPhoneNumberOTPStatus = useFormStatus();
    const verifyEmailStatus = useFormStatus();
    const verifyPhoneNumberStatus = useFormStatus();

    const [enteredEmailOTP, setEnteredEmailOTP] = useState<string | null>(null);
    // when they type 6 digits, we will verify the OTP
    useEffect(() => {
        if (enteredEmailOTP != null && enteredEmailOTP.length === 6) {
            verifyEmailStatus.submit(
                verifyOTP,
                {
                    email: editVendor.form.getValues().contact.internal.email,
                    otp: enteredEmailOTP
                },
                (result) => {
                    editVendor.form.setValue("contact.internal.emailVerified", result, { shouldDirty: true })
                }
            )
        }
    }, [enteredEmailOTP])

    const [enteredPhoneNumberOTP, setEnteredPhoneNumberOTP] = useState<string | null>(null);
    // when they type 6 digits, we will verify the OTP
    useEffect(() => {
        if (enteredPhoneNumberOTP != null && enteredPhoneNumberOTP.length === 6) {
            const pn = editVendor.form.getValues().contact.internal.phoneNumber
            if (pn == null) return;

            verifyPhoneNumberStatus.submit(
                () => true, // verifyOTP,
                {
                    phone: pn.value,
                    otp: enteredPhoneNumberOTP
                },
                (result) => {
                    editVendor.form.setValue("contact.internal.phoneNumberVerified", result, { shouldDirty: true })
                }
            )
        }
    }, [enteredPhoneNumberOTP])

    return {
        formStatus,
        verify: {
            email: {
                status: verifyEmailStatus.formState,
                sentStatus: sendEmailOTPStatus.formState,
                send: async () => {
                    await sendEmailOTPStatus.submit(
                        generateAndSendOTP,
                        {
                            to: editVendor.form.getValues().contact.internal.email,
                            strategy: "email"
                        },
                        () => {}
                    )
                },
                enteredOTP: enteredEmailOTP,
                setEnteredOTP: setEnteredEmailOTP
            },
            phoneNumber: {
                status: verifyPhoneNumberStatus.formState,
                sentStatus: sendPhoneNumberOTPStatus.formState,
                send: async () => {
                    const phoneNumber = editVendor.form.getValues().contact.internal.phoneNumber
                    if (phoneNumber == null) return;

                    await sendPhoneNumberOTPStatus.submit(
                        () => true ,//generateAndSendOTP,
                        {
                            to: phoneNumber.value,
                            strategy: "phone"
                        }
                    , () => {})
                },
                enteredOTP: enteredPhoneNumberOTP,
                setEnteredOTP: setEnteredPhoneNumberOTP
            }
        },
        form: editVendor.form,
        values: editVendor.form.getValues(),
        isLoading: editVendor.isLoading,
        submit: async (values: UpdateVendorFormSchema) => 
            formStatus.submit(
                editVendor.mutation.mutateAsync, 
                values,
                escape_key
            )
    }
}

type Props = BLProps & {

}

// this component will allow the merchant to edit their contact information
// this includes their phone number, email, website
const MerchantContactComponent : React.FC<Props> = (props) => {
    const bl = useBL(props);

    if (bl.isLoading) return <></>

    return (
        <DialogContent className="min-w-[300px] min-h-[460px]">
            <DialogHeader>
                <h1>Contact Information</h1>
            </DialogHeader>
            { bl.values.contact != null && (
            <Form {...bl.form}>
                <form 
                    className="flex flex-col space-y-3"
                    onSubmit={bl.form.handleSubmit(bl.submit)}>
                    <FormField
                        control={bl.form.control}
                        name={"website"}
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Public Website <span className="text-slate-400">(Optional)</span></FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                            </FormItem>
                        )} />
                    <div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col">
                        <h2 className="mb-2">Public communications</h2>
                        <p className="bg-info text-info-foreground p-3 h-20 rounded-xl mb-4">This information will be shown to your customers.</p>
                        <FormField
                            disabled={bl.isLoading}
                            name="contact.public.email"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="space-y-4 mb-4">
                                    <FormLabel className="flex flex-row items-center space-x-2">
                                        <MailIcon className="text-slate-500" />
                                        <span>Email</span>
                                    </FormLabel>
                                    <Input 
                                        {...field} />
                                </FormItem>
                            )} />
                        <FormField
                            disabled={bl.isLoading}
                            name="contact.public.phoneNumber"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="space-y-4 mb-2">
                                    <FormLabel className="flex flex-row items-center space-x-2">
                                        <PhoneIcon className="text-slate-500" />
                                        <span>Phone number</span>
                                    </FormLabel>
                                    <PhoneInput
                                        {...field}
                                        name="contact.public.phoneNumber"
                                        defaultCountry="AU"
                                        />
                                </FormItem>
                            )} />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <h2>Internal Communications</h2>
                            <p className="bg-info text-info-foreground p-3 h-20 rounded-xl">This will be used by SpiriVerse to communicate with you.</p>
                            <FormField
                                disabled={bl.isLoading}
                                name="contact.internal.email"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex flex-row justify-between items-center">
                                            <FormLabel className="flex flex-row items-center space-x-2">
                                                <MailIcon className="text-slate-500" />
                                                <span>Email</span>
                                            </FormLabel>
                                            {
                                                bl.values.contact != null
                                                && bl.values.contact.internal != null
                                                && bl.values.contact.internal.emailVerified ?
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
                                                                disabled={bl.values.contact.internal == null || isNullOrWhitespace(bl.values.contact.internal.email)} 
                                                                variant="link">
                                                                    { bl.verify.email.sentStatus === 'idle' ? "Verify" : "Sending Code" }
                                                            </Button>
                                            }
                                        </div>
                                        <Input {...field} />
                                    </FormItem>
                                )} />
                            <FormField
                                disabled={bl.isLoading}
                                name="contact.internal.phoneNumber"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex flex-row justify-between items-center">
                                            <FormLabel className="flex flex-row items-center space-x-2">
                                                {bl.form.formState.errors.contact?.internal?.phoneNumber != null ?
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <CircleAlert className="text-error" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {bl.form.formState.errors.contact.internal.phoneNumber.message}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider> : <Smartphone className="text-slate-500" /> }
                                                <span>Mobile Phone</span>
                                            </FormLabel>
                                            {
                                                bl.values.contact != null
                                                && bl.values.contact.internal != null
                                                && bl.values.contact.internal.phoneNumberVerified ?
                                                    <span className={cn(buttonSize.default, "text-success")}>Verified</span>
                                                    :
                                                    bl.verify.phoneNumber.sentStatus == "success" ?
                                                        bl.verify.phoneNumber.status === 'idle' ?
                                                            <InputOTP 
                                                                maxLength={6}
                                                                onChange={(value) => bl.verify.phoneNumber.setEnteredOTP(value)}>
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
                                                                onClick={bl.verify.phoneNumber.send}
                                                                disabled={
                                                                    bl.values.contact.internal == null 
                                                                    || bl.values.contact.internal.phoneNumber == null
                                                                    || bl.form.formState.errors.contact?.internal?.phoneNumber != null
                                                                    || isNullOrWhitespace(bl.values.contact.internal.phoneNumber.value)} 
                                                                variant="link">
                                                                    { bl.verify.phoneNumber.sentStatus === 'idle' ? "Verify" : "Sending Code" }
                                                            </Button>
                                            }
                                        </div>
                                        <PhoneInput
                                            {...field}
                                            name="contact.internal.phoneNumber"
                                            expectedType="MOBILE"
                                            defaultCountry="AU"
                                            onError={(error) => {
                                                bl.form.setError("contact.internal.phoneNumber", { message: error })
                                            }}
                                            clearErrors={() => {
                                                bl.form.clearErrors("contact.internal.phoneNumber")
                                            }}
                                            />
                                    </FormItem>
                                )} />
                        </div>
                    </div>
                    <DialogFooter className="col-span-2 flex flex-col md:flex-row space-y-2 md:space-y-0">
                        <CancelDialogButton />
                        <Button
                            disabled={
                                bl.form.formState.isSubmitting || !bl.form.formState.isDirty}  
                            variant={bl.formStatus.button.variant}
                            className="flex-grow">{
                                bl.formStatus.formState === 'idle' ? "Confirm changes" : bl.formStatus.button.title
                            }</Button>
                    </DialogFooter>
                </form>
            </Form>
            )}
        </DialogContent>
    )
}

export default MerchantContactComponent
'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { case_type, recordref_type, stripe_details_type, user_type } from "@/utils/spiriverse";
import { Input } from "@/components/ui/input";
import RichTextInput from "@/components/ux/RichTextInput";
import AddressInput from "@/components/ux/AddressInput";
import UseCaseCategory from "./hooks/UseCaseCategory";
import AreaAffectedForm from "./components/AreaAffectedForm";
import PeopleAffectedForm from "./components/PersonAffectedForm";
import UseCaseUnit from "./hooks/UseCaseUnit";
import React, { useEffect, useState } from "react";
import StripePayment from "../StripePayment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import UseUpsertCase from "./hooks/UseUpsertCase";
import ComboBox from "@/components/ux/ComboBox";
import { gql } from "@/lib/services/gql";
import CaseCreateDialog from "./components/CaseCreateDialog";
import CaseReleaseDialog from "./components/CaseReleaseDialog";
import CaseCloseDialog from "./components/CaseCloseDialog";
import { SignalRProvider } from "@/components/utils/SignalRProvider";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import UseReligiousOptions from "@/shared/hooks/UseReligiousOptions";
import PhoneInput from "@/components/ux/PhoneInput";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";
import UseContactMe from "../SignedIn/_hooks/UseContactMe";
import { isNullOrUndefined } from "@/lib/functions";
import UseCaseUrgencyFeeOptions from "./hooks/UseCaseUrgencyFeeOptions";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { cn } from "@/lib/utils";

type BLProps = {
    me?: user_type
    caseDetails?: case_type
    setSelectedStripeDetails?: (stripe: stripe_details_type) => void
}

type Props = BLProps & {
    
}

const useBL = (props) => {

    const caseUrgencyFeeOptions = UseCaseUrgencyFeeOptions("AUD")
    const { form, page, moveBack, submit, selectedStripeDetails, mutationStatus } = UseUpsertCase(caseUrgencyFeeOptions.data, props.caseDetails, props.me)
    const caseCategoriesQuery = UseCaseCategory()
    const unitQuery = UseCaseUnit()
    const religionQuery = UseReligiousOptions()

    const search_case = async (tracking_code: string) => {
        const resp = await gql<{
            case: {
                id: string
                trackingCode: string
                ref: recordref_type
            }
        }>(
            `query get_case_by_code($trackingCode: ID) {
                case(trackingCode: $trackingCode) {
                    id
                    trackingCode
                    ref {
                        id
                        partition
                        container
                    }
                }
            }`, 
        { 
            trackingCode: tracking_code 
        })

        if (resp.case == null) return undefined;

        return resp.case.ref
    }

    return {
        form, submit, page, moveBack,
        selectedStripeDetails,
        status: mutationStatus,
        values: form.getValues(),
        categoryOptions: caseCategoriesQuery.data == null ? [] : caseCategoriesQuery.data.map((o) => ({ id: o.id, value: o.defaultLabel })),
        unitOptions: unitQuery.data == null ? [] : unitQuery.data.map((o) => ({ id: o.id, value: o.defaultLabel })),
        religionOptions: religionQuery.data == null ? [] : religionQuery.data.map((o) => ({ id: o.id, value: o.defaultLabel })),
        caseUrgencyFeeOptions: caseUrgencyFeeOptions.data == null ? [] : caseUrgencyFeeOptions.data,
        search_case
    }
    
}

export const HelpRequestFormUI : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const mode = props.caseDetails != null ? "update" : "create"

    const contact_name = bl.values.contact.name.split(" ")[0]

    bl.form.watch("selectedUrgencyFee")

    return (
        <Form {...bl.form}>
            <DialogHeader>
            {mode === 'create' ? (
                <DialogTitle> Create a new help request </DialogTitle>
            ) : (
                <DialogTitle> Edit help request </DialogTitle>
            )}
            </DialogHeader>
            <form onSubmit={bl.form.handleSubmit(bl.submit.onValid, bl.submit.onError)} className="flex flex-col flex-grow text-xs md:text-base">   
                {   bl.page === 0 &&
                (
                    <div className="flex flex-col md:grid grid-cols-2 space-x-2 p-2 flex-grow">
                        <div className="flex flex-col mb-4">
                            <span className="mb-2">Welcome to SpiriAssist</span>
                            <p className="prose leading-6 px-2">
                                We are here to help connect you with a spiritual Detective.
                            </p>
                            <p className="prose leading-6 px-2 mt-2">
                                Fill in the information requested to create a case with our service.
                            </p>
                            <p className="prose leading-6 px-2 mt-2">
                                Your only steps away from getting help
                            </p>
                        </div>
                        {   bl.categoryOptions.length > 0 &&
                            bl.religionOptions.length > 0 && (
                            <div className="flex flex-col">
                                <div className="space-y-2 mb-3">
                                    <span className="text-sm font-medium">Contact details</span>
                                    <FormField 
                                    name="contact.email"
                                    control={bl.form.control}
                                    render={({field}) => {
                                        return (
                                            <FormItem>
                                                <FormControl>
                                                    <Input 
                                                        {...field} 
                                                        disabled={!isNullOrUndefined(props.caseDetails)}
                                                        aria-label={"input-case-contact-email"} 
                                                        value={field.value ?? ""} 
                                                        placeholder="Email"/>
                                                </FormControl>
                                            </FormItem>
                                        )
                                    }} />
                                    <FormField 
                                    name="contact.name"
                                    control={bl.form.control}
                                    render={({field}) => {
                                        return (
                                            <FormItem>
                                                <FormControl>
                                                    <Input {...field} aria-label={"input-case-contact-name"} value={field.value ?? ""} placeholder="Name"/>
                                                </FormControl>
                                            </FormItem>
                                        )
                                    }} />
                                    <FormField 
                                    name="contact.phoneNumber"
                                    control={bl.form.control}
                                    render={({field}) => {
                                        return (
                                            <FormItem>
                                                <FormControl>
                                                    <PhoneInput {...field} 
                                                        defaultCountry="AU"
                                                        placeHolder="Phone Number"
                                                        aria-label={"input-case-contact-phoneNumber"} 
                                                        value={field.value} 
                                                        />
                                                </FormControl>
                                            </FormItem>
                                        )
                                    }} />
                                </div>
                                <div className="space-y-2">
                                    <FormField
                                        name="category"
                                        control={bl.form.control}
                                        render={({field}) => {
                                            return (
                                                <FormItem>
                                                    <FormLabel> What&apos;s happening? </FormLabel>
                                                    <FormControl>
                                                        <ComboBox
                                                            {...field}
                                                            aria-label={"combobox-case-category"}
                                                            items={bl.categoryOptions}
                                                            fieldMapping={{
                                                                keyColumn: "id",
                                                                labelColumn: "value"
                                                            }}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )
                                        }} />
                                    <FormField
                                            name="religion"
                                            control={bl.form.control}
                                            render={({field}) => {
                                                return (
                                                    <FormItem>
                                                        <FormControl>
                                                            <ComboBox
                                                                {...field}
                                                                withSearch={true}
                                                                aria-label={"combobox-case-religion"}
                                                                items={bl.religionOptions}
                                                                objectName="Religion"
                                                                fieldMapping={{
                                                                    keyColumn: "id",
                                                                    labelColumn: "value"
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )
                                            }} />
                                </div>
                            </div>
                         )}
                    </div>
                )}
                {   bl.page === 1 && (
                    <div className="flex flex-col flex-grow">
                        <p className="text-sm mb-3">Thanks {contact_name}, to get started please fill the fields below. More is better</p>
                        <div className="flex flex-row space-x-2">
                            <FormField 
                            name="location"
                                control={bl.form.control}
                                render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <AddressInput aria-label={"input-case-location"} {...field} value={field.value} placeholder="Physical Address" />
                                    </FormControl>
                                </FormItem>
                            )} />         
                            <FormField 
                            name="startedFrom.amount"
                            control={bl.form.control}
                            render={({field}) => {
                                return (
                                    <FormItem>
                                        <FormControl>
                                            <Input {...field} aria-label={"input-startedFrom-amount"} value={field.value ?? ""} placeholder="How long has it been happening?"/>
                                        </FormControl>
                                    </FormItem>
                                )
                            }} />
                            <FormField 
                                name="startedFrom.unit"
                                control={bl.form.control}
                                render={({field}) => {
                                    return (
                                        <FormItem>
                                            <FormControl>
                                                <ComboBox
                                                    {...field}
                                                    withSearch={true}
                                                    objectName="Unit"
                                                    fieldMapping={{
                                                        keyColumn: "id",
                                                        labelColumn: "value"
                                                    }}
                                                    aria-label={"combobox-case-unit"}
                                                    items={bl.unitOptions}  
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )
                            }} />
                        </div>
                        <FormField 
                            name="description"
                            control={bl.form.control}
                            render={({field}) => {
                                return (
                                    <RichTextInput 
                                        {...field}
                                        className="h-[350px] max-w-full mt-3"
                                        maxWords={1000}
                                        label={"Explain your situation"}
                                        aria-label={"textInput-case-description"}
                                        value={field.value ?? ""} 
                                        placeholder="Your description here"/>
                                )
                            }} />
                    </div>
                )}
                {   bl.page === 2 && ( 
                    <>
                        <div className="hidden md:flex flex-col flex-grow">
                            <p className="mb-3">Perfect, {contact_name}! Now let&apos;s get into the particulars. We need you to confirm <span className="font-bold">at least one</span> affected person.</p>
                            <FormField
                                name="affectedPeople"
                                render={({ field }) => {
                                    return (
                                        <FormItem>
                                            <FormControl>
                                                <PeopleAffectedForm {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )
                                }} />
                        </div>
                    </>           
                )}
                {   bl.page === 3 && (
                    <div className="hidden md:flex flex-col flex-grow">
                        <p className="mb-3">Great, {contact_name}! Now, lastly, confirm <span className="font-bold">at least one</span> affected area. An area could be anything like a kitchen, living room, or garden shed.</p>
                        <FormField
                            name="affectedAreas"
                            render={({ field }) => {
                                return (
                                    <FormItem>
                                        <FormControl>
                                            <AreaAffectedForm {...field} />
                                        </FormControl>
                                    </FormItem>
                                )
                            }} />
                    </div>
                )}
                {   bl.page === 4 && (
                    <div className="flex-col flex-grow">
                        <p className="mb-3">With that all out of the way, lets finalise your payment. Please specify the urgency if required.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                name="selectedUrgencyFee"
                                control={bl.form.control}
                                render={({field}) => {
                                    return (
                                        <FormItem className="w-full">
                                                {bl.caseUrgencyFeeOptions.map((o, ix) => {
                                                    return (
                                                        <FormControl key={o.id}>
                                                            <div className={cn(!isNullOrUndefined(field.value) && o.defaultVariant!.id === field.value.id ? "bg-primary bg-opacity-60" : "bg-white", "p-2 rounded-md cursor-pointer flex justify-between items-center")}
                                                                onClick={() => field.onChange({
                                                                    ...o.defaultVariant,
                                                                    name: o.name
                                                                })}>
                                                                <span className="text-sm font-medium">{o.name}</span>
                                                                <CurrencySpan 
                                                                    delay={(ix + 1) * 250}
                                                                    value={o.defaultVariant!.defaultPrice} />
                                                            </div>
                                                        </FormControl>
                                                    )
                                                })}
                                        </FormItem>
                                    )
                                }} />
                            <div className="flex flex-col space-y-2">
                                <div className="flex flex-row justify-between">
                                    <span>Creating a case</span>
                                    <span>Checkout</span>
                                </div>
                                <div className="h-0.5 w-full bg-primary" />
                                <div className="p-2">
                                <div className="flex flex-row justify-between">
                                    <span>Listing Fee:</span>
                                    <CurrencySpan 
                                    withAnimation={false}
                                    value={{
                                        amount: 500,
                                        currency: "AUD"
                                    }} />
                                </div>
                                <div className="flex flex-row justify-between">
                                    <span>Urgency Fee:</span>
                                    { bl.values.selectedUrgencyFee != undefined ?
                                        <CurrencySpan value={bl.values.selectedUrgencyFee.defaultPrice} /> : <></>
                                    }
                                </div>
                                </div>
                                <div className="h-0.5 w-full bg-primary" />
                                <div className="w-full flex justify-between px-2">
                                    <span>Total: </span>
                                    <CurrencySpan value={{
                                    amount: 500 + (bl.values.selectedUrgencyFee == undefined ? 0 : bl.values.selectedUrgencyFee.defaultPrice.amount),
                                    currency: "AUD"
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>    
                )}
                {   bl.page === 5 &&
                    <>
                        {bl.selectedStripeDetails != null && (
                            <div className="flex flex-col">
                                <StripePayment
                                    type="SETUP"
                                    onCancel={() => {}}
                                    onAlter={() => {}}
                                    stripeAccountId={bl.selectedStripeDetails.accountId}
                                    clientSecret={bl.selectedStripeDetails.setupIntentSecret}
                                />
                            </div>
                        )}
                    </>
                }
                {   bl.page !== 5 && (
                    <>
                        <div className="flex flex-row justify-between mt-2 text-xs md:mt-4 text-base">
                            <CancelDialogButton />
                            <div className="flex flex-row space-x-2">
                                {bl.page > 0 && (
                                    <Button onClick={bl.moveBack} aria-label="button-back">Back</Button>
                                )}
                                {bl.page < 4 && (mode === 'create' || bl.page === 0) ? (
                                    <Button type="submit" aria-label="button-next">
                                        Next
                                    </Button>
                                ) : (
                                    <Button 
                                        variant={bl.status.button.variant}
                                        disabled={bl.status.formState === "processing"} 
                                        type="submit" aria-label={`button-${mode === 'create' ? 'create' : 'update'}-case`}>
                                        {bl.status.formState === "idle" ? 
                                            (mode === 'create' ? 'Continue - payment' : 'Update') :
                                            bl.status.button.title
                                        }
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </form>
        </Form>
    )
}

type HelpRequestButtonProps = {
    caseDetails?: case_type
}

export const CreateHelpRequestButton : React.FC = () => {
    const params = useSearchParams();
    const pathName = usePathname();
    const router = useRouter();
    const [showDialog, setShowDialog] = useState(false);
    const [showReleaseDialog, setShowReleaseDialog] = useState(false);
    const [showCloseDialog, setShowCloseDialog] = useState(false);

    const meQuery = UseContactMe();

    const close_success_dialog = () => {
        if (params != null) {
            router.replace(`${pathName}`)
            setShowDialog(false)
            setShowReleaseDialog(false)
            setShowCloseDialog(false)
        }
    }

    useEffect(() => {
        const process = async() => {
            if (params != null) {
                if (params.has("redirect_status")) {
                    if (params.get("redirect_status") == "succeeded") {
                        // need to work out whether its a release or close success
                        const setupIntentId = params.get("setup_intent")
                
                        const resp = await gql<{
                            setUpIntentTarget: {
                                forObject: {
                                    id: string
                                },
                                target: string
                            }
                        }>( `query setup_intent_for($stripeSetupIntentId: String!) {
                                setUpIntentTarget(id: $stripeSetupIntentId) {
                                    forObject {
                                        id
                                    }
                                    target
                                }
                            }`,
                            {
                                stripeSetupIntentId : setupIntentId
                            }
                        )

                        if (resp.setUpIntentTarget.target == "CASE-OFFER-RELEASE") {
                            router.replace(`${pathName}?release_case_status=suceeded&case_tracking_code=${resp.setUpIntentTarget.forObject.id}`)
                        } else if (resp.setUpIntentTarget.target == "CASE-OFFER-CLOSE") {
                            router.replace(`${pathName}?close_case_status=suceeded&case_tracking_code=${resp.setUpIntentTarget.forObject.id}`)
                        } else if (resp.setUpIntentTarget.target  == "CASE-CREATE") {
                            router.replace(`${pathName}?create_case_status=suceeded&case_tracking_code=${resp.setUpIntentTarget.forObject.id}`)
                        }
                    }
                }
                else if (params.has("create_case_status")) {
                    setShowDialog(true)
                }
                else if (params.has("release_case_status")) {
                    setShowReleaseDialog(true)
                } else if (params.has("close_case_status")) {
                    setShowCloseDialog(true)
                }
            } 
        }

        process()
    }, [params])

    return (
        <>
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                    type="button"
                    aria-label="button-createHelpRequest"
                    className="rounded-md flex flex-col col-span-2 space-y-3 items-center justify-center text-xl text-white w-full h-full" 
                    style={{backgroundColor: "rgb(36, 39, 42)" }} >
                    <SpiriAssistLogo
                        height={100} />
                    </Button>
                </DialogTrigger>
                <DialogContent className="flex flex-col w-full p-8 md:w-[650px] min-h-[450px]">
                    {meQuery.isSuccess && (
                        <HelpRequestFormUI 
                            me={meQuery.data}
                        />
                    )}
                </DialogContent>
            </Dialog>
            { params?.has("case_tracking_code") && params.get("case_tracking_code") != null && (
                <SignalRProvider userId={params.get("case_tracking_code") as string}>
                    <CaseCreateDialog 
                        open={showDialog}
                        close_dialog={close_success_dialog}
                        trackingCode={params.get("case_tracking_code") as string}
                    />
                    <CaseReleaseDialog 
                        open={showReleaseDialog} 
                        close_dialog={close_success_dialog}
                        trackingCode={params.get("case_tracking_code") as string}
                    />
                    <CaseCloseDialog 
                        open={showCloseDialog} 
                        close_dialog={close_success_dialog}
                        trackingCode={params.get("case_tracking_code") as string} 
                    />
                </SignalRProvider>
            )}
        </>
    )
}

export const UpdateHelpRequestButton : React.FC<HelpRequestButtonProps> = (props) => {
    const meQuery = UseContactMe();

    return (
        <Dialog aria-label={"updateCase-dialog"}>
            <DialogTrigger asChild>
                <Button variant="link" className="-mt-2" aria-label={"button-trackCase-updateCase"}> Update </Button>
            </DialogTrigger>
            <DialogContent className="flex flex-col w-full flex-wrap md:w-[650px] h-[450px]">
                {meQuery.isSuccess && (
                    <HelpRequestFormUI
                        caseDetails={props.caseDetails}
                        me={meQuery.data}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
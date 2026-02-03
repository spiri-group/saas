'use client';

import UseCreateTour, { createTourSchema } from "./hooks/UseCreateTour";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { DialogContent, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import WithPaymentsEnabled from "@/app/(site)/m/_components/Banking/_components/WithPaymentsEnabled";
import { TooltipProvider } from "@/components/ui/tooltip";
import VisuallyHidden from "@/components/ux/VisuallyHidden";
import { useState } from "react";
import ThumbnailInput from "@/components/ux/ThumbnailInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, TicketIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import TimeZoneSelector from "@/components/ux/TimeZoneSelector";
import RichTextInput from "@/components/ux/RichTextInput";
import AccordionInput from "@/components/ux/AccordionInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UpsertTicketVariants from "./components/UpsertTicketVariants";
import CreateActivityList from "./components/CreateActivityList";
import useVendorRefundPolicies from "@/app/(site)/m/_components/Profile/Edit/RefundPolicies/_hooks/UseVendorRefundPolicies";
import ComboBox from "@/components/ux/ComboBox";
import { useRouter } from "next/navigation";
import { escape_key, isNullOrUndefined } from "@/lib/functions";
import UseVendorCurrency from "@/app/(site)/m/_hooks/UseVendorCurrency";

type BLProps = {
    merchantId: string,
}

const useBL = (props: BLProps) => {
    const router = useRouter();
    const { form, mutation: createTour, values } = UseCreateTour(props.merchantId);

    const [currentStep, setCurrentStep] = useState(1);

    const refund_policies = useVendorRefundPolicies(props.merchantId, "TOUR");
    const vendorCurrency = UseVendorCurrency(props.merchantId);

    const isDataLoading = refund_policies.isLoading || vendorCurrency.isLoading;
    const merchantCurrency = vendorCurrency.data?.vendor.currency || "USD";

    const validateStep1 = async () => {
        // Manual validation checks for required fields
        if (!values.name || values.name.trim() === '') {
            toast.error("Tour name is required");
            return false;
        }

        if (!values.timezone) {
            toast.error("Timezone is required");
            return false;
        }

        if (!values.country) {
            toast.error("Country is required");
            return false;
        }

        if (!values.description || values.description.trim() === '') {
            toast.error("Description is required");
            return false;
        }

        return true;
    };

    const validateStep2 = async () => {
        // Validate thumbnail
        if (!values.thumbnail_content_set) {
            toast.error("Tour image is required");
            return false;
        }

        return true;
    };

    const validateStep3 = async () => {
        // Validate activity list
        const result = await form.trigger(['activityList']);
        if (!result) {
            toast.error("Please configure the tour itinerary");
            return false;
        }

        // Check if activityList has at least 2 activities (start and end)
        if (!values.activityList || !values.activityList.activities || values.activityList.activities.length < 2) {
            toast.error("Itinerary must have at least start and end activities");
            return false;
        }

        return true;
    };

    const validateStep4 = async () => {
        // Trigger validation for ticket variants
        const result = await form.trigger(['ticketVariants']);

        if (!result) {
            const errors = form.formState.errors;
            if (errors.ticketVariants) {
                if (Array.isArray(errors.ticketVariants)) {
                    const firstErrorIndex = errors.ticketVariants.findIndex(variant => variant != null);
                    if (firstErrorIndex >= 0) {
                        toast.error(`Please fix errors in Ticket Variant ${firstErrorIndex + 1}`);
                    } else {
                        toast.error("Please fix ticket variant errors");
                    }
                } else if (errors.ticketVariants.message) {
                    toast.error(errors.ticketVariants.message);
                } else {
                    toast.error("Please complete all ticket variant information");
                }
            } else {
                toast.error("Please add at least one ticket variant");
            }
        }

        return result;
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            const isValid = await validateStep1();
            if (isValid) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            const isValid = await validateStep2();
            if (isValid) {
                setCurrentStep(3);
            }
        } else if (currentStep === 3) {
            const isValid = await validateStep3();
            if (isValid) {
                setCurrentStep(4);
            }
        } else if (currentStep === 4) {
            const isValid = await validateStep4();
            if (isValid) {
                // Submit the form - parse through schema to get transformed values
                const formValues = form.getValues();
                try {
                    // Parse through schema to transform track_inventory from optional to required
                    const parsedValues = createTourSchema.parse(formValues);
                    const result = await createTour.mutateAsync(parsedValues);

                    // Close dialog and navigate
                    escape_key();
                    router.push(`/m/${props.merchantId}/events-and-tours?listingId=${result.id}`);
                } catch (error) {
                    toast.error("Failed to create tour");
                    console.error(error);
                }
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return {
        form,
        values,
        currentStep,
        handleNext,
        handlePrevious,
        isDataLoading,
        refundPolicies: refund_policies.data ?? [],
        isPending: createTour.isPending,
        merchantCurrency
    }
}

type Props = BLProps & {

}

const CreateTour : React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <DialogContent className="w-[1000px] h-[900px] flex flex-col">
            <VisuallyHidden>
                <DialogTitle>Create tour</DialogTitle>
                <DialogDescription>Fill in the form to create a new tour for your catalogue.</DialogDescription>
            </VisuallyHidden>

            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4 px-4 pt-2">
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-8 rounded-full transition-colors ${
                        bl.currentStep >= 1 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 1 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Details
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-8 rounded-full transition-colors ${
                        bl.currentStep >= 2 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 2 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Thumbnail
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-8 rounded-full transition-colors ${
                        bl.currentStep >= 3 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 3 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Itinerary
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`h-1 w-8 rounded-full transition-colors ${
                        bl.currentStep >= 4 ? 'bg-primary' : 'bg-muted'
                    }`}></div>
                    <span className={`text-xs font-medium transition-colors ${
                        bl.currentStep === 4 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    }`}>
                        Tickets
                    </span>
                </div>
                <Button variant="outline" onClick={() => {
                    const event = new CustomEvent('close-dialog');
                    window.dispatchEvent(event);
                }}>
                    ✕ Close
                </Button>
            </div>

            <TooltipProvider>
                <Form {...bl.form}>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                    }} className="flex-grow flex flex-col space-y-4 min-h-0">
                        {/* Step 1: Tour Details */}
                        {bl.currentStep === 1 && (
                            <div className="flex-grow flex flex-col space-y-4 overflow-hidden">
                                <Card className="flex-grow flex flex-col min-h-0">
                                    <CardHeader className="flex-shrink-0">
                                        <CardTitle className="flex items-start gap-6 text-base">
                                            <div className="flex items-center">
                                                <MapPinIcon className="h-4 w-4 mr-2" />
                                                Tour Information
                                            </div>
                                            <FormField
                                                name="name"
                                                control={bl.form.control}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1 flex flex-row items-center space-x-3 space-y-0">
                                                        <FormLabel className="text-sm font-medium">Tour Name *</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Enter tour name" autoFocus />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow flex flex-col space-y-4 pt-2 min-h-0">
                                        <div className="flex-shrink-0 space-y-4">
                                            <TimeZoneSelector
                                                form={bl.form}
                                                fieldNames={[
                                                    { control: "country", fieldName: "country" },
                                                    { control: "timezone", fieldName: "timezone" }
                                                ]}  />

                                            {/* Product Return Policy */}
                                            <FormField
                                                name="productReturnPolicyId"
                                                control={bl.form.control}
                                                render={({field}) => (
                                                    <FormItem className="flex flex-col space-y-2">
                                                        <FormLabel className="text-sm font-medium">Product Return Policy (Optional)</FormLabel>
                                                        <FormControl>
                                                            <ComboBox
                                                                withSearch={true}
                                                                objectName="Product Return Policy"
                                                                onChange={(value) => {
                                                                    if (isNullOrUndefined(value)) return;
                                                                    field.onChange(value.id);
                                                                }}
                                                                value={bl.refundPolicies.length > 0 ? bl.refundPolicies.find(rp => rp.id == field.value) : undefined}
                                                                items={bl.refundPolicies ?? []}
                                                                fieldMapping={{
                                                                    keyColumn: "id",
                                                                    labelColumn: "title"
                                                                }} />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Select a product return policy or leave blank for no refunds
                                                        </FormDescription>
                                                    </FormItem>
                                                )} />
                                        </div>

                                        {/* Description, Terms, FAQ */}
                                        <Tabs defaultValue="description" className="flex-grow flex flex-col min-h-0">
                                            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                                                <TabsTrigger value="description">Description *</TabsTrigger>
                                                <TabsTrigger value="terms">Terms</TabsTrigger>
                                                <TabsTrigger value="faq">FAQ</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="description" className="flex-grow mt-2">
                                                <FormField
                                                    name="description"
                                                    render={({field}) => (
                                                        <RichTextInput
                                                            {...field}
                                                            maxWords={500}
                                                            className="w-full h-full" />
                                                    )} />
                                            </TabsContent>
                                            <TabsContent value="terms" className="flex-grow mt-2">
                                                <FormField
                                                    name="terms"
                                                    render={({field}) => (
                                                        <FormItem className="flex flex-col h-full">
                                                            <FormControl>
                                                                <RichTextInput
                                                                    {...field}
                                                                    maxWords={500}
                                                                    className="w-full h-full" />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                            </TabsContent>
                                            <TabsContent value="faq" className="flex-grow mt-2">
                                                <FormField
                                                    name="faq"
                                                    render={({field}) => (
                                                        <FormItem className="flex flex-col h-full">
                                                            <FormControl>
                                                                <AccordionInput createButtonProps={{ className: "w-full", label: "Add FAQ" }} {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 2: Thumbnail */}
                        {bl.currentStep === 2 && (
                            <div className="flex-grow flex flex-col space-y-4 overflow-y-auto">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Tour Thumbnail</CardTitle>
                                        <FormDescription>
                                            Upload a landscape image for your tour. This will be displayed on your tour listing.
                                        </FormDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={bl.form.control}
                                            name="thumbnail"
                                            render={({field}) => (
                                                <FormItem className="relative">
                                                    <FormControl>
                                                        <ThumbnailInput
                                                            thumbnailType="square"
                                                            objectFit="contain"
                                                            withPrice={true}
                                                            relativePath={`merchant/${props.merchantId}/tour/${bl.values.id}/thumbnail`}
                                                            easyModeOnly={true}
                                                            layout="landscape"
                                                            {...field}
                                                            onChange={(data) => {
                                                                field.onChange(data);
                                                                if (!isNullOrUndefined(data.title.content)) {
                                                                    bl.form.setValue('thumbnail_content_set', true, { shouldValidate: true });
                                                                }
                                                            }} />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 3: Itinerary */}
                        {bl.currentStep === 3 && (
                            <div className="flex-grow flex flex-col space-y-4 overflow-y-auto">
                                <Card className="flex-grow flex flex-col min-h-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-base">
                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                            Tour Itinerary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow min-h-0">
                                        <FormField
                                            name="activityList"
                                            control={bl.form.control}
                                            render={() => (
                                                <FormItem className="h-full">
                                                    <FormControl>
                                                        <CreateActivityList form={bl.form} fieldName="activityList" />
                                                    </FormControl>
                                                </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Step 4: Tickets */}
                        {bl.currentStep === 4 && (
                            <div className="flex-grow flex flex-col min-h-0 overflow-y-auto">
                                <Card className="flex-grow flex flex-col min-h-0">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-base">
                                            <div className="flex items-center">
                                                <TicketIcon className="h-4 w-4 mr-2" />
                                                Ticket Variants
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {bl.values.ticketVariants?.length || 0} variants
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow min-h-0">
                                        <FormField
                                            control={bl.form.control}
                                            name="ticketVariants"
                                            render={({ field }) => (
                                                <UpsertTicketVariants
                                                    {...field}
                                                    currency={bl.merchantCurrency} />
                                            )} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <DialogFooter className="flex flex-row items-center sm:justify-between w-full">
                            <div className="flex space-x-2">
                                <CancelDialogButton />
                            </div>
                            <div className="flex space-x-2">
                                {bl.currentStep > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={bl.handlePrevious}
                                        disabled={bl.isPending}
                                        data-testid="tour-wizard-previous-btn"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4 mr-2" />
                                        Previous
                                    </Button>
                                )}
                                {bl.currentStep < 4 ? (
                                    <Button
                                        type="button"
                                        onClick={bl.handleNext}
                                        disabled={bl.isPending}
                                        data-testid="tour-wizard-next-btn"
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={bl.handleNext}
                                        disabled={bl.isPending}
                                        data-testid="tour-wizard-create-btn"
                                    >
                                        {bl.isPending ? "Creating Tour..." : "Create Tour"}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </TooltipProvider>
        </DialogContent>
    )
}

export default WithPaymentsEnabled(CreateTour);

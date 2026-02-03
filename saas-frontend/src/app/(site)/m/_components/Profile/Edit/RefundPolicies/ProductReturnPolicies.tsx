import { Control, SubmitErrorHandler, SubmitHandler, useFieldArray, useWatch } from "react-hook-form"
import useUpsertRefundPolicy, { RefundPolicySchemaType, UpsertVendorRefundPoliciesSchema } from "./_hooks/UseUpsertRefundPolcy"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { escape_key, formatDateString, isNullOrUndefined } from "@/lib/functions"
import { CircleCheckIcon, CircleIcon, CheckIcon, Edit3Icon, ChevronRight } from "lucide-react"
import EditReturnReason from "./_components/EditReturnReason"
import useFormStatus from "@/components/utils/UseFormStatus"
import ComboBox from "@/components/ux/ComboBox"
import { cn } from "@/lib/utils"
import ViewRefundPolicy from "./_components/ViewRefundPolicy"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselScrollToBottom, CarouselScrollToTop } from "@/components/ux/Carousel"
import { Input } from "@/components/ui/input"
import UseDeleteRefundPolicy from "./_hooks/UseDeleteRefundPolicy"
import product_reasons from "./_hooks/product_reasons.json"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    const status = useFormStatus();

    const { form, mutation, options, editIndex, isLoading } = useUpsertRefundPolicy({
        merchantId: props.merchantId,
        listingType: "PRODUCT",
        reasons: product_reasons
    })
    const { control } = form

    const [previewIndex, setPreviewIndex] = useState<number | null>(null)

    const finish: SubmitHandler<UpsertVendorRefundPoliciesSchema> = async (data) => {
        // Handle form submission
        await status.submit(async () => {
            const resp = await mutation.mutateAsync(data)
            return resp;
        }, {}, (data: string[]) => {
            // we need to mark all the dirty as clean for all the policies saved
            // data will be a list of the ids
            data.forEach((id) => {
                const index = form.getValues().refundPolicies.findIndex((policy) => policy.id === id)
                const policyData = form.getValues().refundPolicies[index]
                policyData.saved = true;
                if (index !== -1) {
                    form.resetField(`refundPolicies.${index}`, { keepDirty: false, defaultValue: policyData})
                }
            })
            // close the preview dialog
            setPreviewIndex(null)

            // reset the form state
            status.reset();
        })
    }

    const errors: SubmitErrorHandler<UpsertVendorRefundPoliciesSchema> = (errors) => {
        // Handle form errors
        console.error(errors)
        setPreviewIndex(null);
    }

    const [pendingDelete, setPendingDelete] = useState(false)
    const deleteStatus = useFormStatus();
    const deletePolicy = UseDeleteRefundPolicy({
        merchantId: props.merchantId,
    });
    const handleDelete = () => {
        if (editIndex.value == null) return;
        const policyId = form.getValues(`refundPolicies.${editIndex.value}.id`);
        if (!policyId) return;

        deleteStatus.submit(
            async () => {
                await deletePolicy.mutateAsync({ policyId });
                return policyId;
            },
            {},
            () => {
                // need to delete it from the form state
                const policies = form.getValues("refundPolicies")
                const newPolicies = policies.filter((_, index) => index !== editIndex.value)
                form.resetField("refundPolicies", { keepDirty: false, defaultValue: newPolicies })

                editIndex.set(null);
                setPendingDelete(false);
                status.reset();
            }
        );
    };

    return {
        isLoading,
        options,
        form,
        status,
        control,
        finish,
        errors,
        editIndex,
        previewIndex,
        setPreviewIndex,
        deletePolicy: {
            isOpen: pendingDelete,
            close: () => setPendingDelete(false),
            open: () => setPendingDelete(true),
            submit: handleDelete,
            status: deleteStatus,
        }
    }
}
    
const UpsertRefundPolicy: React.FC<{
    countries: { key: string, label: string }[],
    control: Control<UpsertVendorRefundPoliciesSchema>,
    editIndex: number,
    preview: () => void,
    onDelete: () => void // Add onDelete prop
}> = ({
    countries,
    control,
    preview,
    editIndex,
    onDelete, // Destructure onDelete
}) => {

    const [editReasonIndex, setEditReasonIndex] = useState<number | null>(null)

    const reasons = useFieldArray({
        control,
        name: `refundPolicies.${editIndex}.reasons`
    })

    const saved = useWatch({
        control,
        name: `refundPolicies.${editIndex}.saved`
    })

    const updatedDate = useWatch({
        control,
        name: `refundPolicies.${editIndex}.updatedDate`
    })

    if (isNullOrUndefined(editReasonIndex)) {
        return (
            <>
                <FormField
                    control={control}
                    name={`refundPolicies.${editIndex}.title`}
                    render={({field}) => {
                        return (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input
                                    aria-label="refund-policy-title"
                                    placeholder="Refund Policy Title"
                                    {...field}
                                    />
                            </FormControl>
                        </FormItem>
                        )
                    }} />
                <FormField
                    control={control}
                    name={`refundPolicies.${editIndex}.country`}
                    render={({ field }) => {
                        return (
                        <FormItem className="space-y-2">
                            <FormLabel>Sold from Country</FormLabel>
                            <FormControl>
                                { countries.length == 1
                                    ? <div className="px-4 py-2 h-10 text-sm border border-input border-opacity-60 rounded-lg w-full">{countries[0].label}</div>
                                    :
                                    <ComboBox
                                        objectName="Country"
                                        items={countries}
                                        fieldMapping={{
                                            labelColumn: "label",
                                            keyColumn: "key"
                                        }}
                                        onChange={(selected) => {
                                            if (!selected) return;
                                            field.onChange(selected.key);
                                        }}
                                        value={countries.find(c => c.key === field.value)}
                                    />
                                }
                            </FormControl>
                        </FormItem>
                        )
                    }} />
                { reasons.fields.length > 0 &&
                    <ul className="grid grid-cols-2 gap-4 grid-rows-auto" aria-label="reasons-list">
                        {
                            reasons.fields.map((reason, index) => (
                                <div key={reason.id} 
                                    aria-label={`reason-${reason.code}`}
                                    className={cn("flex flex-row gap-3 items-center w-full w-full p-4 rounded-lg", reason.confirmed ? "" : "bg-gray-50")}>
                                    { reason.confirmed ?
                                        <CircleCheckIcon aria-label="icon-configured" className="flex-none w-8 h-8 text-green-800" /> :
                                        <CircleIcon className={cn("flex-none w-8 h-8", reason.confirmed ? "text-green-800" : "text-slate-400")} />
                                    }
                                    <div className="text-sm">
                                        <span>{reason.title}</span>
                                    </div>
                                    <Button 
                                        aria-label="configure-reason"
                                        className="ml-auto"
                                        variant="link"
                                        onClick={() => {
                                            setEditReasonIndex(index)
                                        }}>
                                        {reason.confirmed ? "Change" : "Configure"}
                                    </Button>
                                </div>
                            ))
                        }
                    </ul>
                }
                {
                    updatedDate && <div className="text-sm text-muted-foreground mt-auto pl-4">
                        Last updated {formatDateString(updatedDate)}
                    </div>
                }
                <div className="flex flex-row items-center gap-3">
                <Button
                    type="button"
                    variant="link"
                    aria-label="cancel-edit-refund-policy"
                    onClick={() => {
                        escape_key();
                    }}
                    >
                        Cancel
                    </Button>
                {
                saved &&
                <Button
                    type="button"
                    aria-label="delete-refund-policy"
                    className="w-full"
                    onClick={onDelete} // Trigger onDelete
                    variant="destructive"
                >
                    Delete
                </Button>
                }
                <Button
                    type="button"
                    aria-label="preview-refund-policy"
                    className="w-full"
                    onClick={preview}
                    variant="default"> 
                    Preview & Finalize
                </Button>
                </div>
            </>
        )
    } else {
        return (
            <>
                <EditReturnReason
                    existing={reasons.fields[editReasonIndex]}
                    onClose={() => setEditReasonIndex(null)}
                    onSubmit={(values) => {
                        reasons.update(editReasonIndex, values)
                        setEditReasonIndex(null)
                    }}
                    />
            </>
        )
    }
}

const RefundPolicySelector: React.FC<{
    watch: (name: string) => any,
    control: Control<UpsertVendorRefundPoliciesSchema>,
    defaultPolicy: (title: string) => RefundPolicySchemaType,
    editIndex: { value: number | null, set: (index: number | null) => void },
    isDirty: (refundIndex: number) => boolean
}> = ({
    control, defaultPolicy, editIndex, watch, isDirty
}) => {    
    const policies = useFieldArray({
        name: "refundPolicies",
        control,
    });

    return (
        <>
            <Button
                type="button"
                variant="default"
                aria-label="define-new-policy"
                onClick={() => {
                    policies.prepend(defaultPolicy(`Policy ${policies.fields.length + 1}`))
                }}
            >
                Define New Policy
            </Button>
            <Carousel 
                orientation="vertical"
                className="w-full flex-grow min-h-0"
                >
                <div className="flex flex-row gap-3 w-full">
                    <CarouselPrevious aria-label="previous-policy" className="flex-grow" style="RECTANGLE" />
                    <CarouselScrollToBottom style="RECTANGLE" />
                </div>
                <CarouselContent className="space-y-2 py-2">
                    {
                        policies.
                            fields
                            .map((policy, index) => {
                            const title = watch(`refundPolicies.${index}.title`)
                            const dirty = isDirty(index);
                            return (
                            <CarouselItem 
                                    className="flex flex-row space-x-1 items-center"
                                    key={policy.id}>
                                    <Button 
                                        type="button" 
                                        aria-label="choose-policy" 
                                        variant="outline"
                                        className={cn(
                                            "flex flex-row gap-3 items-center w-full",
                                            index === editIndex.value ? "border-green-800" : ""
                                        )}
                                    onClick={() => {
                                        editIndex.set(index);
                                    }}>
                                        <div className="flex-none w-4 h-4">
                                        {!isDirty && index === editIndex.value &&
                                            <CheckIcon aria-label="icon-configured" className="h-full w-full text-green-800" />
                                        }
                                        {dirty && 
                                            <Edit3Icon aria-label="icon-changes-present" className="h-full w-full text-green-800" />
                                        }
                                        </div>
                                        <div className="text-sm flex-grow text-left">
                                            <span>{title}</span>
                                        </div>
                                    </Button>
                                </CarouselItem>
                            )
                        })
                    }
                </CarouselContent>
                <div className="flex flex-row gap-3 w-full">
                    <CarouselScrollToTop style="RECTANGLE" />
                    <CarouselNext aria-label="next-policy" className="flex-grow" style="RECTANGLE" />
                </div>
            </Carousel>
        </>
    )
}


const UpsertRefundPolicies: React.FC<Props> = (props) => {
    const { form, control, finish, errors, status, editIndex, options, previewIndex, setPreviewIndex, isLoading, deletePolicy } = useBL(props);

    const scoped_errors = editIndex.value != null && form.formState.errors && form.formState.errors.refundPolicies
        && form.formState.errors.refundPolicies[editIndex.value] ?
        form.formState.errors.refundPolicies[editIndex.value] : undefined;

    const isDirty = (refundIndex: number) => {
        return !isNullOrUndefined(form.formState.dirtyFields.refundPolicies) && !isNullOrUndefined(form.formState.dirtyFields.refundPolicies[refundIndex])
    }

    // Show loading state while data is being fetched
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">
                    Loading product return policies...
                </div>
            </div>
        );
    }

    if (options.countries.length === 0) {
        // they need to set up their locations
        return (
            <div className="flex flex-col gap-4 p-4">
                <h3 className="font-semibold">No Sale Locations Available</h3>
                <p>Locations that you can sell your products from are required to setup refund policies. Please navigate to and enter your locations.</p>
                <p className="flex flex-row space-x-2 items-center text-sm text-muted-foreground">Selling Profile<ChevronRight className="h-4 w-4" />Locations</p>
                <Button
                    type="button"
                    variant="default"
                    onClick={() => {
                        setTimeout(() => {
                            // we need to raise an event to open the nav on the selling profile path
                            const event = new CustomEvent("open-nav-external", {
                                detail: {
                                    path: ["Selling Profile"],
                                    action: {
                                        type: "expand"
                                    }
                                }
                            });
                            window.dispatchEvent(event);
                        }, 1000)

                        escape_key();
                    }}
                >
                    Go to Locations
                </Button>
            </div>
        );
    }

    return (
        <>
        <div className="h-full w-full flex flex-row gap-3">
            <div className="w-1/4 h-full min-h-0 flex flex-col gap-4 ">
                { !isLoading && 
                <RefundPolicySelector
                    watch={form.watch}
                    control={control}
                    defaultPolicy={options.defaultPolicy} 
                    editIndex={editIndex} 
                    isDirty={isDirty}
                />}
                <Button
                    type="button"
                    variant="link"
                    className="w-full mt-auto"
                    aria-label="close-edit-refund-policy"
                    onClick={() => {
                        escape_key();
                    }}
                    >
                        Close
                    </Button>
            </div>
            {/* Main content */}
            <div className="w-3/4 h-full min-h-0 flex flex-col">
                <Form {...form}>
                    {
                        scoped_errors &&
                        <div className="p-4 bg-red-100 text-red-800 rounded-lg">
                            <ul>
                                {
                                    Object.entries(scoped_errors).map(([key, value]) => {
                                        const { message } = value as { message: string };
                                        return (
                                            <li key={key}>{message}</li>
                                        );
                                    })
                                }
                            </ul>
                        </div>
                    }
                    <form onSubmit={form.handleSubmit(finish, errors)} className="flex-grow min-h-0 flex flex-col gap-4 w-full">
                        {
                            editIndex.value !== null &&
                            (
                                <UpsertRefundPolicy
                                    key={editIndex.value}
                                    control={control}
                                    editIndex={editIndex.value}
                                    countries={options.countries}
                                    preview={() => {
                                        setPreviewIndex(editIndex.value);
                                    }}
                                    onDelete={() => {
                                        deletePolicy.open()
                                    }}
                                />
                            )
                        }
                    </form>
                </Form>
            </div>
        </div>
        <Dialog open={!isNullOrUndefined(previewIndex)} onOpenChange={(open) => {
                if (!open) {
                    setPreviewIndex(null)
                }
            }}>
            <DialogContent className="h-[625px] w-[800px] min-h-0 flex flex-col">
                <ViewRefundPolicy
                    policy={
                        form.getValues().refundPolicies[previewIndex ?? 0]
                    }
                    />
                    <DialogFooter>
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <Button 
                            type="button"
                            aria-label="make-more-changes"
                            className="w-full"
                            onClick={() => setPreviewIndex(null)}
                            variant="destructive">
                            Make more changes
                        </Button>
                        <Button 
                            type="button"
                            aria-label="confirm-save-refund-policy"
                            onClick={form.handleSubmit(finish, errors)}
                            variant={status.button.variant}
                            disabled={status.formState === 'processing'}
                            >
                            {status.formState === 'idle' ? 'Confirm & Save' : status.button.title}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={deletePolicy.isOpen}>
                <DialogContent>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. Do you want to delete this refund policy?
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => {
                                deletePolicy.close()
                                deletePolicy.status.reset();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={deletePolicy.status.formState === "idle" ? "destructive" : deletePolicy.status.button.variant}
                            disabled={deletePolicy.status.formState === 'processing'}
                            aria-label="confirm-delete-refund-policy"
                            onClick={deletePolicy.submit}
                        >
                            {deletePolicy.status.formState === 'idle' ? 'Delete' : deletePolicy.status.button.title}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default UpsertRefundPolicies;
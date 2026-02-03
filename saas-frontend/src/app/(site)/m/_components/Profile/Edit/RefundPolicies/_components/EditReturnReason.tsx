'use client';

import { RefundPolicyDetailSchemaType, RefundReturnReasonSchema, RefundReturnReasonSchemaType, RefundTierSchemaType } from "../_hooks/UseUpsertRefundPolcy"
import { useZodFormHandler } from "@/components/ux/ZodFormHandler"
import { Dialog, DialogContent,DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import ComboBox from "@/components/ux/ComboBox"
import { useFieldArray, useWatch } from "react-hook-form"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import { generate_human_friendly_id } from "@/lib/functions"
import { useState } from "react";
import { v4 as uuid } from "uuid";
import EditRefundPolicyDetail from "./EditRefundPolicyDetail";
import EditRefundTier from "./EditRefundTier";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import IconButton from "@/components/ui/iconbutton";

type Props = {
    existing: RefundReturnReasonSchemaType,
    onClose: () => void
    onSubmit: (values: RefundReturnReasonSchemaType) => void

}

const EditReturnReason:React.FC<Props> = (props) => {
    const { existing, onClose, onSubmit } = props;
    const { ...existingData } = existing;

    const [editCondition, setEditCondition] = useState<RefundPolicyDetailSchemaType | null>(null)
    const [editTier, setEditTier] = useState<RefundTierSchemaType | null>(null)
    const [confirmDeleteCondition, setConfirmDeleteCondition] = useState<{ id: string, index: number } | null>(null);
    const [confirmDeleteTier, setConfirmDeleteTier] = useState<{ id: string, index: number } | null>(null);

    const { form, control, handleSubmit } = useZodFormHandler({
        schema: RefundReturnReasonSchema,
        defaultValues: {
            ...existingData
        },
        onSubmit: async (values) => {
            values.confirmed = true;

            // Handle form submission
            onSubmit(values);
            form.reset();
            onClose();
        },
        onSuccess: () => {

        },
        onError: (errors) => {
            console.error(errors);
        }
    })

    const { formState: { isDirty } } = form;

    const no_refunds = useWatch({
        control,
        name: 'no_refund'
    })

    const who_pays_options = [
        { label: 'Customer', value: 'CUSTOMER' },
        { label: 'Merchant', value: 'MERCHANT' },
        { label: 'Not Required', value: 'NOT_REQUIRED' }
    ]

    const conditions = useFieldArray({
        control,
        name: 'conditions'
    })
    const tiers = useFieldArray({
        control,
        name: 'tiers'
    })
    const max_days = Math.max(...tiers.fields.map(field => field.daysUpTo))

    return (
        <>
        <Form {...form}>
            <form className="flex-grow min-h-0 flex flex-col space-y-2">
                <div className="flex flex-row justify-between items-center">
                    <span className="font-medium"><span className="text-slate-600">Configure</span> {existing.title}</span>
                    <span>{existing.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                <FormField
                    name="no_refund"
                    control={control}
                    render={({ field }) => (
                        <FormItem className="flex flex-row space-x-3 items-center">
                            <FormControl>
                                <Checkbox 
                                    aria-label="no-refunds"
                                    checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="pb-2 text-lg">No refunds</FormLabel>
                        </FormItem>
                    )} />
                <FormField
                    name="whoPayShipping"
                    control={control}
                    render={({ field }) => (
                        <FormItem className="flex flex-row space-x-3 items-center">
                            <FormLabel className={no_refunds ? "text-slate-400" : ""}>Who pays shipping?</FormLabel>
                            <FormControl>
                                <ComboBox 
                                    disabled={no_refunds}
                                    {...field}
                                    items={who_pays_options}
                                    onChange={(selected) => {
                                        if (!selected) return;
                                        const { value } = selected;
                                        field.onChange(value);
                                    }}
                                    fieldMapping={{
                                        keyColumn: 'value',
                                        labelColumn: 'label'
                                    }}
                                    value={who_pays_options.find(option => option.value === field.value)}
                                    />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>
                <div className={cn("flex-grow min-h-0 grid grid-cols-2 gap-3 mt-3", no_refunds ? "opacity-50" : "")}>
                    <div className="h-full min-h-0 flex flex-col">
                        <div className="font-medium text-sm py-1">
                            <span>Timelines & Percentages</span>
                        </div>
                        <Button 
                            aria-label="add-tier"
                            disabled={no_refunds}
                            variant="default" type="button"
                            className="w-full my-2"
                            onClick={() => {
                                setEditTier({
                                    id: uuid(),
                                    daysUpTo: 1,
                                    refundPercentage: 1,
                                    refundCustomerFees: false
                                })
                            }}
                        >
                            { tiers.fields.length === 0 ? "Specify your first time period" : "Add another time period" }
                        </Button>
                        <Carousel
                            opts={{
                                dragFree: true
                            }}
                            orientation="vertical" 
                            className="flex-grow min-h-0 flex flex-col"
                            plugins={[WheelGesturesPlugin()]}
                            >
                            <CarouselPrevious style="RECTANGLE" className="flex-none w-full" />
                            <CarouselContent outerClassName="flex-grow" className="flex-col space-y-2 h-full w-full">
                            {
                                tiers.fields.map((field, index) => (
                                    <CarouselItem aria-label={`tier-${field.daysUpTo}`} className="w-full p-2" key={field.id}>
                                        <div className="py-2 flex flex-row items-center">
                                            <IconButton aria-label={`edit-tier`} type="button" variant="link" icon={<PencilIcon size={20} />} onClick={() => {
                                                setEditTier(field)
                                            }} />
                                            <IconButton aria-label="delete-tier" type="button" variant="link" icon={<Trash2Icon size={20} />} onClick={() => {
                                                setConfirmDeleteTier({ id: field.id, index });
                                            }} />
                                            <div className="ml-2 text-sm flex-grow">
                                                <div>Up to {field.daysUpTo} day{field.daysUpTo > 1 ? "s" : ""}: {(field.refundPercentage * 100).toFixed(0)}% refund</div>
                                                {field.refundCustomerFees && (
                                                    <div className="text-xs text-muted-foreground">+ Customer fees included</div>
                                                )}
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))
                            }
                            </CarouselContent>
                            <CarouselNext style="RECTANGLE" className="flex-none w-full" />
                        </Carousel>
                        { tiers.fields.length !== 0 &&
                            <div className="mt-4">
                                After {max_days} day{max_days > 1 ? "s" : ""}, no refunds will be available.
                            </div>
                        }
                    </div>
                    <div className="h-full min-h-0 flex flex-col">
                        <div className="font-medium text-sm py-1">
                            <span>Conditions Required</span>
                        </div>
                            <Button 
                                aria-label="add-condition"
                                disabled={no_refunds}
                                variant="default" type="button"
                                className="w-full my-2"
                                onClick={() => {
                                    setEditCondition({
                                        id: uuid(),
                                        isCustom: true,
                                        code: generate_human_friendly_id("RR"),
                                        title: "",
                                        description: ""
                                    })
                                }}
                        >
                            { conditions.fields.length === 0 ? "Specify your first condition" : "Add another Condition" }
                        </Button>
                        <Carousel
                            className="flex-grow min-h-0 flex flex-col"
                            opts={{
                                dragFree: true
                            }}
                            orientation="vertical"
                            plugins={[WheelGesturesPlugin()]}
                            >
                            <CarouselPrevious style="RECTANGLE" className="flex-none w-full" />
                            <CarouselContent outerClassName="flex-grow min-h-0" className="flex-col space-y-2 h-full w-full">
                            {
                                conditions.fields.map((field, index) => (
                                    <CarouselItem key={field.id} className="w-full p-2">
                                        <div className="py-2 flex flex-row items-center">
                                            <IconButton aria-label={`edit-condition-${field.id}`} type="button" variant="link" icon={<PencilIcon size={20} />} onClick={() => {
                                                setEditCondition(field)
                                            }} />
                                            <IconButton aria-label="delete-condition" type="button" variant="link" icon={<Trash2Icon size={20} />} onClick={() => {
                                                setConfirmDeleteCondition({ id: field.id, index });
                                            }} />
                                            <span className="ml-2 text-sm line-clamp-2">{field.title}</span>
                                        </div>
                                    </CarouselItem>
                                ))
                            }
                            </CarouselContent>
                            <CarouselNext style="RECTANGLE" className="flex-none w-full" />
                        </Carousel>
                    </div>
                </div>
                <div className="flex flex-row w-full space-x-3 items-center mt-3">
                    <Button type="button" variant="link" onClick={() => {
                        form.reset();
                        onClose();
                    }}>{isDirty ? "Discard Changes" : "Go Back"}</Button>
                    <Button aria-label="finish-edit-reason" className="flex-grow" type="button" onClick={handleSubmit}>Confirm Reason Configuration</Button>
                </div>
            </form>
        </Form>
        <Dialog open={editCondition !== null}>
            {editCondition !== null &&
                <EditRefundPolicyDetail 
                    existing={editCondition}
                    type={"condition"}
                    onSubmit={(values) => {
                        if (conditions.fields.find(field => field.id === values.id)) {
                            conditions.update(conditions.fields.findIndex(field => field.id === values.id), values)
                        } else {
                            conditions.append(values)
                        }
                    }}
                    onClose={() => setEditCondition(null)}
                    />
            }
        </Dialog>
        <Dialog open={editTier !== null}>
            {editTier !== null &&
                <EditRefundTier
                    existing={editTier}
                    onSubmit={(values) => {
                        if (tiers.fields.find(field => field.id === values.id)) {
                            tiers.update(tiers.fields.findIndex(field => field.id === values.id), values)
                        } else {
                            tiers.append(values)
                        }
                    }}
                    onClose={() => setEditTier(null)}
                    />
            }
        </Dialog>
        <Dialog open={confirmDeleteCondition !== null}>
            {confirmDeleteCondition !== null && (
                <DialogContent>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this condition?
                    </DialogDescription>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteCondition(null)}>Cancel</Button>
                        <Button 
                            aria-label="confirm-delete-condition"
                            variant="destructive" onClick={() => {
                            conditions.remove(confirmDeleteCondition.index);
                            setConfirmDeleteCondition(null);
                        }}>Delete</Button>
                    </div>
                </DialogContent>
            )}
        </Dialog>
        <Dialog open={confirmDeleteTier !== null}>
            {confirmDeleteTier !== null && (
                <DialogContent>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this tier?
                    </DialogDescription>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteTier(null)}>Cancel</Button>
                        <Button 
                            aria-label="confirm-delete-tier"
                            variant="destructive" onClick={() => {
                                tiers.remove(confirmDeleteTier.index);
                                setConfirmDeleteTier(null);
                            }}>Delete</Button>
                    </div>
                </DialogContent>
            )}
        </Dialog>
        </>
    )
}

export default EditReturnReason
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import useUpsertServiceCancellationPolicy from "./_hooks/UseUpsertServiceCancellationPolicy";
import UseDeleteServiceCancellationPolicy from "./_hooks/UseDeleteServiceCancellationPolicy";
import useFormStatus from "@/components/utils/UseFormStatus";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CircleCheckIcon, CircleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    merchantId: string;
}

const ServiceCancellationPolicies: React.FC<Props> = ({ merchantId }) => {
    const { form, mutation, editIndex, isLoading, options } = useUpsertServiceCancellationPolicy(merchantId);
    const status = useFormStatus();
    const [pendingDelete, setPendingDelete] = useState(false);
    const deleteStatus = useFormStatus();
    const deletePolicy = UseDeleteServiceCancellationPolicy({ merchantId });

    const finish = async (data: any) => {
        await status.submit(async () => {
            const resp = await mutation.mutateAsync(data);
            return resp;
        }, {}, (data: string[]) => {
            data.forEach((id) => {
                const index = form.getValues().cancellationPolicies.findIndex((policy) => policy.id === id);
                const policyData = form.getValues().cancellationPolicies[index];
                policyData.saved = true;
                if (index !== -1) {
                    form.resetField(`cancellationPolicies.${index}`, { keepDirty: false, defaultValue: policyData });
                }
            });
            status.reset();
        });
    };

    const handleDelete = () => {
        if (editIndex.value == null) return;
        const policyId = form.getValues(`cancellationPolicies.${editIndex.value}.id`);
        if (!policyId) return;

        deleteStatus.submit(
            async () => {
                await deletePolicy.mutateAsync({ policyId });
                return policyId;
            },
            {},
            () => {
                const policies = form.getValues("cancellationPolicies");
                const newPolicies = policies.filter((_, index) => index !== editIndex.value);
                form.resetField("cancellationPolicies", { keepDirty: false, defaultValue: newPolicies });
                editIndex.set(null);
                setPendingDelete(false);
                status.reset();
            }
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-sm text-muted-foreground">
                    Loading service cancellation policies...
                </div>
            </div>
        );
    }

    const policies = form.watch("cancellationPolicies");

    return (
        <>
            <div className="h-full w-full flex flex-row gap-3">
                {/* Sidebar - Policy List */}
                <div className="w-1/4 h-full min-h-0 flex flex-col gap-4">
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {policies.map((policy, index) => (
                            <button
                                key={policy.id}
                                type="button"
                                onClick={() => editIndex.set(index)}
                                className={cn(
                                    "w-full p-3 rounded-lg border text-left transition-colors",
                                    editIndex.value === index
                                        ? "bg-primary/10 border-primary"
                                        : "bg-background hover:bg-muted"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm truncate">{policy.title}</div>
                                    {policy.saved ? (
                                        <CircleCheckIcon className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <CircleIcon className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{policy.serviceCategory}</div>
                            </button>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            const newPolicy = options.defaultPolicy(
                                `Policy ${policies.length + 1}`,
                                "READING"
                            );
                            form.setValue("cancellationPolicies", [...policies, newPolicy]);
                            editIndex.set(policies.length);
                        }}
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Policy
                    </Button>
                </div>

                {/* Main content - Policy Editor */}
                <div className="w-3/4 h-full min-h-0 flex flex-col">
                    {editIndex.value !== null ? (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(finish)} className="flex-1 min-h-0 flex flex-col gap-4">
                                <div className="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg">
                                    <FormField
                                        control={form.control}
                                        name={`cancellationPolicies.${editIndex.value}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Policy Title *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="e.g., Standard Cancellation Policy" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name={`cancellationPolicies.${editIndex.value}.serviceCategory`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Service Category *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="READING">Reading</SelectItem>
                                                        <SelectItem value="HEALING">Healing</SelectItem>
                                                        <SelectItem value="COACHING">Coaching</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`cancellationPolicies.${editIndex.value}.fullRefundHours`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Refund (hours before)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="48" />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        100% refund if canceled this many hours before
                                                    </FormDescription>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`cancellationPolicies.${editIndex.value}.partialRefundHours`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Partial Refund (hours before)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="24" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`cancellationPolicies.${editIndex.value}.partialRefundPercentage`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Partial Refund %</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="50" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`cancellationPolicies.${editIndex.value}.noRefundHours`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>No Refund (hours before)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="12" />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        No refund if canceled within this window
                                                    </FormDescription>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name={`cancellationPolicies.${editIndex.value}.allowRescheduling`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Allow customers to reschedule</FormLabel>
                                                    <FormDescription>
                                                        Customers can reschedule their appointments within the policy rules
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch(`cancellationPolicies.${editIndex.value}.allowRescheduling`) && (
                                        <div className="grid grid-cols-2 gap-4 pl-8">
                                            <FormField
                                                control={form.control}
                                                name={`cancellationPolicies.${editIndex.value}.maxReschedules`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Max Reschedules</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} placeholder="2" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name={`cancellationPolicies.${editIndex.value}.rescheduleMinHours`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Min Hours Before</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} placeholder="24" />
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Minimum hours before appointment to reschedule
                                                        </FormDescription>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => setPendingDelete(true)}
                                        className="w-1/4"
                                    >
                                        <Trash2Icon className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant={status.button.variant}
                                        disabled={status.formState === 'processing'}
                                        className="flex-1"
                                    >
                                        {status.formState === 'idle' ? 'Save Policy' : status.button.title}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select a policy to edit or create a new one
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={pendingDelete}>
                <DialogContent>
                    <DialogTitle>Delete Cancellation Policy?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This policy will be removed from all services using it.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="default"
                            onClick={() => {
                                setPendingDelete(false);
                                deleteStatus.reset();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant={deleteStatus.formState === "idle" ? "destructive" : deleteStatus.button.variant}
                            disabled={deleteStatus.formState === 'processing'}
                            onClick={handleDelete}
                        >
                            {deleteStatus.formState === 'idle' ? 'Delete' : deleteStatus.button.title}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ServiceCancellationPolicies;

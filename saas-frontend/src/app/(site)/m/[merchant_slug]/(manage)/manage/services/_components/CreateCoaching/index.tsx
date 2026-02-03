import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";
import { useRouter } from "next/navigation";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { escape_key } from "@/lib/functions";
import { MessageCircle } from "lucide-react";
import { useCreateCoachingOffer } from "./hooks/UseCreateCoachingOffer";
import { Label } from "@/components/ui/label";
import TargetTimezoneSelector from "@/components/scheduling/TargetTimezoneSelector";
import TimezoneImpactMap from "@/components/scheduling/TimezoneImpactMap";
import SmartSchedulingRecommendations from "@/components/scheduling/SmartSchedulingRecommendations";

type BLProps = {
    merchantId: string;
}

const useBL = (props: BLProps) => {
    const router = useRouter();
    const { form, mutation } = useCreateCoachingOffer(props.merchantId);

    return {
        form,
        submit: async (values: any) => {
            await mutation.mutateAsync(values);
            escape_key();
            router.push(`/m/${props.merchantId}/manage/services`);
        }
    };
}

type Props = BLProps & {}

const CreateCoaching: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col h-full">
                <DialogHeader className="flex flex-row items-center space-x-2 p-4">
                    <div className="flex-none w-[45px] h-[45px] flex items-center justify-center rounded-xl bg-blue-200">
                        <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <DialogTitle>Create Your Coaching Offer</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                    <FormField
                        name="name"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Service Name *</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g., 8-Week Spiritual Awakening Coaching" />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="description"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>About this service *</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Describe what clients can expect..."
                                        rows={4}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        name="requiresConsultation"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium cursor-pointer">
                                        Requires Live Consultation
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        Check this if you&apos;ll deliver this service via live session instead of recorded file
                                    </p>
                                </div>
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            name="coachingType"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Coaching Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Life Path">Life Path</SelectItem>
                                            <SelectItem value="Spiritual Awakening">Spiritual Awakening</SelectItem>
                                            <SelectItem value="Career Guidance">Career Guidance</SelectItem>
                                            <SelectItem value="Relationship">Relationship</SelectItem>
                                            <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="focusArea"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Focus Area (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g., Shadow Work, Inner Child" />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {!bl.form.watch('requiresConsultation') && (
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                name="deliveryFormat"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Delivery Format</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="RECORDED_VIDEO">Recorded Video</SelectItem>
                                                <SelectItem value="RECORDED_AUDIO">Recorded Audio</SelectItem>
                                                <SelectItem value="WRITTEN_PDF">Written PDF</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="turnaroundDays"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Delivery (days)</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min="1"
                                                max="30"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            name="price"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Price *</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="currency"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Currency</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="GBP">GBP</SelectItem>
                                            <SelectItem value="AUD">AUD</SelectItem>
                                            <SelectItem value="CAD">CAD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Inclusion Options</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                name="includeJournal"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Journal prompts PDF</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="includeWorkbook"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Workbook</FormLabel>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <FormField
                        name="targetTimezones"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Target Customer Regions (Optional)</FormLabel>
                                <FormControl>
                                    <TargetTimezoneSelector
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {(bl.form.watch('targetTimezones')?.length ?? 0) > 0 && (
                        <div className="space-y-4 mt-6 pt-6 border-t">
                            <TimezoneImpactMap
                                practitionerTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                                availableHours={{ start: 9, end: 17 }}
                            />
                            <SmartSchedulingRecommendations
                                practitionerTimezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                                currentAvailableHours={{ start: 9, end: 17 }}
                                targetTimezones={bl.form.watch('targetTimezones') || []}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-row items-center space-x-2 p-4 mt-4 border-t border-slate-700/30">
                    <CancelDialogButton />
                    <Button type="submit" className="w-full" disabled={bl.form.formState.isSubmitting}>
                        {bl.form.formState.isSubmitting ? 'Creating...' : 'Create Your Coaching Offer'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default CreateCoaching;

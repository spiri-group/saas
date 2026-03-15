import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React from "react";
import { useRouter, useParams } from "next/navigation";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { escape_key } from "@/lib/functions";
import { Heart, Monitor, MapPin } from "lucide-react";
import QuestionBuilder from "@/components/ux/QuestionBuilder";
import { useCreateHealingOffer } from "./hooks/UseCreateHealingOffer";
import { Label } from "@/components/ui/label";
import { usePractitionerSchedule } from "../../../availability/hooks/UsePractitionerSchedule";
import ServiceScheduleSelector from "@/components/scheduling/ServiceScheduleSelector";
import TargetTimezoneSelector from "@/components/scheduling/TargetTimezoneSelector";
import TimezoneImpactMap from "@/components/scheduling/TimezoneImpactMap";
import SmartSchedulingRecommendations from "@/components/scheduling/SmartSchedulingRecommendations";
import { type ExistingServiceData } from "../CreateReading/hooks/UseCreateReadingOffer";

type BLProps = {
    merchantId: string;
    editingService?: ExistingServiceData;
    onClose?: () => void;
}

const useBL = (props: BLProps) => {
    const router = useRouter();
    const params = useParams();
    const merchant_slug = params.merchant_slug as string;
    const practitioner_slug = params.practitioner_slug as string;
    const { form, mutation, isEditing } = useCreateHealingOffer(props.merchantId, props.editingService);
    const schedule = usePractitionerSchedule(props.merchantId);
    const inPersonEnabled = schedule.data?.deliveryMethods?.atPractitionerLocation?.enabled === true;

    return {
        form,
        isEditing,
        inPersonEnabled,
        schedule,
        mutation,
        submit: async (values: any) => {
            await mutation.mutateAsync(values);
            if (props.onClose) {
                props.onClose();
            } else {
                escape_key();
                const servicesPath = merchant_slug
                    ? `/m/${merchant_slug}/manage/services`
                    : `/p/${practitioner_slug}/manage/services`;
                router.push(servicesPath);
            }
        }
    };
}

type Props = BLProps & {}

const CreateHealing: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col h-full">
                <DialogHeader className="flex flex-row items-center space-x-2 p-4">
                    <div className="flex-none w-[45px] h-[45px] flex items-center justify-center rounded-xl bg-green-200">
                        <Heart className="h-6 w-6 text-green-600" />
                    </div>
                    <DialogTitle>{bl.isEditing ? 'Edit Your Healing Offer' : 'Create Your Healing Offer'}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                    <FormField
                        name="name"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Service Name *</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g., 60-Minute Reiki Session" />
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
                                        This is a live session
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        Tick this if you&apos;ll meet with the client in real time (video call or in person)
                                    </p>
                                </div>
                            </FormItem>
                        )}
                    />

                    {bl.form.watch('requiresConsultation') && (
                        <>
                            <FormField
                                name="consultationType"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Where will you meet?</FormLabel>
                                        <div className="flex gap-2" data-testid="consultation-type-tabs">
                                            <Button
                                                type="button"
                                                variant={field.value === 'ONLINE' ? 'default' : 'outline'}
                                                className={field.value === 'ONLINE'
                                                    ? 'flex-1 bg-purple-600 hover:bg-purple-700 text-white'
                                                    : 'flex-1'
                                                }
                                                onClick={() => field.onChange('ONLINE')}
                                                data-testid="consultation-type-online"
                                            >
                                                <Monitor className="w-4 h-4 mr-2" />
                                                Online
                                            </Button>
                                            {bl.inPersonEnabled && (
                                                <Button
                                                    type="button"
                                                    variant={field.value === 'IN_PERSON' ? 'default' : 'outline'}
                                                    className={field.value === 'IN_PERSON'
                                                        ? 'flex-1 bg-purple-600 hover:bg-purple-700 text-white'
                                                        : 'flex-1'
                                                    }
                                                    onClick={() => field.onChange('IN_PERSON')}
                                                    data-testid="consultation-type-inperson"
                                                >
                                                    <MapPin className="w-4 h-4 mr-2" />
                                                    In Person
                                                </Button>
                                            )}
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <ServiceScheduleSelector
                                weekdays={bl.schedule.data?.weekdays || []}
                                value={bl.form.watch('scheduleConfig')}
                                onChange={(config) => bl.form.setValue('scheduleConfig', config)}
                                consultationType={bl.form.watch('consultationType')}
                            />
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            name="healingType"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Healing Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Reiki">Reiki</SelectItem>
                                            <SelectItem value="Energy Healing">Energy Healing</SelectItem>
                                            <SelectItem value="Sound Healing">Sound Healing</SelectItem>
                                            <SelectItem value="Crystal Healing">Crystal Healing</SelectItem>
                                            <SelectItem value="Intuitive Healing">Intuitive Healing</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />

                        <FormField
                            name="modality"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modality (optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g., Usui Reiki, Shamanic" />
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
                                        <FormLabel>How will you share it?</FormLabel>
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
                                        <FormLabel>Deliver within (days)</FormLabel>
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
                                name="includeEnergyReport"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Energy report PDF</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                name="includeFollowUp"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Follow-up session</FormLabel>
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

                    <QuestionBuilder
                        dark
                        control={bl.form.control}
                        name="questionnaire"
                    />
                </div>

                <div className="flex flex-row items-center space-x-2 p-4 mt-4 border-t border-slate-700/30">
                    <CancelDialogButton />
                    <Button type="submit" className="w-full" disabled={bl.form.formState.isSubmitting || bl.mutation.isPending}>
                        {bl.form.formState.isSubmitting || bl.mutation.isPending
                            ? (bl.isEditing ? 'Saving...' : 'Creating...')
                            : (bl.isEditing ? 'Save Changes' : 'Create Your Healing Offer')
                        }
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default CreateHealing;

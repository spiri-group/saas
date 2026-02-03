'use client'

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, MapPin, Clock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
    FeaturingRelationship,
    FeaturingScheduleWeekday,
    FeaturingServicePriceOverride,
} from "../hooks/UseFeaturingRelationships"
import {
    useConfigureFeaturingSchedule,
    useConfigureFeaturingPricing,
    useConfigureFeaturingDelivery
} from "../hooks/UseFeaturingMutations"

type Props = {
    relationship: FeaturingRelationship | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    merchantId: string;
    practitionerServices?: { id: string; name: string; price?: { amount: number; currency: string } }[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const defaultWeekdays: FeaturingScheduleWeekday[] = DAY_NAMES.map((name, i) => ({
    day: i,
    dayName: name,
    enabled: i >= 1 && i <= 5, // Mon-Fri default
    timeSlots: [{ start: "09:00", end: "17:00" }]
}))

const ScheduleTab = ({
    relationship,
    merchantId
}: {
    relationship: FeaturingRelationship;
    merchantId: string;
}) => {
    const configSchedule = useConfigureFeaturingSchedule(merchantId)

    const existingSchedule = relationship.storeSchedule
    const [scheduleMode, setScheduleMode] = useState<"PRACTITIONER_DEFAULT" | "STORE_SPECIFIC">(
        existingSchedule?.scheduleMode || "PRACTITIONER_DEFAULT"
    )
    const [weekdays, setWeekdays] = useState<FeaturingScheduleWeekday[]>(
        existingSchedule?.weekdays || defaultWeekdays
    )
    const [timezone] = useState(
        existingSchedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    )

    const toggleDay = (dayIndex: number) => {
        setWeekdays(prev => prev.map(d =>
            d.day === dayIndex ? { ...d, enabled: !d.enabled } : d
        ))
    }

    const updateTimeSlot = (dayIndex: number, slotIndex: number, field: "start" | "end", value: string) => {
        setWeekdays(prev => prev.map(d => {
            if (d.day !== dayIndex) return d
            const newSlots = [...d.timeSlots]
            newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
            return { ...d, timeSlots: newSlots }
        }))
    }

    const addTimeSlot = (dayIndex: number) => {
        setWeekdays(prev => prev.map(d => {
            if (d.day !== dayIndex) return d
            return { ...d, timeSlots: [...d.timeSlots, { start: "09:00", end: "17:00" }] }
        }))
    }

    const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
        setWeekdays(prev => prev.map(d => {
            if (d.day !== dayIndex) return d
            return { ...d, timeSlots: d.timeSlots.filter((_, i) => i !== slotIndex) }
        }))
    }

    const handleSave = async () => {
        try {
            const result = await configSchedule.mutateAsync({
                relationshipId: relationship.id,
                storeSchedule: {
                    scheduleMode,
                    timezone,
                    weekdays: scheduleMode === "STORE_SPECIFIC" ? weekdays : undefined,
                }
            })
            if (result.success) {
                toast.success("Schedule configured successfully")
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error("Failed to configure schedule")
        }
    }

    return (
        <div className="space-y-4" data-testid="featuring-config-schedule">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-white">Schedule Mode</Label>
                    <p className="text-xs text-slate-400 mt-1">
                        Use the practitioner&apos;s own schedule or set store-specific hours
                    </p>
                </div>
                <Select value={scheduleMode} onValueChange={(v) => setScheduleMode(v as typeof scheduleMode)}>
                    <SelectTrigger className="w-52 bg-slate-800 border-slate-700" data-testid="schedule-mode-select">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PRACTITIONER_DEFAULT">Practitioner&apos;s Schedule</SelectItem>
                        <SelectItem value="STORE_SPECIFIC">Store-Specific Hours</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {scheduleMode === "STORE_SPECIFIC" && (
                <div className="space-y-3 border border-slate-700 rounded-lg p-4">
                    <Label className="text-white text-sm">Weekly Schedule</Label>
                    {weekdays.map((day) => (
                        <div key={day.day} className="flex items-start gap-3">
                            <div className="flex items-center gap-2 w-32 pt-1.5">
                                <Switch
                                    checked={day.enabled}
                                    onCheckedChange={() => toggleDay(day.day)}
                                    data-testid={`day-toggle-${day.day}`}
                                />
                                <span className={`text-sm ${day.enabled ? "text-white" : "text-slate-500"}`}>
                                    {day.dayName.slice(0, 3)}
                                </span>
                            </div>
                            {day.enabled && (
                                <div className="flex-1 space-y-1">
                                    {day.timeSlots.map((slot, si) => (
                                        <div key={si} className="flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={slot.start}
                                                onChange={(e) => updateTimeSlot(day.day, si, "start", e.target.value)}
                                                className="w-28 bg-slate-800 border-slate-700 text-white text-sm"
                                                data-testid={`time-start-${day.day}-${si}`}
                                            />
                                            <span className="text-slate-400 text-xs">to</span>
                                            <Input
                                                type="time"
                                                value={slot.end}
                                                onChange={(e) => updateTimeSlot(day.day, si, "end", e.target.value)}
                                                className="w-28 bg-slate-800 border-slate-700 text-white text-sm"
                                                data-testid={`time-end-${day.day}-${si}`}
                                            />
                                            {day.timeSlots.length > 1 && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 h-8 w-8 p-0"
                                                    onClick={() => removeTimeSlot(day.day, si)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-amber-400 text-xs h-6"
                                        onClick={() => addTimeSlot(day.day)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add slot
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Button
                className="bg-amber-600 hover:bg-amber-700 w-full"
                onClick={handleSave}
                disabled={configSchedule.isPending}
                data-testid="save-schedule-btn"
            >
                {configSchedule.isPending ? "Saving..." : "Save Schedule"}
            </Button>
        </div>
    )
}

const PricingTab = ({
    relationship,
    merchantId,
    practitionerServices
}: {
    relationship: FeaturingRelationship;
    merchantId: string;
    practitionerServices?: { id: string; name: string; price?: { amount: number; currency: string } }[];
}) => {
    const configPricing = useConfigureFeaturingPricing(merchantId)

    const [overrides, setOverrides] = useState<FeaturingServicePriceOverride[]>(
        relationship.servicePriceOverrides || []
    )

    const services = practitionerServices || []

    const getOverride = (serviceId: string) => overrides.find(o => o.serviceId === serviceId)

    const toggleOverride = (service: { id: string; name: string; price?: { amount: number; currency: string } }) => {
        const existing = getOverride(service.id)
        if (existing) {
            setOverrides(prev => prev.filter(o => o.serviceId !== service.id))
        } else {
            setOverrides(prev => [...prev, {
                serviceId: service.id,
                serviceName: service.name,
                overrideType: "FIXED" as const,
                fixedPrice: service.price || { amount: 0, currency: "USD" },
            }])
        }
    }

    const updateOverridePrice = (serviceId: string, amount: number) => {
        setOverrides(prev => prev.map(o =>
            o.serviceId === serviceId ? { ...o, fixedPrice: { amount, currency: o.fixedPrice?.currency || "USD" } } : o
        ))
    }

    const handleSave = async () => {
        try {
            const result = await configPricing.mutateAsync({
                relationshipId: relationship.id,
                servicePriceOverrides: overrides
            })
            if (result.success) {
                toast.success("Pricing configured successfully")
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error("Failed to configure pricing")
        }
    }

    const formatPrice = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100)
    }

    return (
        <div className="space-y-4" data-testid="featuring-config-pricing">
            <div>
                <Label className="text-white">Service Price Overrides</Label>
                <p className="text-xs text-slate-400 mt-1">
                    Set custom prices for services when offered at your store
                </p>
            </div>

            {services.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                    No services available for this practitioner
                </div>
            ) : (
                <div className="space-y-2">
                    {services.map((service) => {
                        const override = getOverride(service.id)
                        const hasOverride = !!override
                        return (
                            <div
                                key={service.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50"
                                data-testid={`service-price-row-${service.id}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Switch
                                        checked={hasOverride}
                                        onCheckedChange={() => toggleOverride(service)}
                                        data-testid={`price-override-toggle-${service.id}`}
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm text-white truncate">{service.name}</p>
                                        <p className="text-xs text-slate-400">
                                            Standard: {service.price ? formatPrice(service.price.amount, service.price.currency) : "Not set"}
                                        </p>
                                    </div>
                                </div>
                                {hasOverride && (
                                    <div className="flex items-center gap-2 ml-3">
                                        <Label className="text-xs text-slate-400">Override:</Label>
                                        <Input
                                            type="number"
                                            value={((override?.fixedPrice?.amount || 0) / 100).toFixed(2)}
                                            onChange={(e) => updateOverridePrice(service.id, Math.round(parseFloat(e.target.value || "0") * 100))}
                                            className="w-24 bg-slate-800 border-slate-700 text-white text-sm"
                                            step="0.01"
                                            min="0"
                                            data-testid={`price-override-input-${service.id}`}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Button
                className="bg-amber-600 hover:bg-amber-700 w-full"
                onClick={handleSave}
                disabled={configPricing.isPending}
                data-testid="save-pricing-btn"
            >
                {configPricing.isPending ? "Saving..." : "Save Pricing"}
            </Button>
        </div>
    )
}

const DeliveryTab = ({
    relationship,
    merchantId
}: {
    relationship: FeaturingRelationship;
    merchantId: string;
}) => {
    const configDelivery = useConfigureFeaturingDelivery(merchantId)

    const [inStore, setInStore] = useState(relationship.deliveryContext?.inStore ?? true)
    const [online, setOnline] = useState(relationship.deliveryContext?.online ?? false)

    const handleSave = async () => {
        try {
            const result = await configDelivery.mutateAsync({
                relationshipId: relationship.id,
                deliveryContext: { inStore, online }
            })
            if (result.success) {
                toast.success("Delivery settings configured successfully")
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error("Failed to configure delivery settings")
        }
    }

    return (
        <div className="space-y-4" data-testid="featuring-config-delivery">
            <div>
                <Label className="text-white">Delivery Options</Label>
                <p className="text-xs text-slate-400 mt-1">
                    How this practitioner delivers services at your store
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-400" />
                        <div>
                            <p className="text-sm text-white">In-Store</p>
                            <p className="text-xs text-slate-400">Services provided at your physical location</p>
                        </div>
                    </div>
                    <Switch
                        checked={inStore}
                        onCheckedChange={setInStore}
                        data-testid="delivery-in-store-toggle"
                    />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <div>
                            <p className="text-sm text-white">Online</p>
                            <p className="text-xs text-slate-400">Services delivered remotely / virtually</p>
                        </div>
                    </div>
                    <Switch
                        checked={online}
                        onCheckedChange={setOnline}
                        data-testid="delivery-online-toggle"
                    />
                </div>
            </div>

            <Button
                className="bg-amber-600 hover:bg-amber-700 w-full"
                onClick={handleSave}
                disabled={configDelivery.isPending}
                data-testid="save-delivery-btn"
            >
                {configDelivery.isPending ? "Saving..." : "Save Delivery Settings"}
            </Button>
        </div>
    )
}

const FeaturingConfigDialog: React.FC<Props> = ({
    relationship,
    open,
    onOpenChange,
    merchantId,
    practitionerServices
}) => {
    if (!relationship) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        Configure {relationship.practitionerName}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="schedule" className="w-full">
                    <TabsList className="bg-slate-800 w-full">
                        <TabsTrigger
                            value="schedule"
                            className="flex-1 text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            data-testid="config-tab-schedule"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule
                        </TabsTrigger>
                        <TabsTrigger
                            value="pricing"
                            className="flex-1 text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            data-testid="config-tab-pricing"
                        >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Pricing
                        </TabsTrigger>
                        <TabsTrigger
                            value="delivery"
                            className="flex-1 text-white data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                            data-testid="config-tab-delivery"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Delivery
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="schedule" className="mt-4">
                        <ScheduleTab relationship={relationship} merchantId={merchantId} />
                    </TabsContent>

                    <TabsContent value="pricing" className="mt-4">
                        <PricingTab
                            relationship={relationship}
                            merchantId={merchantId}
                            practitionerServices={practitionerServices}
                        />
                    </TabsContent>

                    <TabsContent value="delivery" className="mt-4">
                        <DeliveryTab relationship={relationship} merchantId={merchantId} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

export default FeaturingConfigDialog

'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar, MapPin, Monitor } from 'lucide-react';
import type { PractitionerWeekday } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/availability/hooks/UsePractitionerSchedule';

export type ScheduleConfig = {
    useAllSlots: boolean;
    selectedSlotIds: string[];
    bufferMinutes: number;
};

type Props = {
    weekdays: PractitionerWeekday[];
    value: ScheduleConfig;
    onChange: (config: ScheduleConfig) => void;
    consultationType?: 'ONLINE' | 'IN_PERSON';
    dark?: boolean;
};

const DAY_LABELS: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
};

const ServiceScheduleSelector: React.FC<Props> = ({
    weekdays,
    value,
    onChange,
    consultationType,
    dark,
}) => {
    const filteredWeekdays = weekdays
        .filter(d => d.enabled && d.timeSlots.length > 0)
        .map(day => {
            if (consultationType === 'IN_PERSON') {
                return {
                    ...day,
                    timeSlots: day.timeSlots.filter(slot => slot.location != null),
                };
            }
            return day;
        })
        .filter(d => d.timeSlots.length > 0);

    const allSlotIds = filteredWeekdays.flatMap(d => d.timeSlots.map(s => s.id));

    const toggleSlot = (slotId: string) => {
        const current = value.selectedSlotIds;
        const next = current.includes(slotId)
            ? current.filter(id => id !== slotId)
            : [...current, slotId];
        onChange({ ...value, selectedSlotIds: next });
    };

    const toggleDay = (day: PractitionerWeekday) => {
        const daySlotIds = day.timeSlots.map(s => s.id);
        const allSelected = daySlotIds.every(id => value.selectedSlotIds.includes(id));
        const current = value.selectedSlotIds;

        if (allSelected) {
            onChange({ ...value, selectedSlotIds: current.filter(id => !daySlotIds.includes(id)) });
        } else {
            const merged = [...new Set([...current, ...daySlotIds])];
            onChange({ ...value, selectedSlotIds: merged });
        }
    };

    if (filteredWeekdays.length === 0) {
        return (
            <div className={`rounded-lg border border-dashed p-6 text-center ${dark ? 'border-slate-600' : 'border-gray-300'}`}>
                <Calendar className={`h-8 w-8 mx-auto mb-3 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-700'}`}>
                    You haven&apos;t set up your availability yet
                </p>
                <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {consultationType === 'IN_PERSON'
                        ? 'You don&apos;t have any in-person time slots. Go to your Availability page to add them first.'
                        : 'Go to your Availability page to set up your weekly schedule first.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Use All Times Toggle */}
            <div className={`flex items-center justify-between rounded-lg border p-4 ${
                dark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
                <div className="space-y-1">
                    <Label className={`text-base font-medium ${dark ? 'text-white' : ''}`}>
                        Use all my available times
                    </Label>
                    <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Clients can book any time you&apos;re free on your schedule
                    </p>
                </div>
                <Switch
                    checked={value.useAllSlots}
                    onCheckedChange={(checked) => {
                        onChange({
                            ...value,
                            useAllSlots: checked,
                            selectedSlotIds: checked ? [] : allSlotIds,
                        });
                    }}
                    data-testid="use-all-slots-toggle"
                />
            </div>

            {/* Per-slot selection */}
            {!value.useAllSlots && (
                <div className="space-y-3">
                    <p className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                        Pick the times you want to offer this service:
                    </p>
                    {filteredWeekdays.map(day => {
                        const daySlotIds = day.timeSlots.map(s => s.id);
                        const allDaySelected = daySlotIds.every(id => value.selectedSlotIds.includes(id));
                        const someDaySelected = daySlotIds.some(id => value.selectedSlotIds.includes(id));

                        return (
                            <div
                                key={day.day}
                                className={`rounded-lg border p-3 ${
                                    dark ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200'
                                }`}
                            >
                                {/* Day header with select-all */}
                                <div className="flex items-center gap-3 mb-2">
                                    <Checkbox
                                        dark={dark}
                                        checked={allDaySelected ? true : someDaySelected ? 'indeterminate' : false}
                                        onCheckedChange={() => toggleDay(day)}
                                        data-testid={`day-toggle-${day.day}`}
                                    />
                                    <span className={`font-medium text-sm ${dark ? 'text-white' : ''}`}>
                                        {DAY_LABELS[day.day] || day.dayName}
                                    </span>
                                </div>

                                {/* Time slots */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
                                    {day.timeSlots.map(slot => {
                                        const isSelected = value.selectedSlotIds.includes(slot.id);
                                        return (
                                            <label
                                                key={slot.id}
                                                className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? dark
                                                            ? 'border-purple-500/50 bg-purple-900/20'
                                                            : 'border-purple-300 bg-purple-50'
                                                        : dark
                                                            ? 'border-slate-700 hover:border-slate-600'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                                data-testid={`slot-${slot.id}`}
                                            >
                                                <Checkbox
                                                    dark={dark}
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSlot(slot.id)}
                                                />
                                                <Clock className={`h-3.5 w-3.5 flex-shrink-0 ${dark ? 'text-slate-400' : 'text-gray-400'}`} />
                                                <span className={`text-sm ${dark ? 'text-slate-200' : ''}`}>
                                                    {slot.start} – {slot.end}
                                                </span>
                                                {slot.location ? (
                                                    <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0 ml-auto" />
                                                ) : (
                                                    <Monitor className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 ml-auto" />
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Buffer time */}
            <div className={`flex items-center gap-4 rounded-lg border p-4 ${
                dark ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
                <Clock className={`h-5 w-5 flex-shrink-0 ${dark ? 'text-slate-400' : 'text-gray-400'}`} />
                <div className="flex-1 space-y-1">
                    <Label className={dark ? 'text-white' : ''}>
                        Break between bookings
                    </Label>
                    <p className={`text-xs ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                        How long you need to rest before your next session
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        dark={dark}
                        type="number"
                        min={0}
                        max={60}
                        step={5}
                        value={value.bufferMinutes}
                        onChange={e => onChange({ ...value, bufferMinutes: parseInt(e.target.value) || 0 })}
                        className="text-center"
                        data-testid="service-buffer-minutes"
                    />
                    <span className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>min</span>
                </div>
            </div>
        </div>
    );
};

export default ServiceScheduleSelector;

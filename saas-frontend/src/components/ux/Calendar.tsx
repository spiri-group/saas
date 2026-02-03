import { DateTime } from "luxon";
import { useState } from "react";
import { ControllerRenderProps } from "react-hook-form";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import React from "react";

type Props = ControllerRenderProps<{
    [key: string]: string | string[] | undefined
}, string> & {
    "aria-label"?: string,
    selectMode: "single" | "multiple";
    initialMonth?: DateTime,
    onSelect?: (date: DateTime) => void
    dayProfiles?: DayProfile[]
    showText?: boolean
}

export type DayProfile = {
    date: DateTime,
    available: boolean,
    className?: string,
    text?: React.ReactNode[]
}

// a custom calendar component that allows the user to select one or more dates
const Calendar: React.FC<Props> = ({showText=false, ...props}) => {

    const [currentMonth, setCurrentMonth] = useState<DateTime>(DateTime.now());
    const selectedDates = props.value != undefined ? (props.selectMode == "single" ? [props.value as string] : props.value as string[]) : [];
    
    // adjust dates to make sure it starts on a monday and contains 42 days
    const dates : (DateTime | null)[] = []
    const firstDay = currentMonth.startOf('month').weekday;
    const lastDay = currentMonth.endOf('month').weekday;
    if (firstDay != 1) {
        for (let i = 1; i < firstDay; i++) {
            dates.unshift(null);
        }
    }

    if (currentMonth.daysInMonth == null) throw new Error("daysInMonth is null")

    for(let i = 0; i < currentMonth.daysInMonth; i++) {
        dates.push(currentMonth.startOf('month').plus({days: i}))
    }
    if (lastDay != 7) {
        for (let i = 0; i < 7 - lastDay; i++) {
            dates.push(null);
        }
    }

    // iterate through the dates and put rows of 6 dates in a table
    const rows : (DateTime | null)[][] = [];
    for (let i = 0; i < dates.length; i+=7) {
        rows.push(dates.slice(i, i+7));
    }

    const height = !showText ? "aspect-square justify-center" : "min-h-[50px]"

    return (
        <div className="flex flex-col w-full items-center justify-center">
            <div className="flex flex-row items-center justify-between w-full mb-2">
                <Button variant="link" className="cursor-pointer text-sm" onClick={() => {
                    setCurrentMonth(currentMonth.minus({months: 1}))
                }}>Prev</Button>
                <span className="font-bold">{currentMonth.monthLong} {currentMonth.year}</span>
                <Button variant="link" className="cursor-pointer text-sm" onClick={() => {
                    setCurrentMonth(currentMonth.plus({months: 1}))
                }}>Next</Button>
            </div>
            <div className="grid grid-cols-7 w-full">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <div className={`text-center text-sm aspect-video m-1`} key={index}>{day}</div>
                ))}
            </div>
            {rows.map((row, weekIndex) => {
                return (
                    <div className="grid grid-cols-7 w-full" key={row[0]?.toISODate() ?? weekIndex}>
                        {row.map((date, dayIndex) => {
                            if (date == null) {
                                return (
                                    <div 
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={`${height} m-1`}></div>
                                )
                            } else {
                                const isSelected = selectedDates == null ? false : selectedDates.find(d => d == date.toISO()) != null;
                                const profile = props.dayProfiles == null ? undefined : props.dayProfiles.find(a => a.date.toISODate() == date.toISODate());
                                const isSelectable = props.dayProfiles == null ? true : (profile == null ? false : profile.available);
                                const profileTextLength = profile?.text?.length ?? 0;

                                return (
                                    <div
                                        aria-label={`${props["aria-label"]}-date-${date.toISODate()}`}
                                        key={`${weekIndex}-${dayIndex}`}
                                        data-date={date.toISODate()}
                                        onClick={() => {
                                        if (!isSelectable) return;

                                        if (props.selectMode == "single") {
                                            if (isSelected && selectedDates != null) {
                                                props.onChange(undefined)
                                            } else {
                                                props.onChange(date.toISO())
                                            }
                                        } else {
                                            if (isSelected && selectedDates != null) {
                                                props.onChange(selectedDates.filter(d => d != date.toISO()))
                                            } else {
                                                props.onChange([...(selectedDates ?? []), date.toISO()])
                                            }
                                        }
                                        if (props.onSelect) {
                                            props.onSelect(date);
                                        }
                                    }} className={cn(
                                        `m-1 ${height} rounded-lg flex flex-col items-center`, 
                                        isSelected ? "bg-accent text-white" : "hover:bg-accent hover:bg-opacity-20",
                                        isSelectable ? "cursor-pointer" : "cursor-not-allowed text-gray-400"
                                        )}>
                                        <div className={cn("text-center text-sm mt-1", profile && profile.className ? profile.className : "")}>{date.day}</div>
                                        {showText && profile != null && profile.text != null ? 
                                            <div className="text-xs overflow-hidden">
                                                {profile.text.map((text, index) => (
                                                    <React.Fragment key={index}>
                                                        {text}
                                                        {index < profileTextLength - 1 ? <span>, </span> : null}
                                                    </React.Fragment>
                                                ))}
                                            </div> : null}
                                    </div>
                                )
                            }
                        })}
                    </div>
                )
            })}
        </div>
    )
}

export default Calendar;
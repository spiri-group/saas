import { isNullOrWhitespace } from "@/lib/functions";
import { DateTime } from "luxon";
import React from "react";
import { ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { Input } from "../ui/input";

export type TimeRangeSchema = z.infer<typeof TimeRangeSchema>;

export const TimeRangeSchema = z.object({
    start: z.string(),
    end: z.string(),
    duration_ms: z.coerce.number()
}).refine((ctx) => {
    if (isNullOrWhitespace(ctx.start) || isNullOrWhitespace(ctx.end)) return false;
    const startDt = DateTime.fromFormat(ctx.start, "HH:mm")
    const endDt = DateTime.fromFormat(ctx.end, "HH:mm")
    return startDt <= endDt 
}, "Start time must be before end time")

type Props = ControllerRenderProps<{
    [key: string]: TimeRangeSchema
}, any> & {
}


const TimeRangeInput: React.FC<Props> = (props) => {
    
    return (
        <div className="flex flex-col">
            <Input 
                type="time"
                value={props.value.start} 
                onChange={(e) => {
                    props.onChange({
                        ...props.value,
                        start: e.target.value,
                        duration_ms: isNullOrWhitespace(e.target.value) || isNullOrWhitespace(props.value.end)
                            ? undefined : 
                            DateTime.fromISO(e.target.value).diff(DateTime.fromISO(props.value.end), "milliseconds")
                    })
                }} /> 
            <Input 
                type="time" 
                value={props.value.end} 
                onChange={(e) => {
                    props.onChange({
                        ...props.value,
                        end: e.target.value,
                        duration_ms: isNullOrWhitespace(props.value.start) || isNullOrWhitespace(e.target.value)
                            ? undefined : 
                            DateTime.fromISO(props.value.start).diff(DateTime.fromISO(e.target.value), "milliseconds")
                    })
                }} />
        </div>
    )
}

export default TimeRangeInput
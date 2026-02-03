'use client'

import { DateTime } from "luxon";
import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation";
import UseSessionsSummary from "./hooks/UseSessionsSummary";
import YearVisualizer from "@/components/ux/YearVisualizer";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";


const useBL = () => {
    const params = useParams();
    const router = useRouter();

    const [from, ] = useState<DateTime>(DateTime.local());
    const [to, ] = useState<DateTime>(DateTime.local().plus({ months: 6 }));
    const {data, isLoading, isRefetching} = UseSessionsSummary(from, to, params == null ? undefined : params.merchantId as string);

    return {
        router,
        merchantId: params != null && params.merchantId != null ? params.merchantId : null,
        from, to,
        sessions: {
            isLoading: isLoading || isRefetching,
            get: data ?? []
        }
    }
}

type Props = {
    thresholds: Record<number, { color: string }>
}

const SessionsSummaryComponent : React.FC<Props> = (props) => {
    const bl = useBL();

    // Convert keys to sorted array of numbers
    const sortedKeys = Object.keys(props.thresholds).map(parseFloat).sort((a, b) => a - b);

    // Generate percentage ranges
    const percentageRanges = sortedKeys.map((key, index) => {
        // Start of the current range
        const start = key * 100;
        // End of the current range, default to 100 for the last item
        const end = index < sortedKeys.length - 1 ? (sortedKeys[index + 1] * 100) - 1 : 100;
        return `${start}% - ${end}%`;
    });    

    return ( 
        <div className="w-full flex flex-col items-center justify-center p-2">
            <div className="flex flex-row items-center justify-between w-full mb-2">
                <h2 className="text-xs">Timeline (each row Mon - Sun)</h2>
                <span className="text-xs">Higlighted by attendance rate</span>
                <HoverCard>
                    <HoverCardTrigger className="text-xs">
                        what do the colours mean?
                    </HoverCardTrigger>
                    <HoverCardContent className={`grid grid-rows-${sortedKeys.length} gap-2`}>
                    <div className="flex flex-col items-center space-y-2">
                        {sortedKeys.map((key, index) => {
                            const threshold = props.thresholds[key];
                            // Assuming the keys are 0, 1, 2, etc., and directly map to the ranges defined above
                            const rangeText = percentageRanges[index] || 'Unknown range'; // Fallback in case the key is not found
                            return (
                            <div key={key} className="flex flex-row items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full bg-${threshold.color}`}></div> {/* Fixed className interpolation */}
                                <span>{rangeText}</span>
                            </div>
                            )
                        })}
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </div>
            <YearVisualizer  
                startDate={bl.from.startOf('month')} 
                endDate={bl.to.endOf('month')} 
                filledDates={bl.sessions.get.map((s) => ({
                    date: DateTime.fromISO(s.date),
                    value: s.attendanceRate
                }))}
                loading={bl.sessions.isLoading}
                indicatorThresholds={props.thresholds} />
        </div>
    )
}

export default SessionsSummaryComponent;
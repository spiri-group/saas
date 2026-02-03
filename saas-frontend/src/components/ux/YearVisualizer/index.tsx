import React from 'react';
import { DateTime } from 'luxon';
import { groupBy } from '@/lib/functions';

interface YearVisualizerProps {
    startDate: DateTime;
    endDate: DateTime;
    loading?: boolean;
    filledDates: {
        date: DateTime,
        value: number
    }[],
    indicatorThresholds?: {
        [key: number]: {
            color: string;
        };
    }
    onDateRangeSelected?: (startOfWeek: DateTime, endOfWeek: DateTime) => void;
}

const YearVisualizer: React.FC<YearVisualizerProps> = ({
    startDate,
    endDate,
    filledDates,
    indicatorThresholds,
    onDateRangeSelected,
    loading = false
}) => {
    // Calculate the number of days between the start and end dates
    const numDays = endDate.diff(startDate, 'days').days + 1;

    // Generate an array of dates for the entire time range
    const allDates = Array.from({ length: numDays }, (_, index) =>
        startDate.plus({ days: index })
    );

    // group by the month
    const groupedByMonth = groupBy(allDates, (date) => date.month);
    const groupedByMonthAndWeek = new Map<number, Map<number, DateTime<boolean>[]>>();
    // now for each month we want to group the child dates by week
    Array.from(groupedByMonth.keys()).forEach((month) => {
        const monthDates = groupedByMonth.get(month) as DateTime[];
        const groupedByWeek = groupBy(monthDates, (date) => date.weekNumber);
        groupedByMonthAndWeek.set(month, groupedByWeek);
    });

    return (
        <div className="w-full grid grid-cols-7 gap-2">
            {Array.from(groupedByMonthAndWeek.keys()).map((month) => {
                const weeks = groupedByMonthAndWeek.get(month);
                if (weeks == undefined) return null;

                return (
                    <div key={month} className="flex flex-col space-y-1">
                        <h3>{DateTime.fromObject({ month }).monthLong}</h3>
                        {Array.from(weeks.keys()).map((week) => {
                            const weekDates = weeks.get(week) as DateTime[];
                            // we need to work out how many squares we need to place empty at the front if the first date is not a monday
                            const firstDate = weekDates[0];
                            const numEmpty = firstDate.weekday - 1;
                            // add the empty squares
                            for (let i = 0; i < numEmpty; i++) {
                                weekDates.unshift(firstDate.minus({ days: i + 1 }));
                            }
                            
                            // we need to do the same for the end of the week, if it doesn't end on a sunday
                            const lastDate = weekDates[weekDates.length - 1];
                            const numEmptyEnd = 7 - lastDate.weekday;
                            // add the empty squares
                            for (let i = 0; i < numEmptyEnd; i++) {
                                weekDates.push(lastDate.plus({ days: i + 1 }));
                            }

                            return (
                                <div key={week} 
                                    onClick={() => {
                                        if (onDateRangeSelected) {
                                            onDateRangeSelected(weekDates[0], weekDates[weekDates.length - 1]);
                                        }
                                    }}
                                    className="hover:border hover:border-slate-300 hover:p-1 grid grid-cols-7 gap-1">
                                    {weekDates.map((date) => {
                                        let fillColor = "bg-white";
                                        
                                        const isEmpty = date.month !== month;
                                        if (isEmpty) fillColor = ""
                                        else {
                                            if (filledDates.find((d) => d.date.toISODate() === date.toISODate())) {
                                                const value = filledDates.find((d) => d.date.toISODate() === date.toISODate())?.value;
                                                if (value !== undefined) {
                                                    const threshold = Object.keys(indicatorThresholds ?? {}).find((key) => value >= parseInt(key));
                                                    if (threshold !== undefined) {
                                                        fillColor = `bg-${indicatorThresholds?.[parseInt(threshold)].color}`;
                                                    }
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={date.toISODate()}
                                                className={`aspect-square flex items-center justify-center ${loading ? "animate-pulse" : ""} ${fillColor} `}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default YearVisualizer;

import { DateTime } from "luxon";
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import Calendar, { DayProfile } from "./Calendar"
import { ControllerRenderProps } from "react-hook-form";
import { cn } from "@/lib/utils";
import { escape_key } from "@/lib/functions";

type Props = ControllerRenderProps<{
    [key: string]: string | string[] | undefined
}, string> & {
    selectMode: "single" | "multiple";
    onSelect?: (date: DateTime) => void
    dayProfiles?: DayProfile[]
}

const CalendarDropdown : React.FC<Props> = (props) => {
    
    let label = "dd/mm/yyyy"
    if (props.value != undefined && props.value !== "") {
        if (props.selectMode == "single") {
            const dateTime = DateTime.fromISO(props.value as string);
            label = dateTime.isValid ? dateTime.toLocaleString(DateTime.DATE_FULL) : "Invalid date"
        } else {
            if ((props.value as string[]).length == 0) {
                label = "Select"
            } else if ((props.value as string[]).length == 1) {
                const dateTime = DateTime.fromISO((props.value as string[])[0]);
                label = dateTime.isValid ? dateTime.toLocaleString(DateTime.DATE_FULL) : "Invalid date"
            } else {
                label = (props.value as string[]).length + " dates"
            }
        }
    }

    return (
        <Popover>
            <PopoverTrigger className="w-full h-10"> 
                <Button type="button" variant="outline" className={cn("w-full text-xs md:text-base lg:text-base cursor-text", props.value ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] text-xs md:text-base lg:text-base"> 
                <Calendar
                    aria-label="calendar-bookTour"
                    {...props} 
                    onSelect={(date) => {
                        if (props.onSelect) props.onSelect(date)
                        escape_key()
                    }}
                    dayProfiles={props.dayProfiles}
                /> 
            </PopoverContent>
        </Popover>
    )
}

export default CalendarDropdown
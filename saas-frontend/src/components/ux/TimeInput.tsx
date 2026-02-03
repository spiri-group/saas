
import { useEffect, useState } from "react"
import { Input, InputProps } from "../ui/input"
import { DateTime } from "luxon"
import { ControllerRenderProps } from "react-hook-form"
import { isNullOrWhitespace } from "@/lib/functions"

type Props = 
    InputProps &
    ControllerRenderProps<{
        [key: string]: string
    }, string> &
{
}

/**
 * This component is a wrapper around the HTML5 time input
 * It returns a ISO string of the time
 * @param props 
 * @returns 
 */
const TimeInput: React.FC<Props> = ({...props}) => {
    if (!isNullOrWhitespace(props.value) && !DateTime.fromISO(props.value).isValid) throw new Error("Invalid ISO time string provided as props")

    const [time, setTime] = useState<string>(!isNullOrWhitespace(props.value) ? 
        DateTime.fromISO(props.value).toFormat("HH:mm") : DateTime.now().toFormat("HH:mm"))
    
    useEffect(() => {
        const parsedTime = DateTime.fromFormat(time, "HH:mm")
        props.onChange(parsedTime.toISOTime())
    }, [time, props])

    return (
        <Input {...props} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
    )
}

export default TimeInput
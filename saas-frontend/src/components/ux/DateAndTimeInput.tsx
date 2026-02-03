import { useEffect, useState } from "react"
import { ControllerRenderProps } from "react-hook-form"
import { DateTime } from "luxon"
import { Input, InputProps } from "../ui/input"

/**
 * @typedef {Object} Props
 * @property {string} [className] - The CSS class name for the component.
 * @property {React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>} [dateProps] - The props for the date input element.
 * @property {React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>} [timeProps] - The props for the time input element.
 */
type Props = ControllerRenderProps<{
    [key: string]: Date
}, any> & {
    dateProps?: InputProps,
    timeProps?: InputProps
}

/**
 * A custom input component for selecting date and time.
 * @component
 * @param {Props} props - The component props.
 * @returns {JSX.Element} A date and time HTML input component
 */
const DateAndTimeInput: React.FC<Props> = (props) => {
    const [date, setDate] = useState<string>(props.value != undefined ? DateTime.fromJSDate(props.value).toISODate() as string : DateTime.now().toISODate())
    const [time, setTime] = useState<string>(props.value != undefined ? DateTime.fromJSDate(props.value).toFormat("HH:mm") : DateTime.now().toFormat("HH:mm"))

    useEffect(() => {
        const parsedtime = DateTime.fromISO(time)
        const unifiedDate = DateTime.fromISO(date).set({
            hour: parsedtime.hour,
            minute: parsedtime.minute,
            second: parsedtime.second,
            millisecond: parsedtime.millisecond
        })
        props.onChange(unifiedDate.toISO())
    }, [props, date, time])

    return (
        <>
            <Input {...props.dateProps} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input {...props.timeProps} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </>
    )
}

export default DateAndTimeInput
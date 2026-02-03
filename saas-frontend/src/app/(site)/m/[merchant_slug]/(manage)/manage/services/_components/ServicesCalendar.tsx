
import UseServicesCalendar from "../hooks/UseServicesCalendar";
import { DateTime, Duration } from "luxon";
import { useEffect, useRef } from "react";

//TODO: change the color (?)

type BLProps = {
    gql_conn: gql_conn_type,
    merchantId: string,
    totalHeight: number,
    startDt: DateTime,
    endDt: DateTime
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const servicesCalendar = UseServicesCalendar(props.merchantId, props.startDt, props.endDt, undefined);

    return {
        servicesCalendar: {
            get: servicesCalendar.data
        },
        hourPx: 50,
        numberOfDates: servicesCalendar.data != null ? servicesCalendar.data.length : 0
    }
}

const ServicesCalendar: React.FC<Props> = (props) => {
    const bl = useBL(props)

    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current) {
            ref.current.scrollTop = 400;
        }        
    }, [])

    return (
        <div className="flex flex-col">
            <div  className={`flex flex-row w-12`} style={{ marginLeft: 50 }}>
                {bl.servicesCalendar.get != null && bl.servicesCalendar.get.map((day) => {
                    return (
                        <span key={day.date} className="flex-none" style={{width: 170}}>{day.date}</span>
                    )
                })}
            </div>
            <div ref={ref} className={`flex flex-row w-full h-[400px] overflow-y-scroll`}>
                <div className="flex flex-col">
                    {
                        Array.from({ length: 24 }, (_, hour) => DateTime.utc().set({ hour, minute: 0 }).toFormat("HH:mm")).map((time_string) => (
                            <div key={time_string} className="flex-none" style={{height: bl.hourPx, width: 50 }}>
                                {time_string}
                            </div>
                        ))
                    }
                </div>
                {bl.servicesCalendar.get != null && bl.servicesCalendar.get.map((day) => {
                    return (
                        <div key={day.date} className={`relative`} style={{ height: (bl.hourPx * 24), width: 170}}>
                            {
                                day.occurences.map((occurence) => {
                                    const startTime = DateTime.fromISO(`1970-01-01T${occurence.time.start}`)
                                    const hourYPx = bl.hourPx * startTime.hour 
                                    const minuteYPx = bl.hourPx * (startTime.minute / 60)
                                    const YPx = hourYPx + minuteYPx

                                    const hours = Duration.fromMillis(occurence.time.duration_ms).as("hours")
                                    const heightPx = bl.hourPx * hours;

                                    return (
                                        <div 
                                            key={day.date + occurence.time.start}
                                            style={{
                                                top: YPx,
                                                height: heightPx
                                            }}
                                            className={`absolute bg-slate-200 rounded-md w-full`} />
                                    )
                                })
                            }
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ServicesCalendar
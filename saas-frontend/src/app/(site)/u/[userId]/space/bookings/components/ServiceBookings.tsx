'use client'

import React from "react"

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DateTime } from "luxon";
import UseServiceBookings from "../hooks/UseServiceBookings";

//TODO: fix this

type BLProps = {
    gql_conn: gql_conn_type,
    userId?: string,
    merchantId?: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    
    const serviceBookings = UseServiceBookings(props.userId, props.merchantId);

    return {
        serviceBookings: {
            get: serviceBookings.data ?? []
        }
    }
}

const ServiceBookings : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <ul className="space-y-2">
            {
                bl.serviceBookings.get.map((serviceBooking) => {
                    return (
                        <li key={serviceBooking.ref.id} className="flex flex-row">
                        <img alt="thumbnail for service" src={serviceBooking.service.thumbnail.image.media.url} className="rounded-sm w-40 h-20 mx-2" />
                            <div className="flex flex-col p-2">
                                <span>{serviceBooking.service.name}</span>
                                <div className="flex flex-row mt-1">
                                    <span>{DateTime.fromISO(serviceBooking.date).toLocaleString(DateTime.DATE_MED)}</span>,<span>{DateTime.fromISO(serviceBooking.time.start).toLocaleString(DateTime.TIME_24_SIMPLE)} - {DateTime.fromISO(serviceBooking.time.end).toLocaleString(DateTime.TIME_24_SIMPLE)}{serviceBooking.service.duration ? ` (${serviceBooking.service.duration.amount})` : ''}</span>
                                </div>
                                {/* <div className="flex flex-row space-x-2">
                                    <span>{serviceBooking.service.location.type}</span>
                                    {serviceBooking.service.location.type === 'in_person' && (
                                        <span>{serviceBooking.service.location.place.formattedAddress}</span>
                                    )}
                                    {serviceBooking.service.location.type === 'online' && (
                                        <div className="flex flex-row">
                                            <Link size={16} />
                                            <span>{serviceBooking.service.location.meeting_link}</span>,
                                            <span>{serviceBooking.service.location.meeting_passcode}</span>
                                        </div>
                                    )}
                                </div> */}
                            </div>
                            <div className=" flex flex-col ml-auto">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="link"> Change Day / Time </Button>
                                    </DialogTrigger>
                                    <DialogContent className="flex flex-col flex-grow h-[550px]">
                                        {/* <UpdateBookingService vendorId={props.vendorId} listingId={props.listingId} gql_conn={props.gql_conn} date={""} time={""} /> */}
                                    </DialogContent>
                                </Dialog>
                                <Button variant="link"> Change location </Button>
                            </div>
                        </li>
                    )   
                })
            }
        </ul>
    )
}

export default ServiceBookings;
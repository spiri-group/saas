'use client'

import React from "react"

import { servicePayment_type, stripe_details_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import CurrencySpan from "@/components/ux/CurrencySpan";

type Props = {
    servicePayment: servicePayment_type,
    setSelectedStripeDetails: (stripeDetails: stripe_details_type) => void
}

const ServicePayment : React.FC<Props> = (props) => {

    return (
        <li className="flex flex-row p-2">
            <div className="flex flex-col w-80">
                <span> {DateTime.fromISO(props.servicePayment.createdDate).toLocaleString(DateTime.DATETIME_MED)} </span>
            </div>
            <div className='ml-8 flex flex-col'>
                <span>{props.servicePayment.service.name}</span>
                <span className="text-sm text-slate-400">Invoice #{props.servicePayment.stripe.invoiceNumber}</span>
            </div>
            <div className="flex flex-row space-x-4 items-center ml-auto">
                <div className="flex flex-col">
                    <span className="text-sm">Fee</span>
                    <CurrencySpan value={props.servicePayment.stripe.totalDue!} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm">Refunded</span>
                    <CurrencySpan value={props.servicePayment.stripe.totalRefunded!} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm">Paid</span>
                    <CurrencySpan value={props.servicePayment.stripe.totalPaid!} />
                </div>
                <div className="w-80" />
            </div>  
        </li>
    )
}

export default ServicePayment;
'use client'

import React from "react"

import { Button } from "@/components/ui/button";
import { casePayment_type, stripe_details_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import CurrencySpan from "@/components/ux/CurrencySpan";

type Props = {
    casePayment: casePayment_type,
    setSelectedStripeDetails: (stripeDetails: stripe_details_type) => void
}

const CasePayment : React.FC<Props> = (props) => {

    return (
        <li className="flex flex-row p-2">
            <div className="flex flex-col w-80">
                <span> {DateTime.fromISO(props.casePayment.createdDate).toLocaleString(DateTime.DATETIME_MED)} </span>
                <span className="text-sm">{props.casePayment.case.location.formattedAddress}</span>  
            </div>
            <div className='ml-8 flex flex-col'>
                <span>{props.casePayment.merchant.name} </span>
                <span className="text-sm text-slate-400">Invoice #{props.casePayment.stripe.invoiceNumber}</span>
            </div>
            <div className="flex flex-row space-x-4 items-center ml-auto">
                <div className="flex flex-col">
                    <span className="text-sm">Fee</span>
                    <CurrencySpan value={props.casePayment.stripe.totalDue!} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm">Refunded</span>
                    <CurrencySpan value={props.casePayment.stripe.totalRefunded!} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm">Paid</span>
                    <CurrencySpan value={props.casePayment.stripe.totalPaid!} />
                </div>
                <div className="flex flex-row w-80 justify-between">
                    <div className="flex flex-col">
                        {/* <InvoiceStatusBadge status={props.casePayment.stripe.invoiceStatus}>{props.casePayment.stripe.invoiceStatus}</InvoiceStatusBadge> */}
                    </div>
                    <Button onClick={() => {props.setSelectedStripeDetails(props.casePayment.stripe)}}>Pay Now</Button>
                </div>
            </div>  
        </li>
    )
}

export default CasePayment;
'use client'

import React, { useState } from "react"

import { Panel } from "@/components/ux/Panel";
import { Elements } from "@stripe/react-stripe-js";
import { DateTime } from "luxon";
import CasePayment from "./components/CasePayment";
import { casePayment_type, servicePayment_type, stripe_details_type } from "@/utils/spiriverse";
import UseCasePayment from "./hooks/UseCasePayments";
import { loadStripe } from "@stripe/stripe-js";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ServicePayment from "./components/ServicePayments";
import UseServicePayment from "./hooks/UseServicePayments";

//TODO: Service payment but on breakpoint it shows

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "");

const useBL = () => {
    const [selectedStripeDetails, setSelectedStripeDetails] = useState<stripe_details_type | null>(null)

    const casePayment = UseCasePayment()
    const servicePayment = UseServicePayment()
    
    const payments = [
        ...(casePayment.data || []),
        ...(servicePayment.data || [])
        ].sort((a, b) => {
        const aDt = DateTime.fromISO(b.createdDate);
        const bDt = DateTime.fromISO(a.createdDate);
        return aDt < bDt ? -1 : aDt > bDt ? 1 : 0;
        }) as (casePayment_type | servicePayment_type)[];

    return {
        payments,
        selectedStripeDetails: {
            get: selectedStripeDetails,
            set: selectedStripeDetails
        },
        setSelectedStripeDetails 
    }
}

const UI : React.FC = () => {
    const bl = useBL()

    return (   
        <Panel className="h-full">
            <h1 className="font-bold text-xl"> All Payments </h1>
            <ul className="divide-y divide-primary">
                {bl.payments.map((payment: any) => {
                if (payment.type === "CaseInvoice") {
                    return (
                        <CasePayment
                            key={payment.id}
                            setSelectedStripeDetails={bl.setSelectedStripeDetails}
                            casePayment={payment as casePayment_type}
                        />
                    )
                } else if (payment.type === "ServiceInvoice") {
                    return (
                        <ServicePayment
                            key={payment.id}
                            setSelectedStripeDetails={bl.setSelectedStripeDetails}
                            servicePayment={payment as servicePayment_type}
                        />
                    )
                } else {
                    return <></>
                }
                })}
            </ul>
            <Dialog open={bl.selectedStripeDetails.get != null} onOpenChange={() => bl.setSelectedStripeDetails(null)}>
                <DialogContent className="flex flex-col"> 
                <h2 className="text-xl mb-2 font-bold">Enter billing information</h2>
                { bl.selectedStripeDetails.get != null ? (
                    <Elements 
                        stripe={stripePromise} 
                        options={{ clientSecret: bl.selectedStripeDetails.get.paymentIntentSecret }}>
                        {/* <CheckoutForm /> */}
                    </Elements>
                ) : <></> }
                </DialogContent>
            </Dialog>
        </Panel>
    )
}

export default UI;
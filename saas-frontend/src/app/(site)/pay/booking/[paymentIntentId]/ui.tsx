'use client'


import { Panel } from "@/components/ux/Panel";
import { AddressElement, Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button";
import UseBookingViaPaymentIntent from "./hooks/UseBookingViaPaymentIntent";


const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "");

const useBL = () => {
    const params = useParams();
    
    const { data } = UseBookingViaPaymentIntent(params?.paymentIntentId as string);

    return {
        ready: data != null,
        client_secret: data?.stripe?.paymentIntentSecret,
        booking: data
    }

}

const UI : React.FC = () => {
    const bl =  useBL();

    if (!bl.ready) return (<></>);

    const CheckoutForm = () => {
        const stripe = useStripe();
        const elements = useElements();

        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <AddressElement options={{ mode: "billing" }} />
                    <PaymentElement />
                </div>
                <Button 
                    className="w-full mt-4"
                    variant="default" 
                    type="submit"
                    onClick={() => {
                        if (elements != null && stripe != null) {
                            stripe.confirmPayment({
                                elements,
                                confirmParams: {
                                    return_url: "https://localhost:3000"
                                }
                            })
                        }
                    }}> 
                    Pay 
                </Button>
            </>
        )
    }

    return (
        <>
            <Panel className="flex-grow ">
                <h2 className="text-xl mb-2 font-bold">Enter billing information</h2>
                {bl.client_secret != null ? 
                    <Elements 
                        stripe={stripePromise} 
                        options={{ clientSecret: bl.client_secret }}>
                        <CheckoutForm />
                    </Elements>: <></>
                }
            </Panel>
        </>
    )
}

export default UI;
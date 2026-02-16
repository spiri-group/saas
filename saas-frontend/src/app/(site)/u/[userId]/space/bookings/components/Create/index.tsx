import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";


const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "");


const useBL = () => {
    const [paymentIntentSecret, setPaymentIntentSecret] = useState<string | null>(null); 

    return {
        paymentIntentSecret: {
            get: paymentIntentSecret,
            set: setPaymentIntentSecret
        }
    }
}

const CreateBooking: React.FC = () => {
    const bl = useBL();

    return bl.paymentIntentSecret.get ? (
        <Elements 
            stripe={stripePromise} 
            options={{ clientSecret: bl.paymentIntentSecret.get }}>
            {/* <CheckoutForm /> */}
        </Elements>
    ): (
    //    <BookServiceComponent 
    //         gql_conn={props.gql_conn}
    //         vendorId={props.vendorId}
    //         listingId={props.listingId}
    //         setPaymentIntentSecret={bl.paymentIntentSecret.set}
    //    /> 
    <></>  
    )

}

export default CreateBooking;
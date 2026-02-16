import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import BookingDetailsComponent from "./components/UpdateBooking";

//TODO: fix this

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "");


type Props = {
    vendorId: string,
    listingId: string,
    gql_conn: gql_conn_type,
    date: string,
    time: string
}

const useBL = () => {
    const [paymentIntentSecret, setPaymentIntentSecret] = useState<string | null>(null); 

    return {
        paymentIntentSecret: {
            get: paymentIntentSecret,
            set: setPaymentIntentSecret
        }
    }
}

const UpdateBooking: React.FC<Props> = (props) => {
    const bl = useBL();

    return bl.paymentIntentSecret.get ? (
        <Elements 
            stripe={stripePromise} 
            options={{ clientSecret: bl.paymentIntentSecret.get }}>
            {/* <CheckoutForm /> */}
        </Elements>
    ) : (
        <BookingDetailsComponent 
            gql_conn={props.gql_conn}
            vendorId={props.vendorId}
            listingId={props.listingId}
            setPaymentIntentSecret={bl.paymentIntentSecret.set}
        />   
    )
}

export default UpdateBooking;
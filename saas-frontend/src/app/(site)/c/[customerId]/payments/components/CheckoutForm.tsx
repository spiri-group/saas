import { Button } from "@/components/ui/button";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { currency_amount_type } from "@/utils/spiriverse";
import { useStripe, useElements, AddressElement, PaymentElement } from "@stripe/react-stripe-js";

type Props = {
    amount: currency_amount_type
}

const CheckoutForm : React.FC<Props> = (props) => {
    const stripe = useStripe();
    const elements = useElements();

    return (
        <div className="p-3">
            <div className="flex flex-row space-x-4">
                <AddressElement options={{ mode: "billing" }} />
                <PaymentElement />
            </div>
            <Button variant="default" 
                className="w-full mt-4"
                type="submit"
                onClick={() => {
                    if (elements != null && stripe != null) {
                        stripe.confirmPayment({
                            elements,
                            confirmParams: {
                                return_url: "http://localhost:3000/c/9b5e34a4-68b9-4e0b-bfe1-de1dd54677e6/payments"
                            }
                        })
                    }
                }}> 
                <span className="mr-1">Pay</span>
                <CurrencySpan value={props.amount} withAnimation={false} />
            </Button>
        </div>
    )
}

export default CheckoutForm
import UseCancelBooking from "../hooks/UseCancelBooking";
import { FormField, Form } from "@/components/ui/form";
import UseServiceBookingStripe from "../hooks/UseServiceBookingStripe";
import RichTextInput from "@/components/ux/RichTextInput"
import { Button } from "@/components/ui/button";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { escape_key } from "@/lib/functions";

type BLProps = {
    bookingId: string,
    userId: string,
    type: string
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {

    const stripeInfo =  UseServiceBookingStripe(props.bookingId, props.userId)
    const cancelBooking = UseCancelBooking(props.bookingId, props.userId, props.type)

    return {
        ready: stripeInfo.data != null,
        form: cancelBooking.form,
        values: cancelBooking.form.getValues(),
        submit: async () => {
            escape_key()
        }
    }
}

const CancelBookingForm : React.FC<Props> = (props) => {
    const bl = useBL(props);

    if (bl.ready === false) return (<></>)

    return (
        <>
             <Form {...bl.form}> 
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col">
                    <FormField
                        name="notes"
                        control={bl.form.control}
                        render={({field}) => (
                        <RichTextInput 
                            className="h-[120px] w-[350px]"
                            {...field}
                            maxWords={1000}
                            label={"Notes"} 
                            placeholder="Tell us why you want to cancel this booking" />
                    )} />
                  {/* <RefundDropdown gql_conn={props.gql_conn} > */}
                  <div className="flex flex-row space-x-2">
                    <CancelDialogButton />
                    <Button type="submit" className="w-full">Confirm</Button>
                </div> 
                </form>
            </Form>
        </>
    )
  }
  
  export default CancelBookingForm;
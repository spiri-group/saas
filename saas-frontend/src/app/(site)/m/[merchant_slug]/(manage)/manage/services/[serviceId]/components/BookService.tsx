import React, { useState } from "react";
import { Form } from "@/components/ui/form";
import { stripe_details_type } from "@/utils/spiriverse";
import { DayProfile } from "@/components/ux/Calendar";
import { DateTime } from "luxon";
import UseCreateBookingService from "../hooks/UseCreateServiceBooking";
import UseServicesCalendar from "../../hooks/UseServicesCalendar";
import { Button } from "@/components/ui/button";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import StripePayment from "../../../../../../../components/StripePayment";
import { DialogHeader } from "@/components/ui/dialog";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";

type BLProps = {
  vendorId: string
  serviceId: string
  //setPaymentIntentSecret: (secret: string) => void
}

const useBL = (props: BLProps) => {
    
    const { form } = UseCreateBookingService(props.vendorId, props.serviceId)
    const [selectedStripeDetails, setSelectedStripeDetails] = useState<stripe_details_type | null>(null)
    const [selectedDate, setSelectedDate] = useState<DateTime | null>(null)
    const startDt = DateTime.now().startOf('month')
    const endDt = DateTime.now().endOf('month')
    
    const serviceCalendar = UseServicesCalendar(props.vendorId, startDt, endDt, undefined);

    const selectedCalendarEntry = serviceCalendar.data != null && form.getValues().date != null ?
        serviceCalendar.data.find(x => x.date === DateTime.fromISO(form.getValues().date).toISODate()) : undefined
        
    return {
        form,
        values: form.getValues(),
        setSelectedStripeDetails,
        selectedDate,
        setSelectedDate,
        // save: async (values: bookingsServiceFormType) => {
        //     var resp = await mutation.mutateAsync(values);
        //     props.setPaymentIntentSecret(resp.stripe.paymentIntentSecret);
        //     form.reset();
        //     document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        // },
        availableDays: serviceCalendar.data != null ? serviceCalendar.data.map((item) => ({
            date: DateTime.fromISO(item.date) as DateTime,
            available: item.occurences.length > 0
        }) as DayProfile) : [],
        availableTimes: selectedCalendarEntry != undefined ? selectedCalendarEntry.occurences.flatMap(x => ({ label: DateTime.fromISO(x.time.start).toFormat("hh:mm a"), ...x.time})) : [],
        selectedStripeDetails: {
            get: selectedStripeDetails,
            set: selectedStripeDetails
        }
    }
}

type Props = BLProps & {
    
}

// const BookingServiceSummary: React.FC<{ selectedDate: string, selectedTime: {start: string, end: string, duration_ms: number} }> = (props) => {
//     if(props.selectedDate == null || props.selectedTime == null) return null
    
//     const SummaryContainer: React.FC<{ children?: any }> = (props) => (
//         <div>
//             <h2> Summary </h2>
//             <div className="w-full p-2 overflow-y-auto">
//                 {props.children}
//             </div>
//         </div>
//     )
  
//     return (
//       <SummaryContainer>
//         <p className="text-wrap w-64">Your booking is for {DateTime.fromISO(props.selectedDate).toLocaleString()}, starting at {DateTime.fromISO(props.selectedTime.start).toFormat("hh:mm a")}, going for {Duration.fromMillis(props.selectedTime.duration_ms).as("hours")} hours.</p>
//       </SummaryContainer>
//     )
// }

const BookService: React.FC<Props> = (props) => {
    const bl = useBL(props);
    const { formState: { isValid } } = bl.form;

    return (
        <>
        <Form {...bl.form}>
                <form className="flex flex-col h-full flex-grow">
                    <Panel id="bookservice" className="flex flex-col flex-grow">
                        <PanelHeader className="flex flex-row">
                            <PanelTitle className="font-bold">Book service</PanelTitle>
                        </PanelHeader>
                        <PanelContent className="flex flex-col flex-grow">
                            {/* <FormField
                            name="date"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Calendar
                                            {...field}
                                            selectMode="single"
                                            dayProfiles={bl.availableDays}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                            />
                            {bl.values.date != undefined && (
                                <FormField
                                    name="time"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <TimeComboBox
                                                    {...field}
                                                    items={bl.availableTimes}
                                                    objectName="time"
                                                    fieldMapping={{
                                                        keyColumn: "start",
                                                        labelColumn: "label"
                                                    }}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            )}
                            {bl.values.time != undefined && (
                                <div className="flex flex-col space-y-2">
                                    <LocationSelector gql_conn={props.gql_conn} merchantId={props.vendorId} scheduleId={""} />
                                    <FormField
                                        name="notes"
                                        render={({field}) => (
                                            <RichTextInput 
                                                label="Notes"
                                                maxWords={500}
                                                {...field} 
                                                className="w-[300px] h-[100px]" />
                                        )} />
                                </div>
                            )} */}
                            <div className="mt-auto">
                                <Button 
                                    disabled={!isValid} 
                                    type="submit" 
                                    className="w-full"> Confirm and pay  </Button>
                            </div>
                        </PanelContent>
                    </Panel>
                </form>
            </Form>
            <Dialog open={bl.selectedStripeDetails.get != null}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter billing information</DialogTitle>
                    </DialogHeader>
                    {bl.selectedStripeDetails.get != null &&
                        <div className="flex flex-row">
                            <StripePayment
                                type="SETUP"
                                onCancel={() => {}}
                                onAlter={() => {}}
                                stripeAccountId={bl.selectedStripeDetails.get.accountId}
                                clientSecret={bl.selectedStripeDetails.get.setupIntentSecret}
                            />
                        </div>
                    }
                </DialogContent>
            </Dialog>
        </>
  )
}

export default BookService;
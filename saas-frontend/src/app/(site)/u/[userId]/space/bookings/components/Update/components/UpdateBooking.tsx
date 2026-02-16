import React, { useEffect, useState } from "react";

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { stripe_details_type } from "@/utils/spiriverse";
import Calendar, { DayProfile } from "@/components/ux/Calendar";
import { DateTime, Duration } from "luxon";
import { Button } from "@/components/ui/button";
import UseUpdateBookingService, { bookingsServiceFormType } from "../hooks/UseUpdateBooking";
import ComboBox from "@/components/ux/ComboBox";
import UseServicesCalendar from "@/app/(site)/m/[merchant_slug]/(manage)/manage/services/hooks/UseServicesCalendar";

type BLProps = {
  gql_conn: gql_conn_type;
  vendorId: string;
  listingId: string;
  setPaymentIntentSecret: (secret: string) => void;
}

const useBL = (props: BLProps) => {
    
    const { form, mutation } = UseUpdateBookingService(props.vendorId, props.listingId)
    const [selectedStripeDetails, setSelectedStripeDetails] = useState<stripe_details_type | null>(null);
    const [startDt, ] = useState<DateTime>(DateTime.fromISO("2024-02-01"))
    const [endDt, ] = useState<DateTime>(DateTime.fromISO("2024-02-29"))

    const serviceCalendar = UseServicesCalendar(props.vendorId, startDt, endDt, [props.listingId])

    const selectedCalenderEntry = serviceCalendar.data != null && form.getValues().date != null ?
        serviceCalendar.data.find(x => x.date == DateTime.fromISO(form.getValues().date).toISODate()) : undefined

    return {
        form,
        values: form.getValues(),
        save: async (values: bookingsServiceFormType) => {
            const resp = await mutation.mutateAsync(values);
            props.setPaymentIntentSecret(resp.stripe.paymentIntentSecret);
            form.reset();
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        },
        availableDays: serviceCalendar.data != null ? serviceCalendar.data.map((item) => ({
          date: DateTime.fromISO(item.date) as DateTime
        }) as DayProfile) : [],
        availableTimes: selectedCalenderEntry != undefined ? selectedCalenderEntry.occurences.flatMap(x => ({ label: DateTime.fromISO(x.time.start).toFormat("hh:mm a"), ...x.time})) : [],
        selectedStripeDetails: {
            get: selectedStripeDetails,
            set: selectedStripeDetails,
        },
        setSelectedStripeDetails
    }
}

type Props = BLProps & {
    
}

const BookingServiceSummary: React.FC<{ selectedDate: string, selectedTime: {start: string, end: string, duration_ms: number} }> = (props) => {
    if(props.selectedDate == null || props.selectedTime == null) return null
    
    const SummaryContainer: React.FC<{ children?: any }> = (props) => (
        <div>
            <h2> Summary </h2>
            <div className="w-full p-2 overflow-y-auto">
                {props.children}
            </div>
        </div>
    )
  
    return (
      <SummaryContainer>
        <p className="text-wrap w-64">Your booking is for {DateTime.fromISO(props.selectedDate).toLocaleString()}, starting at {DateTime.fromISO(props.selectedTime.start).toFormat("hh:mm a")}, going for {Duration.fromMillis(props.selectedTime.duration_ms).as("hours")} hours.</p>
      </SummaryContainer>
    )
}

const BookingDetailsComponent: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const [showTime, setShowTime] = useState(false)
    const [isTimeSelected, setIsTimeSelected] = useState(false)
  
    useEffect(() => {
      const dateValue = bl.form.getValues("date");
      const timeValue = bl.form.getValues("time");
  
      if (dateValue && timeValue) {
        bl.form.setValue("date", dateValue)
        bl.form.setValue("time", timeValue)
        setShowTime(true)
        setIsTimeSelected(true)
      }
    }, [bl.form])
  
    const selectedDate = () => {
      bl.setSelectedStripeDetails(null)
      setShowTime(true)
    }
  
    const selectedTime = (time: { start: string; end: string; duration_ms: number }) => {
      bl.form.setValue("time", time)
      setIsTimeSelected(true)
    }
  
    return (
      <div className="flex flex-col items-center justify-center">
        <Form {...bl.form}>
          <form className="flex flex-col space-y-2 " onSubmit={bl.form.handleSubmit(bl.save)}>
            <FormField
              name="date"
              control={bl.form.control}
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormControl>
                      <Calendar
                        selectMode="single"
                        {...field}
                        dayProfiles={bl.availableDays}
                        onSelect={selectedDate}
                      />
                    </FormControl>
                  </FormItem>
                )
              }}
            />
            {showTime && (
              <FormField
                name="time"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <ComboBox
                          {...field}
                          items={bl.availableTimes}
                          objectName="time"
                          fieldMapping={{
                            keyColumn: "start",
                            labelColumn: "label",
                          }}
                          onChange={selectedTime}
                        />
                      </FormControl>
                    </FormItem>
                  )
                }}
              />
            )}
            {isTimeSelected && (
              <div className="mt-2">
                <BookingServiceSummary selectedDate={bl.form.getValues("date")} selectedTime={bl.form.getValues("time")} />
                <Button type="submit" className="mt-auto w-full"> Confirm and Pay</Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    )
}
  
export default BookingDetailsComponent;
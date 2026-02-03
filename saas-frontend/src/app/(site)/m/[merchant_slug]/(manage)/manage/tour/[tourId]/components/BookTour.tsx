// import React, { useEffect, useState } from "react";

// import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
// import { session_type, stripe_details_type } from "@/utils/spiriverse";
// import { DateTime } from "luxon";
// import { Button } from "@/components/ui/button";
// import UseCreateTourBooking, { bookingTourFormType } from "../hooks/UseCreateTourBooking";
// import { Input } from "@/components/ui/input";
// import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
// import CalendarDropdown from "@/components/ux/CalendarDropdown";
// import TicketSelectionComponent from "./TicketSelection";
// import StripePayment from "@/app/components/StripePayment";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { DayProfile } from "@/components/ux/Calendar";
// import UseSessions from "../../../EventsAndTours/components/Sessions/hooks/UseSessions";
// import UseMe from "@/app/components/SignedIn_archived/hooks/UseMe";
// import { cn } from "@/lib/utils";
// import { escape_key } from "@/lib/functions";

// type BLProps = {
//   gql_conn: gql_conn_type,
//   vendorId: string,
//   tourId: string
// }

// const useBL = (props: BLProps) => {
    
//     const { form, mutation } = UseCreateTourBooking(props.gql_conn, props.vendorId, props.tourId)
//     const me = UseMe(props.gql_conn);

//     const [selectedStripeDetails, setSelectedStripeDetails] = useState<stripe_details_type | null>(null);
//     const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
//     const [showCalendar, setShowCalendar] = useState(false);
    
//     useEffect(() => {
//         if (me.data != undefined) {
//             // i'm logged in
//             form.setValue("email", me.data.email)
//         }
//     }, [me])

//     // make the initial date range the current month
//     const startDt = DateTime.now().startOf('month')
//     const endDt = DateTime.now().endOf('month')
    
//     const sessions = UseSessions(props.gql_conn, startDt, endDt, props.vendorId, props.tourId)
//     // now we need to convert sesions to day profiles
//     // we'll need to group by date
    
//     let dateProfiles = [] as DayProfile[]
//     if (sessions.data != undefined) {
        
//         const sessionsGrouped = sessions.data.reduce((acc, session) => {
//             const date = DateTime.fromISO(session.date).toISODate() as string
//             if (acc[date] == undefined) {
//                 acc[date] = []
//             }
//             acc[date].push(session)
//             return acc
//         }, {} as {[key: string]: session_type[]})

//         dateProfiles = Object.keys(sessionsGrouped).map((date) => {
//             return {
//                 date: DateTime.fromISO(date) as DateTime,
//                 available: true,
//                 className: sessionsGrouped[date].every((session) => session.bookings.length < session.capacity.max) ? "text-green-800 font-bold" : "text-red-600",
//                 text: sessionsGrouped[date].map((session) => {
//                     return <span key={session.id} className={session.bookings.length < session.capacity.max ? "text-green-500" : "text-red-500"}>{DateTime.fromISO(session.time.start).toFormat('ha')}</span>
//                 })
//             } as DayProfile
//         })
//     }

//     return {
//         form,
//         values: form.getValues(),
//         save: async (values: bookingTourFormType) => {
//             var resp = await mutation.mutateAsync(values)
//             setSelectedStripeDetails(resp.order.stripe)
//             form.reset()
//             escape_key()
//         },
//         selectedStripeDetails: {
//             get: selectedStripeDetails,
//             set: setSelectedStripeDetails,
//         },
//         me,
//         showCalendar,
//         setShowCalendar,
//         selectedDate,
//         setSelectedDate,
//         dateProfiles
//     }
// }

// type Props = BLProps & {
    
// }

// const BookTour: React.FC<Props> = (props) => {
//     const bl = useBL(props)
//     const { formState: { isValid }, control } = bl.form;

//     return (
//         <>
//             <Form {...bl.form}>
//                 <form autoComplete="off" className="flex flex-col h-full flex-grow" onSubmit={bl.form.handleSubmit(bl.save)}>
//                     <Panel id="booktour" className="flex flex-col flex-grow">
//                         <PanelHeader className="flex flex-row">
//                             <h1 className="font-bold text-sm md:text-2xl lg:text-2xl">Book tour</h1>
//                             <div className="ml-auto mt-2 md:mt-0 flex flex-row space-x-3 md:flex-col md:space-x-0 md:space-y-2 xl:flex-row xl:space-x-3 xl:space-y-0 items-center">
//                                 <FormField
//                                     name="people"
//                                     control={control}
//                                     render={({ field }) => (
//                                         <FormItem className="flex flex-row space-y-0 space-x-2 items-center flex-grow">
//                                             <FormLabel className="w-auto text-xs md:text-base lg:text-base"> People </FormLabel>
//                                             <FormControl>
//                                                 <Input aria-label="input-tourBooking-people" className="w-[130px] md:w-40" type="number" {...field} />
//                                             </FormControl>
//                                         </FormItem>
//                                     )}
//                                 />
//                                 <FormField
//                                     name="date"
//                                     control={control}
//                                     render={({ field }) => (
//                                         <FormItem className="flex-grow space-y-0 md:w-full">
//                                             <FormControl>
//                                                 <CalendarDropdown 
//                                                     selectMode="single"
//                                                     dayProfiles={bl.dateProfiles}
//                                                     {...field} />
//                                             </FormControl>
//                                         </FormItem>
//                                     )}
//                                 />
//                             </div>
//                         </PanelHeader>
//                         <PanelContent className={cn("flex flex-col flex-grow")}>
//                             {bl.values.date != undefined && bl.values.people > 0 ?
//                                 <div className="flex flex-col space-y-2">
//                                     {/* <FormLabel className="mt-2 text-xs md:text-base lg:text-base"> Select Tickets </FormLabel> */}
//                                     <TicketSelectionComponent
//                                         form={bl.form}
//                                         gql_conn={props.gql_conn}
//                                         date={bl.values.date}
//                                         ticketsRequired={bl.values.people}
//                                         tourId={props.tourId}
//                                         merchantId={props.vendorId}
//                                     />
//                                 </div> : <div className="h-[145px]" />
//                             }
//                             <div className="flex flex-row space-x-3 mt-auto">
//                                 { !bl.me.isLoading && bl.me.data == undefined ?
//                                     <FormField  
//                                         name="email"
//                                         control={control}
//                                         render={({ field }) => (
//                                             <FormItem className="flex flex-row space-x-3 mt-auto items-center flex-none w-60">
//                                                 <FormControl>
//                                                     <Input placeholder="email address" type="email" {...field} />
//                                                 </FormControl>
//                                             </FormItem>
//                                         )}
//                                     /> : <></> }
//                                 <Button 
//                                     aria-label="button-buyTicketSelection"
//                                     disabled={!isValid}
//                                     className={"flex-grow"}
//                                     type="submit"> Buy ticket selection </Button>
//                             </div>
//                         </PanelContent>
//                     </Panel>
//                 </form>
//             </Form>
//             <Dialog open={bl.selectedStripeDetails.get != null}>
//                 <DialogContent>
//                     <DialogHeader>
//                         <DialogTitle>Enter billing information</DialogTitle>
//                     </DialogHeader>
//                     {bl.selectedStripeDetails.get != null &&
//                         <div className="flex flex-row">
//                             <StripePayment
//                                 type="SETUP"
//                                 stripeDetails={bl.selectedStripeDetails.get} />
//                         </div>
//                     }
//                 </DialogContent>
//             </Dialog>
//         </>
//     )
// }

// export default BookTour;

export default function BookTour() {
    return (
        <div>
            BookTour
        </div>
    )
}
'use client';

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Panel, PanelHeader, PanelContent } from "@/components/ux/Panel";
import React, { useEffect } from "react"
import { UseFormReturn } from "react-hook-form"
import ChooseActivityAndTicketList from "./components/ChooseActivityAndTicketList";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import Calendar from "@/components/ux/Calendar";
import { tour_type } from "@/utils/spiriverse";
import { DateTime } from "luxon"
import { useParams, useSearchParams } from "next/navigation";
import UseMerchantTour from "../../hooks/UseMerchantTour";
import UseMerchantTours from "../../hooks/UseMerchantTours";
import UseScheduleSession, { formSchemaType } from "./hooks/UseScheduleSession";
import { Input } from "@/components/ui/input";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import ComboBox from "@/components/ux/ComboBox";

type BLProps = {
    vendorId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const {form, mutation, values} = UseScheduleSession(props.vendorId);

    const params = useSearchParams();

    useEffect(() => {
        // we need to watch for when they change the listing as this should rerender the form
        form.watch("listing")
    }, [form])

    const merchantTours = UseMerchantTours(props.vendorId);

    useEffect(() => {
        if (params != null && params.has("listingId") != null) {
            if (merchantTours.data != null) {
                const tour = merchantTours.data.find((tour) => tour.id == params.get("listingId"))
                if (tour != null) {
                    form.setValue("listing", tour)
                }
            }
        }
    }, [merchantTours.data, form, params])

    const selectedListingId = values.listing != undefined ? values.listing.id : undefined;
    const tourQuery = UseMerchantTour(props.vendorId, selectedListingId);

    useEffect(() => {
        if (tourQuery.data != null) {
            // if the tour has only 1 activity list, then we can set it as the default
            if (tourQuery.data.activityLists.length == 1) {
                form.setValue("schedule.activityList", tourQuery.data.activityLists[0])
            }
            // Note: ticketLists has been replaced with ticketVariants in the new schema
            // This auto-selection is no longer applicable for variants
        }
    }, [tourQuery.data, form, params])

    const form_values = form.getValues()

    return {
        listings: {
            get: merchantTours.data,
            selected: tourQuery.data
        },
        selectedActivityList:
            form_values.schedule.activityList != null && tourQuery.data != null
                ? tourQuery.data.activityLists.find(x => x.id == form_values.schedule.activityList.id) : null,
        selectedTicketList: null, // TODO: Update to work with ticketVariants instead of ticketLists
        form,
        values: form.getValues(),
        save: async (values: formSchemaType) => {
            await mutation.mutateAsync(values);
            form.reset();
        }
    }
}

const Summary: React.FC<{ selectedTour: tour_type | null, form: UseFormReturn<formSchemaType>}> = (props) => {

    useEffect(() => {
        props.form.watch();
    }, [props.form])

    const SummaryContainer:React.FC<{children?: any}> = (props) => (
        <div className="mt-2 flex-grow">
            <FormLabel> Summary </FormLabel>
            <div className="flex-grow w-full p-2 overflow-y-auto">
                {props.children}
            </div>
        </div>
    )

    const values = props.form.getValues()

    if (props.selectedTour == null || values.schedule.ticketList == null) return <SummaryContainer />;
    
    const selectedActivityList = props.selectedTour.activityLists.find((activityList) => activityList.id === values.schedule.activityList.id)
    if (selectedActivityList == null) throw new Error("Activity list not found")

    const fromActivity = selectedActivityList.activities[0]
    const toActivity = selectedActivityList.activities[selectedActivityList.activities.length - 1]
    const fromTime = DateTime.fromISO(fromActivity.time)
    const toTime = DateTime.fromISO(toActivity.time)
    const selectedTourDuration = toTime.diff(fromTime, ["hours", "minutes"]).toObject()

    return (
        <SummaryContainer>
            { values.schedule.dates != null && values.schedule.dates.length > 0 ? (
                <p className="text-left">{props.selectedTour.name} will operate for {values.schedule.dates.length} date{values.schedule.dates.length > 1 ? "s" : ""}. Guests will undertake a {selectedTourDuration.hours == 1 ? `${selectedTourDuration.hours} hour` : `${selectedTourDuration.hours} hours` } {selectedTourDuration.minutes != 0 && `${selectedTourDuration.minutes} min`} journey, starting at {selectedActivityList.activities[0].name} ({selectedActivityList.activities[0].location.formattedAddress}) from {fromTime.toLocaleString(DateTime.TIME_SIMPLE)} and ending at {toTime.toLocaleString(DateTime.TIME_SIMPLE)}.</p>
            ) : (
                <p className="text-slate-400 font-normal">Please select date first.</p>
            )}
        </SummaryContainer>
    )
}

const CreateScheduleComponent: React.FC<Props> = (props) => {
    const params = useParams();
    if (params == null || params.merchantId == null) throw new Error("No merchantId provided in URL");

    const bl = useBL({
        ...props,
        vendorId: params.merchantId as string
    })

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.save)} className="flex flex-col space-y-2 h-full">
            <Panel className="flex flex-col md:w-[350px] md:h-full" data-testid="schedule-dates-panel">
                <PanelHeader>Schedule dates</PanelHeader>
                <PanelContent className="flex-grow flex flex-col space-y-2">
                <FormField
                    name="listing"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormControl>
                                    <ComboBox
                                        {...field}
                                        aria-label={"combobox-schedule-tour"}
                                        items={ bl.listings.get != null ? bl.listings.get.map((tour) => ({ id: tour.id, name: tour.name })) : []}
                                        objectName="Tour"
                                        fieldMapping={{
                                            keyColumn: "id",
                                            labelColumn: "name"
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )
                    }} />
                <div className="flex-grow hidden md:flex flex-col">
                { bl.listings.selected != null && (
                    <>
                        <div className="flex-grow">
                            <FormField
                                name="schedule.capacity"
                                control={bl.form.control}
                                render={({field}) => {
                                    return (
                                        <FormItem>
                                            <FormLabel> People capacity for each date </FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )
                                }} />
                            <Summary form={bl.form} selectedTour={bl.listings.selected} />
                            <FormField
                                name="schedule.dates"
                                control={bl.form.control}
                                render={({field}) => {
                                    return (
                                        <FormItem className="my-2">
                                            <FormControl>
                                            <Calendar
                                                selectMode="multiple"
                                                {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )
                                }} />
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="mt-2 w-full" variant="default">
                                        { bl.selectedActivityList != null ?
                                            `${bl.selectedActivityList.name}` :  `Select activity list`}
                                    </Button>
                                </DialogTrigger>
                                <ChooseActivityAndTicketList
                                        form={bl.form}
                                        activityListOptions={bl.listings.selected == null ? [] : bl.listings.selected.activityLists}
                                        ticketListOptions={[]}
                                        className="w-[870px] h-[600px] flex flex-col"
                                    />
                            </Dialog>
                        </div>
                        <div className="grid grid-cols-2 mt-2 space-x-2">
                            <Button variant="default" aria-label="button-schedule-reset">Reset</Button>
                            <Button type="submit" variant="default" aria-label="button-schedule-save">Save</Button>
                        </div>
                    </>
                )}
                </div>
                <div className="block md:hidden">
                    <Dialog>
                        <DialogTrigger className="w-full" asChild>
                            <Button variant="default" className="w-full"> Schedule session </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full h-full flex flex-col">
                            <Summary form={bl.form} selectedTour={bl.listings.selected ?? null} />
                            <FormField
                            name="schedule.dates"
                            control={bl.form.control}
                            render={({field}) => {
                                return (
                                    <FormItem>
                                        <FormControl>
                                        <Calendar
                                            selectMode="multiple"
                                            {...field} />
                                        </FormControl>
                                    </FormItem>
                                )
                            }} />
                            <FormField
                            name="schedule.capacity"
                            control={bl.form.control}
                            render={({field}) => {
                                return (
                                    <FormItem>
                                        <FormLabel> Capacity </FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )
                            }} />
                            <div className="grid grid-cols-2 space-x-2">
                                <CancelDialogButton />
                                <Button type="submit" variant="default"> Save </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                </PanelContent>
            </Panel>
            </form>
        </Form>
    )
}

export default CreateScheduleComponent
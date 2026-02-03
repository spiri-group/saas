import { DialogContent, DialogDescription, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import { activityList_type, ticketList_type } from "@/utils/spiriverse"
import { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormControl } from "@/components/ui/form"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { z } from "zod"
import { formSchemaType } from "../hooks/UseScheduleSession"
import ComboBox from "@/components/ux/ComboBox"

type BLProps = {
    form: UseFormReturn<formSchemaType>,
    activityListOptions: activityList_type[],
    ticketListOptions: ticketList_type[]
}

export const selectedTicketListSchema  = z.object({
    id: z.string().uuid(),
    name: z.string()
})

export const selectedActivityListSchema = z.object({
    id: z.string().uuid(),
    name: z.string()
})

const useBL = (props: BLProps) => {

    useEffect(() => {
        props.form.watch("schedule.activityList");
    }, [props.form])

    return {
        activityLists: props.activityListOptions.map((activityList) => ({ id: activityList.id, name: activityList.name })),
        ticketLists: props.ticketListOptions.map(x => ({id: x.id, name: x.name}))
    }
}

type Props = BLProps & {
    className?: string
}

const ChooseActivityAndTicketList: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (props.activityListOptions == null) return null;

    return (
        <>
        <DialogContent>
            <DialogHeader className="mb-2">Choose activity list / ticket list</DialogHeader>
            <DialogDescription>Select and update the tickets and activity list for this tour.</DialogDescription>
            <div className="grid grid-cols-2 space-x-2 w-full">
                <FormField 
                name="schedule.activityList"
                control={props.form.control}
                render={({field}) => {
                    return (
                        <FormItem>
                            <FormControl>
                                <ComboBox
                                    {...field}
                                    items={bl.activityLists}
                                    aria-label={"combobox-schedule-activityList"}
                                    objectName="Activity List"
                                    fieldMapping={{
                                        keyColumn: "id",
                                        labelColumn: "name"
                                    }}
                                />
                            </FormControl>
                        </FormItem>
                    )
                }} />
                <FormField 
                    name="schedule.ticketList"
                    control={props.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormControl>
                                    <ComboBox
                                        {...field}
                                        items={bl.ticketLists ?? []}
                                        aria-label={"combobox-schedule-ticketList"}
                                        objectName="Ticket List"
                                        fieldMapping={{
                                            keyColumn: "id",
                                            labelColumn: "name"
                                        }} />
                                </FormControl>
                            </FormItem>
                        )
                }} />
            </div>
            <DialogTrigger asChild>
                <Button variant="default" aria-label={"button-ticketAndActivityList-confirm"}>Confirm</Button>
            </DialogTrigger>
        </DialogContent>
        </>
    )
}

export default ChooseActivityAndTicketList;
import { DialogContent, DialogDescription, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import { activityList_type } from "@/utils/spiriverse"
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
}

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
            <DialogHeader className="mb-2">Choose Itinerary</DialogHeader>
            <DialogDescription>Select which itinerary to use for scheduled sessions.</DialogDescription>
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
                                    objectName="Itinerary"
                                    fieldMapping={{
                                        keyColumn: "id",
                                        labelColumn: "name"
                                    }}
                                />
                            </FormControl>
                        </FormItem>
                    )
                }} />
            <DialogTrigger asChild>
                <Button variant="default" aria-label={"button-activityList-confirm"}>Confirm</Button>
            </DialogTrigger>
        </DialogContent>
        </>
    )
}

export default ChooseActivityAndTicketList;

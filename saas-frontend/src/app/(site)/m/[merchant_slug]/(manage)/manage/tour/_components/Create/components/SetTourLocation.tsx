import { ControllerRenderProps, useForm } from "react-hook-form"

import { ActivityList, activityListSchema } from "./CreateActivityList"
import { zodResolver } from "@hookform/resolvers/zod"
import { DateTime } from "luxon"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import AddressInput from "@/components/ux/AddressInput"
import TimeInput from "@/components/ux/TimeInput"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { cn } from "@/lib/utils"

type Props = ControllerRenderProps<{
    [key: string]: ActivityList
}, any> & {
}

const useBL = (props: Props) => {

    const form = useForm<ActivityList>({
        resolver: zodResolver(activityListSchema),
        defaultValues: props.value
    })

    return {
        form,
        save: async (values: ActivityList) => {
            props.onChange(values)
            // escape the dialog
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        }
    }

}

const SetTourLocation: React.FC<Props> = (props) => {

    const bl = useBL(props)

    return (
        <Popover>
            <PopoverTrigger className="w-full">
                <Button type="button" variant="outline" className={cn("w-full mt-2 bg-background border-input cursor-text hover:bg-background hover:text-muted-foreground", props.value.activities[0].location ? "text-foreground" : "text-muted-foreground")}> 
                    {props.value.activities[0].location ? 
                        `${DateTime.fromISO(props.value.activities[0].time).toLocaleString(DateTime.TIME_SIMPLE)} ${props.value.activities[0].location.formattedAddress.slice(0, 15)} ... - ${DateTime.fromISO(props.value.activities[1].time).toLocaleString(DateTime.TIME_SIMPLE)} ${props.value.activities[1].location.formattedAddress.slice(0, 15)} ...` 
                        : `Enter details`
                    }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex-none w-[500px] p-4">
                <Form {...bl.form}>
                <div className="grid grid-rows-2 grid-cols-1 gap-2 p-1">
                    <div className="flex flex-row items-center space-x-2">
                        <FormLabel className="flex-none w-12"> Start </FormLabel>
                        <FormField
                            name="activities.0.time"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <TimeInput 
                                            {...field} value={field.value ?? ""} 
                                            placeholder="Time" />
                                    </FormControl>
                                </FormItem>
                        )} />
                        <span className="text-base">
                            @
                        </span>
                        <FormField
                            name="activities.0.location"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <AddressInput
                                        {...field}
                                        placeholder="Physical address"
                                            />
                                    </FormControl>
                                </FormItem>
                        )} />         
                    </div>
                    <div className="flex flex-row items-center space-x-2">
                        <FormLabel className="flex-none w-12"> End </FormLabel>
                        <FormField
                            name="activities.1.time"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <TimeInput 
                                            {...field} value={field.value ?? ""} 
                                            placeholder="Time" />
                                    </FormControl>
                                </FormItem>
                        )} />
                        <span className="text-base">
                            @
                        </span>
                        <FormField
                            name="activities.1.location"
                            control={bl.form.control}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <AddressInput
                                        {...field}
                                        placeholder="Physical address"
                                            />
                                    </FormControl>
                                </FormItem>
                        )} />         
                    </div>
                </div>
                <div className="flex flex-row items-center space-x-3 mt-2">
                    <CancelDialogButton />
                    <Button type="button" className="flex-grow" onClick={() => bl.save(bl.form.getValues())}> Save </Button>
                </div>
                </Form>
            </PopoverContent>
        </Popover>
    )
}

export default SetTourLocation
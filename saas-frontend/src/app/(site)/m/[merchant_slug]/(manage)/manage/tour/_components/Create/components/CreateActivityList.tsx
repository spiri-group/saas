import { FormControl, FormField, FormItem } from "@/components/ui/form";
import classNames from "classnames";
import React, { useEffect } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import z from "zod";
import { v4 as uuid } from "uuid";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { LocateFixed, Goal, PlusIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import AddressInput, { GooglePlaceSchema } from "@/components/ux/AddressInput";
import TimeInput from "@/components/ux/TimeInput";

export type Activity = z.infer<typeof activitySchema>;
export type ActivityList = z.infer<typeof activityListSchema>

export const activitySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    location: GooglePlaceSchema,
    time: z.string()
})

export const activityListSchema = z.object({
    id: z.string().uuid(),
    activities: z.array(activitySchema)
})

type Props = {
    className?: string,
    form: UseFormReturn<any>,
    fieldName: string
}

type ActivityFormProps = ActivityFormBLProps & {
    form?: UseFormReturn<any>,
    index?: number,
    country?: string,
    icon?: React.ReactNode
}

type ActivityFormBLProps = {
    onSubmit: (activity: Activity) => void,
}

const useActivityFormBL = (props: ActivityFormProps) => {

    const form = useForm<Activity>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
            id: uuid()
        }
    })

    return {
        form,
        save: async (values: Activity) => {
            props.onSubmit(values)
            form.reset()
        }
    }
}

const ActivityForm : React.FC<ActivityFormProps> = (props) => {
    const bl = useActivityFormBL(props);
    
    if (props.form != null && props.index == null) {
        throw new Error("if form is provided, index must be provided")
    }

    const Controls = (
        <div className={classNames("flex flex-row items-center space-x-2")}>
            <FormField
                name={props.form != null ? `activityList.activities.${props.index}.time` : "time" }
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <TimeInput
                                {...field} value={field.value ?? ""}
                                placeholder="Time"
                                data-testid={`activity-time-${props.index}`} />
                        </FormControl>
                    </FormItem>
            )} />
            <FormField
                name={props.form != null ? `activityList.activities.${props.index}.name` : "name" }
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="Activity name" type="text" data-testid={`activity-name-${props.index}`} />
                        </FormControl>
                    </FormItem>
            )} />
            <span className="text-base">
                @
            </span>
            <FormField
                name={props.form != null ? `activityList.activities.${props.index}.location` : "location" }
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <AddressInput
                               {...field}
                               placeholder="Physical address"
                                />
                        </FormControl>
                    </FormItem>
                    
            )} />
        </div>
    )

    if (props.form != null) {
        return Controls
    } else {
        return (
            <form onSubmit={bl.form.handleSubmit(props.onSubmit)}>
                {Controls}
            </form>
        )
    }
    
}

const CreateActivityList: React.FC<Props> = (props) => {
    const currentList = props.form.getValues()[props.fieldName] as ActivityList

    useEffect(() => {
        props.form.watch(props.fieldName)
    })

    const onSubmit = (Activity: Activity) => {
        if (currentList.activities.find(t => t.id == Activity.id) != null) {
            currentList.activities = currentList.activities.map(t => t.id == Activity.id ? Activity : t);
            props.form.setValue(props.fieldName, currentList)
            return;
        } else {
            // we add it
            props.form.setValue(props.fieldName, { ...currentList, activities: currentList.activities.concat(Activity) })
        }
    }

    return (
        <div className={classNames(props.className)} data-testid="activity-list">
            <div className="flex flex-col w-full items-center space-y-2 mt-2 p-2">
                {currentList.activities.map((activity, ai) => {
                    return (
                        <>
                        <ActivityForm
                            key={activity.id} 
                            icon={ai == 0 ? 
                                <LocateFixed height={30} /> 
                                : (ai == currentList.activities.length - 1) ? <Goal height={30} /> : null}
                            form={props.form}
                            index={ai} 
                            onSubmit={onSubmit} />
                        { ai != currentList.activities.length - 1 && (
                            <div style={{ position: "relative" }}>
                                <Separator orientation="vertical" className="h-12" />
                                <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)" }} className="w-8 h-8 cursor-pointer rounded-full bg-white border border-slate-300 flex items-center justify-center">
                                    <PlusIcon className="text-slate-800" height={25} />
                                </div>
                            </div>
                        )}
                        </>
                    )
                })}
            </div>
        </div>
    )
}

export default CreateActivityList;

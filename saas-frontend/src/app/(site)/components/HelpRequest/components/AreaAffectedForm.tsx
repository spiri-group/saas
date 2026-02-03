'use client'

import React from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { evidenceSchema } from "./shared";
import z from "zod"
import { capitalizeWords } from "@/lib/functions";
import { Undo2Icon } from "lucide-react";

type AffectedArea = z.infer<typeof affectedAreaSchema>

export const affectedAreaSchema = z.object({
    id: z.string().min(1),
    name: z.string().transform(v => capitalizeWords(v)),
    physicalActivity: z.boolean(),
    negativeSensations: z.boolean(),
    coldTemperature: z.boolean(),
    evidence: z.array(evidenceSchema)
})

type BLProps = {
    field?: any
}

const useBL = (props : BLProps) => {

    const areaForm = useForm<AffectedArea>({
        resolver: zodResolver(affectedAreaSchema),
        defaultValues: {
            id: uuid(),
            name: undefined,
            physicalActivity: false,
            negativeSensations: false,
            coldTemperature: false,
            evidence: []
        }
    })

    return {
        areaForm,
        add: async (values: AffectedArea) => {
            if (props.field == null) throw 'Needs a field to be able to add'
            props.field.onChange(
                [...props.field.value, values]
            )
            areaForm.reset({
                id: uuid(),
                evidence: []
            })
        }
    }

}

type AreaAffectedFormProps = BLProps & {
    name?: string
}

const AreaAffectedForm: React.FC<AreaAffectedFormProps> = (props) => {
    const bl = useBL(props);

    const Controls = (
        <>
            <div className="flex flex-row space-x-2 w-full">
                <FormField
                    name={`${props.name ?? ""}name`}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input aria-label={`input-case${props.name ? "" : "-new"}-areaAffectedbutton-createHelpRequest`} {...field} value={field.value ?? ""} placeholder="Area"/>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    name={`${props.name ?? ""}physicalActivity`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    title="Physical Activity"
                                    aria-label={`input-case${props.name ? "" : "-new"}-areaAffectedbutton-createHelpRequest`} 
                                    onClick={() => field.onChange(!field.value)}
                                    variant={field.value == false ? "outline" : "default"}>P</Button>
                            </FormControl>
                        </FormItem>
                    )}
                    />
                <FormField
                    name={`${props.name ?? ""}negativeSensations`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    title="Negative Sensations"
                                    aria-label={`input-case${props.name ? "" : "-new"}-areaAffectedbutton-createHelpRequest`} 
                                    variant={field.value == false ? "outline" : "default"}
                                    onClick={() => field.onChange(!field.value)}
                                    >N</Button>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    name={`${props.name ?? ""}coldTemperature`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    title="Cold Spots"
                                    aria-label={`input-case${props.name ? "" : "-new"}-areaAffectedbutton-createHelpRequest`} 
                                    onClick={() => field.onChange(!field.value)}
                                    variant={field.value == false ? "outline" : "default"}>C</Button>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </>
    )

    const values = bl.areaForm.getValues()

    if (props.name != null) {
        return (
            <div className="mt-2">
                {Controls}
            </div>
        )
    } else {
        return (
            <Form {...bl.areaForm}>
                <form className="flex flex-col w-full">
                    <div className="flex flex-row space-x-3 w-full">
                        {Controls}
                        <Button type="button"
                            aria-label={"button-case-new-areaAffected"}
                            onClick={bl.areaForm.handleSubmit(bl.add)}>
                            Confirm
                        </Button>
                        <Button type="button"
                            aria-label={"button-case-new-areaAffected"}
                            variant="destructive"
                            onClick={() => {
                                bl.areaForm.reset({
                                    id: uuid(),
                                    evidence: []
                                })
                            }}>
                                <Undo2Icon size={16} />
                        </Button>
                    </div>
                    { values.name &&
                        <div className="text-slate-400 pl-4 py-2">
                            <span>The {values.name} {values.coldTemperature ? <><span>has </span><span className="font-bold">cold spots </span></> : "" } {values.physicalActivity ? <><span>with </span><span className="font-bold">physical activity</span></> : ""}{ values.physicalActivity && values.negativeSensations ? <span> and </span> : null} {!values.physicalActivity && values.negativeSensations ? <span>with </span> : null}{values.negativeSensations ? <span className="font-bold">negative sensations</span> : null}</span>
                        </div>
                    }
                </form>
            </Form>
        )
    }
}

type Props = ControllerRenderProps<AffectedArea, any> & {

}

const AreasAffectedForm : React.FC<Props> = (props) => {
    
    return (
        <div className="flex flex-col">
            <AreaAffectedForm
                field={props} 
            />
            <ul className="flex flex-col space-y-2 mt-4 h-[280px]">
                {props.value.map((_, ix) => {
                    return (
                        <li key={ix}>
                            <span>The </span>{props.value[ix].name} {props.value[ix].coldTemperature ? <><span>has </span><span className="font-bold">cold spots </span></> : "" } {props.value[ix].physicalActivity ? <><span>with </span><span className="font-bold">physical activity</span></> : ""}{ props.value[ix].physicalActivity && props.value[ix].negativeSensations ? <span> and </span> : null} {!props.value[ix].physicalActivity && props.value[ix].negativeSensations ? <span>with </span> : null}{props.value[ix].negativeSensations ? <span className="font-bold">negative sensations</span> : null}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default AreasAffectedForm;
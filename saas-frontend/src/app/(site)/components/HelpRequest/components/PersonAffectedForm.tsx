'use client'

import React from "react";
import z from "zod"
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { evidenceSchema } from "./shared";
import { capitalizeWords } from "@/lib/functions";
import { Undo2Icon } from "lucide-react";

type AffectedPerson = z.infer<typeof affectedPersonSchema>

export const affectedPersonSchema = z.object({
    id: z.string().min(1),
    name: z.string().transform(v => capitalizeWords(v)),
    physicallyInjured: z.boolean(),
    mentallyInjured: z.boolean(),
    isChild: z.boolean(),
    evidence: z.array(evidenceSchema)
})

type BLProps = {
    field?: any
}

const useBL = (props : BLProps) => {

    const personForm = useForm<AffectedPerson>({
        resolver: zodResolver(affectedPersonSchema),
        defaultValues: {
            id: uuid(),
            name: undefined,
            physicallyInjured: false,
            mentallyInjured: false,
            isChild: false,
            evidence: []
        }
    })

    return {
        personForm,
        add: async (values: AffectedPerson) => {
            if (props.field == null) throw 'Needs a field to be able to add'
            props.field.onChange(
                [...props.field.value, values]
            )
            personForm.reset({
                id: uuid(),
                evidence: []
            })
        }
    }

}

type PersonAffectedFormProps = BLProps & {
    name?: string
}

const PersonAffectedForm: React.FC<PersonAffectedFormProps> = (props) => {
    const bl = useBL(props);

    const Controls = (
        <>
            <div className="flex flex-row space-x-2 w-full">
                <FormField
                    name={`${props.name ?? ""}name`}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input aria-label={`input-case${props.name ? "" : "-new"}-personAffected`} {...field} value={field.value ?? ""} placeholder="Name"/>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    name={`${props.name ?? ""}physicallyInjured`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    variant={field.value ? "default" : "outline"}
                                    title="Is Physically Injured?"
                                    aria-label={`button-case${props.name ? "" : "-new"}-physicallyInjured`} 
                                    onClick={() => field.onChange(!field.value)}>P</Button>
                            </FormControl>
                        </FormItem>
                    )}
                    />
                <FormField
                    name={`${props.name ?? ""}mentallyInjured`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    variant={field.value ? "default" : "outline"}
                                    title="Is Mentally Injured?"
                                    aria-label={`button-case${props.name ? "" : "-new"}-mentallyInjured`} 
                                    onClick={() => field.onChange(!field.value)}>M</Button>
                            </FormControl>
                        </FormItem>
                    )} />
                <FormField
                    name={`${props.name ?? ""}isChild`}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Button type="button" 
                                    variant={field.value ? "default" : "outline"}
                                    title="Is a Child?"
                                    aria-label={`button-case${props.name ? "" : "-new"}-isChild`} 
                                    onClick={() => field.onChange(!field.value)}>C</Button>
                            </FormControl>
                        </FormItem>
                    )} />
            </div>
        </>
    )

    const values = bl.personForm.getValues()

    if (props.name != null) {
        return (
            <div className="mt-2">
                {Controls}
            </div>
        )
    } else {
        return (
            <Form {...bl.personForm}>
                <form className="flex flex-col space-y-2 w-full">
                    <div className="flex flex-row space-x-3"> 
                        {Controls}
                        <Button type="button"
                            aria-label={"button-case-new-personAffected"}
                            onClick={bl.personForm.handleSubmit(bl.add)}>
                            Confirm
                        </Button>
                        <Button type="button"
                            variant={"destructive"}
                            aria-label={"button-case-new-personAffected"}
                            onClick={() => {
                                bl.personForm.reset({
                                    id: uuid(),
                                    evidence: []
                                })
                            }}>
                            <Undo2Icon size={16} />
                        </Button>
                    </div>
                    { values.name &&
                    <div className="text-slate-400 pl-4 py-2">
                        <span>{values.name} {values.isChild ? <><span> is a </span><span className="font-bold">child</span></> : null} {values.isChild && (values.physicallyInjured || values.mentallyInjured) ? "who " : null} {values.physicallyInjured || values.mentallyInjured ? <><span> is </span>{values.physicallyInjured ? <span className="font-bold">physically injured</span> : null}{values.physicallyInjured && values.mentallyInjured ? <span> and </span> : null}{values.mentallyInjured ? <span className="font-bold">mentally injured</span> : null}</> : null}</span>
                    </div>
                    }
                </form>
            </Form>
        )
    }
}

type Props = ControllerRenderProps<AffectedPerson, any> & {

}

const PeopleAffectedForm : React.FC<Props> = (props) => {
    
    return (
        <div className="flex flex-col">
            <PersonAffectedForm
                field={props} 
            />
            <ul className="flex flex-col space-y-2 mt-4 h-[280px]">
                {props.value.map((value, ix) => {
                    return (
                        <li key={ix}>
                            {value.name} {value.isChild ? <><span> is a </span><span className="font-bold">child</span></> : null} {value.isChild && (value.physicallyInjured || value.mentallyInjured) ? "who " : ""} {value.physicallyInjured | value.mentallyInjured ? <><span>is </span>{value.physicallyInjured ? <span className="font-bold">physically injured</span> : null}{value.physicallyInjured && value.mentallyInjured ? <span> and </span> : null}{value.mentallyInjured ? <span className="font-bold">mentally injured</span> : null}</> : null}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default PeopleAffectedForm;
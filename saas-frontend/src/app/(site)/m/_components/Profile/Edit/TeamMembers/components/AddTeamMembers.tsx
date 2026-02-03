'use client';

import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { v4 as uuid } from "uuid";
import FileUploader from "@/components/ux/FileUploader";
import RichTextInput from "@/components/ux/RichTextInput"
import { media_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControllerRenderProps, Form, useForm } from "react-hook-form";
import { z } from "zod";
import { Panel } from "@/components/ux/Panel";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { countWords } from "@/lib/functions";

export type TeamMember = z.infer<typeof teamMemberSchema>;

const bio_max_words_length = 500;

export const teamMemberSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    tagline: z.string().nullable().optional(),
    bio: z.string().refine((value) => countWords(value) <= bio_max_words_length).optional(),
    image: z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        urlRelative: z.string().min(1),
        size: z.string().min(1),
        type: z.string().min(1)
    }).nullable().optional()
})

type TeamMemberFormProps = TeamMemberFormBLProps & {
    merchantId: string,
    existingTeamMember?: TeamMember,
    clearExistingTeamMember: () => void
}

type TeamMemberFormBLProps = {
    onSubmit: (teamMember: TeamMember) => void
}

type Props = ControllerRenderProps<{
    [key: string]: TeamMember[] | undefined
}, any> & {
    className?: string,
    merchantId: string
}

const useBL = (props) => {

    const form = useForm<TeamMember>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: {
            id: uuid()
        }
    })

    useEffect(() => {
        if (props.existingTeamMember != null && form.getValues().id != props.existingTeamMember.id){
            form.reset(props.existingTeamMember)
        } else {
            form.reset({
                id: uuid()
            })
        }
    }, [props.existingTeamMember])

    return {
        form,
        values: form.getValues(),
        reset: form.reset,
        save: async (values: TeamMember) => {
            props.onSubmit(values)
            form.reset({
                id: uuid()
            })
        }
    }
}

const TeamMemberForm : React.FC<TeamMemberFormProps> = (props) => {
    const bl = useBL(props);

    const Controls = (
        <div className="flex flex-col space-y-3 flex-grow">
            <div className="flex flex-row space-x-4">
                <FormField 
                    name={"image"}
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormLabel>Image</FormLabel>
                                <FormControl>
                                <FileUploader
                                    id={bl.form.getValues().id as string}
                                    className={"w-full h-[120px] aspect-square border border-dashed"}
                                    connection={{
                                        container: "public",
                                        relative_path: `merchant/${props.merchantId}/teamMembers`
                                    }}
                                    targetImage={{
                                        height: 300,
                                        width: 500
                                    }}
                                    value={field.value != null ? [field.value.url] : []}
                                    targetImageVariants={[]}
                                    onDropAsync={function (): void {
                                        field.onChange(null)
                                    }}
                                    onUploadCompleteAsync={function (files: media_type[]): void {
                                        field.onChange(files[0])
                                    }}
                                />
                                </FormControl>
                            </FormItem>
                        )
                    }}  />
                <div className="flex flex-col justify-between">
                    <FormField
                        name={"name"}
                        control={bl.form.control}
                        render={({ field }) => {
                            return (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="mt-2">Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}  value={field.value ?? ""} placeholder="Enter team member name"/>
                                    </FormControl>
                                </FormItem>
                            )
                        }} />
                    <FormField
                        name={"tagline"}
                        control={bl.form.control}
                        render={({ field }) => {
                            return (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="mt-2">Tagline</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value ?? ""} placeholder="Enter tagline"/>
                                    </FormControl>
                                </FormItem>
                            )
                        }} />
                </div>
            </div>
            <FormField
                name={"bio"}
                control={bl.form.control}
                render={({ field }) => {
                    return (
                        <RichTextInput 
                            className="flex-none w-[350px] h-[220px]" {...field}
                            maxWords={bio_max_words_length}
                            label="Bio"
                            value={field.value ?? ""}  placeholder="Enter bio"/>
                    )
                }} />     
        </div>
    )

    return (
        <Form {...bl.form} key={bl.values.id}>
            <h1 className="text-xl font-bold mb-3">{props.existingTeamMember != null ? "Update" : "New"} team member</h1>
            <form className="flex flex-col h-full">
                {Controls}
                <div className="mt-auto mr-auto flex flex-row">
                {props.existingTeamMember != null && (
                    <Button
                        variant="destructive"
                        className="mr-3"
                        onClick={() => {
                            props.clearExistingTeamMember();
                        }}>
                        Cancel
                    </Button>
                )}
                <Button 
                    onClick={bl.form.handleSubmit(bl.save)}
                    type="button"> {props.existingTeamMember != null ? "Confirm changes" : "Add team member"} </Button>
                </div>
            </form>
        </Form>
    )
}

const AddTeamMembers : React.FC<Props> = (props) => {

    const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined)

    const onSubmitTeamMember = (teamMember: TeamMember) => {

        if (props.value != undefined) {
            if (props.value.length >= 2000) {
                //TODO : THROW AN ERROR HERE
                return;
            }

            if (props.value.find(t => t.id == teamMember.id) != null) {
                props.onChange(props.value.map(t => t.id == teamMember.id ? teamMember : t), { shouldValidate: true, shouldDirty: true })
            } else {
                props.onChange(props.value.concat(teamMember), { shouldValidate: true, shouldDirty: true })
            }
        } else {
            props.onChange([teamMember], { shouldValidate: true, shouldDirty: true })
        }
        if (selectedIndex) setSelectedIndex(undefined)
    }

    const teamMembers = props.value ?? []

    return (
        <>
            <div className={cn("space-x-6 flex flex-row h-full", props.className)}>
                <TeamMemberForm 
                    merchantId={props.merchantId} 
                    onSubmit={onSubmitTeamMember}
                    clearExistingTeamMember={() => setSelectedIndex(undefined)}
                    existingTeamMember={selectedIndex != null ? teamMembers[selectedIndex] : undefined} />
                <Panel className="flex-grow h-full">
                    <h1 className="text-xl font-bold mb-3">Team Members</h1>
                    <div className="flex flex-col space-y-2">
                        <p className="text-slate-600 text-sm">Team members are the people who make your business unique. Add team members to your profile to give your customers a better idea of who they&apos;re working with.</p>
                        {
                            teamMembers.length == 0 && (
                                <p className="text-slate-600 text-sm">You haven&apos;t added any team members yet.</p>
                            )
                        }
                        {
                            teamMembers.map((teamMember, index) => (
                                <div key={teamMember.id} className="flex flex-row items-center space-x-3">
                                    <span className="text-md font-bold">{teamMember.name}</span>
                                    <Button 
                                        type="button"
                                        onClick={() => setSelectedIndex(index)}
                                        variant="link">Edit</Button>
                                    <Button 
                                        type="button"
                                        onClick={() => {
                                            props.onChange(teamMembers.filter(t => t.id != teamMember.id), { shouldValidate: true, shouldDirty: true })
                                        }}
                                        variant="link">Delete</Button>
                                </div>
                            ))
                        }
                    </div>
                </Panel>
            </div>
        </>
    )
}

export default AddTeamMembers; 
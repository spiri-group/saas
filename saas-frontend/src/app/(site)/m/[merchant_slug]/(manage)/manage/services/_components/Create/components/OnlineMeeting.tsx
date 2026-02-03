import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { DurationSchema } from "@/shared/hooks/mutations";
import { choice_option_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import UseChoice from "@/shared/hooks/UseChoice";
import { CheckCircle2Icon, Globe } from "lucide-react";
import { useEffect } from "react";
import { escape_key } from "@/lib/functions";
import ComboBox from "@/components/ux/ComboBox";

export type onlineMeeting_type = z.infer<typeof onlineMeetingSchema>

export const onlineMeetingSchema = z.object({
    meeting_link: z.string().url().optional(),
    meeting_passcode: z.string().optional(),
    buffer: DurationSchema
})

type BLProps = {
    unitOptions: choice_option_type[]
    defaultConfiguration?: onlineMeeting_type,
    withIcons?: boolean,
    onComplete: (value: onlineMeeting_type) => void
    onRemove: () => void
}

type Props = BLProps & {
    isSet: boolean
} 

const useBL = (props: BLProps) => {
    
    const unitServiceQuery = UseChoice("unit", "EN", ["HOUR", "MINUTE"])
    
    const form = useForm<z.infer<typeof onlineMeetingSchema>>({
        resolver: zodResolver(onlineMeetingSchema),
        defaultValues: {

        }
    })

    useEffect(() => {
        if (props.defaultConfiguration != undefined) {
            const defaultConfiguration = props.defaultConfiguration;
            form.clearErrors();
            Object.keys(defaultConfiguration).forEach(key => {
                form.setValue(key as any, defaultConfiguration[key]);
            });
        }
    }, [props.defaultConfiguration])

    return {
        form,
        unitOptions: unitServiceQuery.data == null ? [] : unitServiceQuery.data.options,
        save: async () => { 
            const isValid = await form.trigger()
            if (isValid) {
                props.onComplete(form.getValues())
                escape_key()
            }
        },
        reset: async ()=> {
            await form.reset({
                meeting_link: null,
                meeting_passcode: null,
                buffer: {
                    amount: "",
                    unit: null
                }
            } as any)
            props.onRemove()
            escape_key()
        }
    }
}

const OnlineMeeting : React.FC<Props> = ({withIcons=false, ...props}) => {
    const bl = useBL(props)

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button className="flex flex-row items-center space-x-3" variant={props.isSet ? "link" : "outline"}>
                    {!withIcons ? <>{props.isSet && <CheckCircle2Icon />}<span>Online Meeting</span></> : <></> }
                    {withIcons && <Globe size={15} />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] h-[230px] p-4">
            <Form {...bl.form}>
                <FormLabel> Online Meeting </FormLabel>
                <form className="flex flex-col space-y-2 space-x-2">
                    <div className="flex flex-row space-x-2">
                        <FormField
                        name="meeting_link"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        placeholder="Link"
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField
                        name="meeting_passcode"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        placeholder="Passcode"/>
                                </FormControl>
                            </FormItem>
                        )} />
                    </div>
                    <div className="flex flex-row space-x-2">
                        <FormField 
                            name="buffer.amount"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>Buffer</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            placeholder="Buffer" />
                                    </FormControl>
                                </FormItem>
                        )} />
                        <FormField 
                            name="buffer.unit"
                            control={bl.form.control}
                            render={({field}) => {
                                return (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <FormControl>
                                        <ComboBox 
                                            {...field}
                                            withSearch={false}
                                            objectName="unit"
                                            fieldMapping={{
                                                labelColumn: "defaultLabel",
                                                keyColumn: "id"
                                            }}
                                            items={bl.unitOptions}            
                                        />
                                        </FormControl>
                                    </FormItem>
                                )
                        }} />
                    </div>
                    <div className="flex flex-row items-center space-x-2 mt-4">
                        <CancelDialogButton />
                        <Button 
                            variant="default"
                            type="button" 
                            onClick={bl.save}> Confirm </Button>
                        {props.isSet &&  
                            <Button 
                                variant="default"
                                type="button"
                                onClick={bl.reset}
                            >Remove</Button> 
                        }
                        {props.isSet &&
                            <Button 
                                variant="default"
                                type="button"
                            >Enable</Button>
                        }
                    </div>
                </form>
            </Form>
            </PopoverContent>
        </Popover>
    )
}

export default OnlineMeeting;
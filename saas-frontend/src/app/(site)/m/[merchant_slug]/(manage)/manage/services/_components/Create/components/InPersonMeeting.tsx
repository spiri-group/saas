import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AddressInput, { GooglePlaceSchema } from "@/components/ux/AddressInput";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { choice_option_type } from "@/utils/spiriverse";
import { DurationSchema } from "@/shared/hooks/mutations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import UseChoice from "@/shared/hooks/UseChoice";
import { CheckCircle2Icon, MapPin } from "lucide-react";
import { useEffect } from "react";
import { escape_key } from "@/lib/functions";
import ComboBox from "@/components/ux/ComboBox";

export type inPersonMeeting_type = z.infer<typeof inPersonMeetingSchema>

export const inPersonMeetingSchema = z.object({
    place: GooglePlaceSchema,
    buffer: DurationSchema
})

type BLProps = {
    unitOptions: choice_option_type[],
    withIcons?: boolean,
    defaultConfiguration?: inPersonMeeting_type
    onComplete: (value: inPersonMeeting_type) => void
    onRemove: () => void
}

type Props = BLProps & {
    isSet: boolean
} 

const useBL = (props: Props) => {
    
    const unitServiceQuery = UseChoice("unit", "EN", ["HOUR", "MINUTE"])

    const form = useForm<inPersonMeeting_type>({
        resolver: zodResolver(inPersonMeetingSchema), 
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
                place: null,
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

const InPersonMeeting : React.FC<Props> = ({withIcons=false, ...props}) => {
    const bl = useBL(props)

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button className="flex flex-row items-center space-x-3" variant={props.isSet ? "link" : "outline"}>
                    {!withIcons ? <>{props.isSet && <CheckCircle2Icon />}<span>In Person Meeting</span></> : <></> }
                    {withIcons && <MapPin size={15} />}
                </Button>
            </PopoverTrigger>
            <PopoverContent  className="w-[400px] h-[230px] p-4">
                <Form {...bl.form}>
                    <form className="flex flex-col space-y-1">
                        <FormField 
                            name="place"
                            control={bl.form.control}
                            render={({ field }) => {
                                return (
                                    <FormItem className="flex-grow">
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <AddressInput 
                                                {...field}
                                                placeholder="Location"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )
                            }} />
                        <div className="flex flex-row space-x-2">
                            <FormField 
                                name="buffer.amount"
                                control={bl.form.control}
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

export default InPersonMeeting;
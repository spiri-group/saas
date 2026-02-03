'use client'

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import AddressInput, { GooglePlaceSchema } from "@/components/ux/AddressInput"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Panel } from "@/components/ux/Panel"
import { countWords } from "@/lib/functions"
import { zodResolver } from "@hookform/resolvers/zod"
import { PopoverContent } from "@radix-ui/react-popover"
import { Trash2Icon } from "lucide-react"
import { useEffect } from "react"
import { ControllerRenderProps, useForm } from "react-hook-form"
import { uuid } from "uuidv4"
import { z } from "zod"

export type MerchantLocation = z.infer<typeof MerchantLocation>

export const MerchantLocation = z.object({
    id: z.string().min(1),
    title: z.string().min(1).refine((value) => countWords(value) <= 50),
    address: GooglePlaceSchema.optional().nullable()
})

const FormSchema = z.object({
    locations: z.array(MerchantLocation)
})

type Props = ControllerRenderProps<{
    [key: string]: MerchantLocation[]
}, any> & {
}

const useBL = (props: Props) => {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            locations: []
        }
    })
    
    useEffect(() => {
        if (props.value && form.getValues() != undefined) {
            if (props.value.length == 0) {
                form.reset({
                    locations: [{ id: uuid(), title: undefined, address: undefined }]
                })
            } else {
                form.reset({locations: props.value})
            }
        }
    }, [props.value])

    return {
        form,
        values: form.getValues(),
        save: (data: z.infer<typeof FormSchema>) => {
            props.onChange(data.locations)
            // escape the dialog
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        }
    }
}

const Locations : React.FC<Props> = (props) => {
    const bl = useBL(props)
    
    if (props.value == undefined) {
        return <div className="border-input border p-2 rounded-md cursor-pointer w-full h-10" />
    }

    const locations = bl.values.locations

    return (
        <Popover>
            <PopoverTrigger>
                <div className="border-input border p-2 rounded-md cursor-text w-full h-10">
                    {props.value && props.value.length > 0 ? (
                        <span>{props.value.length} locations</span>
                    ) : (
                        <span className="text-sm">Enter locations</span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent>
                <Panel>
                    <Form {...bl.form}>
                        <ul className="flex flex-col p-3 space-y-3">
                            <li>
                                <Button 
                                    type="button"
                                    onClick={() => {
                                        bl.form.reset({
                                            locations: [...locations, { id: uuid(), title: undefined, address: undefined }]
                                        })
                                    }}>
                                        Add location
                                </Button>
                            </li>
                            {locations.map((location, index) => {
                                return (
                                    <li key={location.id} className="flex flex-row space-x-3">
                                        <Button variant="link" type="button" onClick={() => {
                                            bl.form.reset({
                                                locations: locations.filter((_, i) => i != index)
                                            })
                                        }} className="flex-none w-12">
                                            <Trash2Icon height={14} />
                                        </Button>
                                        <FormField
                                            name={`locations.${index}.title`}
                                            control={bl.form.control}
                                            render={({field}) => (
                                                <FormItem className="flex-none w-32">
                                                    <FormControl>
                                                        <Input {...field} value={field.value ?? ""} placeholder="Enter title" />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                        <FormField
                                            name={`locations.${index}.address`}
                                            control={bl.form.control}
                                            render={({field}) => (
                                                <FormItem className="flex flex-col flex-grow">
                                                    <FormControl>
                                                        <AddressInput 
                                                            {...field} 
                                                            placeholder="Enter address" />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </li>   
                                )
                            })}
                        </ul>
                        <div className="flex flex-row items-center space-x-3">
                            <CancelDialogButton />
                            <Button className="flex-grow" type="button"
                                onClick={() => {
                                    bl.form.trigger().then((isValid) => {
                                        if (isValid) {
                                            bl.save(bl.values)
                                        }
                                    }, (reason) => {
                                        console.log(reason)
                                    })
                                }}>Confirm</Button>
                        </div>
                    </Form>
                </Panel>
            </PopoverContent>
        </Popover>
    )
}

export default Locations
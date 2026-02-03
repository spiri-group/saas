import React from "react";
import RichTextInput from "@/components/ux/RichTextInput"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import UseCreateService, { CreateServiceSchema } from "./hooks/UseCreateService";
import { choice_option_type } from "@/utils/spiriverse";
import CurrencyInput from "@/components/ux/CurrencyInput";
import UseChoice from "@/shared/hooks/UseChoice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccordionInput from "@/components/ux/AccordionInput";
import ThumbnailInput from "@/components/ux/ThumbnailInput";
import { DialogHeader } from "@/components/ui/dialog";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import ComboBox from "@/components/ux/ComboBox";
import { escape_key } from "@/lib/functions";
import WithPaymentsEnabled from "@/app/(site)/m/_components/Banking/_components/WithPaymentsEnabled";

type BLProps = {
    merchantId: string
    unitOptions: choice_option_type[]
}

const useBL = (props: BLProps) => {
    const router = useRouter();

    const { form, mutation, values } = UseCreateService(props.merchantId)
    const unitServiceQuery = UseChoice("unit", "EN", ["HOUR", "MINUTE"])

    return {
        form, 
        values,
        submit: async (values: CreateServiceSchema) => {
            await mutation.mutateAsync(values)
            escape_key()
            router.push(`/m/${props.merchantId}/Services/Availability`)
        },
        unitOptions: unitServiceQuery.data == null ? [] : unitServiceQuery.data.options
    }
}

type Props = BLProps & {

}

const CreateService : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (
        <>
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col">
                <DialogHeader className="flex flex-row items-center space-x-2 p-2">
                    <FormLabel>Service name:</FormLabel>
                    <FormField
                    name="name"
                    control={bl.form.control}
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Input {...field} placeholder="Enter name" />
                            </FormControl>
                        </FormItem>
                    )} />
                </DialogHeader>
                <div className="flex flex-row space-x-3 p-2">
                    <div className="flex flex-col space-y-2">
                        <FormField  
                            control={bl.form.control}
                            name="thumbnail"
                            render={({ field }) => (
                                <FormControl>
                                    <ThumbnailInput 
                                        relativePath={`merchant/${props.merchantId}/service/${bl.values.id}`}
                                        {...field} />
                                </FormControl>
                            )} />
                        <Tabs className="mt-2 flex-grow" defaultValue="description">
                            <TabsList>
                                <TabsTrigger value="description">Description</TabsTrigger>
                                <TabsTrigger value="terms">Terms</TabsTrigger>
                                <TabsTrigger value="faq">FAQ (Optional)</TabsTrigger>
                            </TabsList>
                            <TabsContent className="h-full" value="description">
                                <FormField
                                    name="description"
                                    render={({field}) => (
                                        <RichTextInput 
                                            {...field}
                                            maxWords={500}
                                            className="w-[300px] h-[220px]" />
                                    )} />
                            </TabsContent>
                            <TabsContent className="h-full" value="terms">
                                <FormField
                                    name="terms"
                                    render={({field}) => (
                                        <FormItem className="flex flex-col h-full">
                                            <FormControl>
                                            <RichTextInput 
                                                {...field}
                                                maxWords={500}
                                                className="w-[300px] h-[220px]" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                            </TabsContent>
                            <TabsContent className="h-full" value="faq">
                                <FormField 
                                    name="faq" 
                                    render={({field}) => (
                                        <FormItem className="flex flex-col h-full">
                                            <FormControl>
                                                <AccordionInput createButtonProps={{ className: "w-full", label: "Add" }} {...field} />  
                                            </FormControl>
                                        </FormItem>
                                    )} />       
                            </TabsContent>
                        </Tabs>
                    </div>
                    <div className="flex flex-col flex-grow">
                        <div className="flex flex-row space-x-2">
                            <FormField 
                                name="duration.amount"
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel>Duration</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Duration" />
                                        </FormControl>
                                    </FormItem>
                            )} />
                            <FormField 
                                name="duration.unit"
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
                        <FormField 
                            name="ratePerHour"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel> Service Rate ($ per hour) </FormLabel>
                                    <FormControl>
                                        <CurrencyInput {...field} placeholder="Rate" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        {/* <FormField 
                            name="requireAppointment"
                            render={({ field }) => (
                                <FormItem className="flex flex-row">
                                    <FormControl>
                                        <Checkbox
                                            className="mr-2 mt-2"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="mt-2">Requires scheduled appointments</FormLabel>
                                </FormItem>
                            )}
                        />
                        {bl.values.requireAppointment && (
                            <DateRange gql_conn={props.gql_conn} unitOptions={props.unitOptions} />
                        )} */}
                    </div>
                </div>
                <div className="flex flex-row items-center space-x-2 mt-auto">
                    <CancelDialogButton />
                    <Button type="submit" className="w-full">Next - Schedule Availability</Button>
                </div>
            </form>
        </Form>
        </>
    )
}

// Services don't require physical locations
export default WithPaymentsEnabled(CreateService, { requireLocations: false });
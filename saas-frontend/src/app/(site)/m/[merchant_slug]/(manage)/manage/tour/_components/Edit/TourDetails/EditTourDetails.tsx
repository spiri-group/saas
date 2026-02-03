import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { media_type, recordref_type } from "@/utils/spiriverse";

import UseEditTourDetails, { updateTourDetails_type } from "./hooks/UseEditTourDetails";
import UseMerchantTours from "../../../../events-and-tours/hooks/UseMerchantTours";
import { Input } from "@/components/ui/input";
import FileUploader from "@/components/ux/FileUploader";
import RichTextInput from "@/components/ux/RichTextInput"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import AccordionInput from "@/components/ux/AccordionInput";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Separator } from "@/components/ui/separator";
import { escape_key } from "@/lib/functions";

type EditTourFormProps = {
    merchantId: string
    tourId: string
}

const EditTourForm: React.FC<EditTourFormProps> = (props) => {
    
    const bl = UseEditTourDetails(props.merchantId, props.tourId)

    const submit = async (values: updateTourDetails_type) => {
        await bl.mutation.mutateAsync(values);
        escape_key()
    }

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(submit)} className="flex flex-col">
                <div className="flex flex-row flex-grow space-x-4">
                    <div className="flex flex-col space-y-2">
                    <FormLabel>Tour name</FormLabel>
                        <FormField
                        name="name"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormControl>
                                    <Input {...field} value={field.value ?? ""} placeholder="Enter name" />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField 
                        name="thumbnail"
                        render={({field}) => {
                            return (
                                <FormItem>
                                    <FormLabel>Thumbnail</FormLabel>
                                    <FormControl>
                                    <FileUploader
                                        id={props.tourId}
                                        className={"w-[300px] aspect-video border border-dashed"}
                                        connection={{
                                            container: "public",
                                            relative_path: `merchant/${props.merchantId}/tour/${props.tourId}`
                                        }}
                                        acceptOnly={{
                                            type: "IMAGE",
                                            orientation: "LANDSCAPE"
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
                                        }} />
                                    </FormControl>
                                </FormItem>
                            )
                        }} />
                        <FormField
                        name="terms"
                        render={({field}) => (
                            <RichTextInput 
                                {...field} 
                                label="Terms"
                                maxWords={500}
                                value={field.value ?? ""}
                                className="w-[300px] h-[100px]" />
                        )} />
                    </div>
                    <div className="flex flex-col space-y-2">
                    <FormField
                        name="description"
                        render={({field}) => (
                            <RichTextInput 
                                label="Description"
                                maxWords={500}
                                {...field} 
                                value={field.value ?? ""}
                                className="w-[300px] h-[100px]" />
                        )} />
                        <FormField
                        name="faq"
                        render={({field}) => (
                            <FormItem className="flex flex-col h-full">
                                <FormLabel>FAQ</FormLabel>
                                <FormControl>
                                    <AccordionInput {...field} value={field.value ?? ""} />  
                                </FormControl>
                            </FormItem>
                        )} />
                    </div>
                </div>
                <div className="flex flex-row mt-auto space-x-3">
                    <CancelDialogButton />
                    <Button type="submit" className="flex-grow">Update</Button>
                </div>
            </form>
        </Form> 
    )
}

type BLProps = {
    merchantId: string
    vendorId: string
}

const useBL = (props: BLProps) => {
    const [selectedTour, setSelectedTour] = useState<recordref_type | null>(null)

    const merchantTours = UseMerchantTours(props.vendorId)

    return {
        merchantTours: {
            isLoading: merchantTours.isLoading,
            get: merchantTours.data ?? []
        },
        selectedTour,
        setSelectedTour
    }
}

type Props = BLProps & {

}

const EditTourDetails : React.FC<Props> = (props) => {
    const bl = useBL(props)
    
    return (   
        <div className="flex flex-row p-2 space-x-2">  
            <div className="flex flex-col">
                <h1 className="font-bold"> Select tour first </h1>
                {bl.merchantTours.isLoading ? (
                <span className="text-xs">Loading...</span>
                ) : (
                    bl.merchantTours.get.length > 0 ? (
                    <ul>
                        {bl.merchantTours.get.map((tour) => (
                            <div key={tour.id} className="text-xs">
                                <span>{tour.name}</span>
                                <Button 
                                type="button"
                                className="ml-auto text-xs"
                                variant="link"
                                onClick={() => {
                                    bl.setSelectedTour(tour.ref)
                                }}
                                disabled={bl.selectedTour === tour.ref}
                                > Select </Button>
                                <Separator />
                            </div>
                        ))}
                    </ul>
                    ) : (
                    <span className="text-xs">No tours found.</span>
                    )
                )}
            </div>
            <div className="flex flex-col">
            {bl.selectedTour && ( 
                <EditTourForm
                    merchantId={props.merchantId}
                    tourId={bl.selectedTour.id} />
            )}
            </div>
        </div>
    )
}

export default EditTourDetails;
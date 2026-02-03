import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useEditVendorLocations, { UpdateVendorFormSchema } from "./_hooks/UseEditVendorLocations"
import { useFieldArray } from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import AddressInput from "@/components/ux/AddressInput"
import HashTagInput from "@/components/ux/HashtagInput"
import { useEffect, useState } from "react"
import { capitalizeWords, escape_key } from "@/lib/functions"
import useFormStatus from "@/components/utils/UseFormStatus"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { uuid } from "uuidv4"
import { Carousel, CarouselContent, CarouselPrevious, CarouselNext, CarouselItem, CarouselButton } from "@/components/ux/Carousel"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {

    const { merchantId } = props

    const {form, isLoading, mutation} = useEditVendorLocations(merchantId)
    const status = useFormStatus()

    const locations = useFieldArray({
        control: form.control,
        name: 'locations'
    })

    useEffect(() => {
        locations.replace(form.getValues().locations)
    }, [isLoading])

    return {
        form,
        isLoading,
        locations,
        status,
        save: async (values: UpdateVendorFormSchema) => {
            await status.submit(mutation.mutateAsync, values, () => {})
        },
        saveAndClose: async (values: UpdateVendorFormSchema) => {
            await status.submit(mutation.mutateAsync, values, () => {
                escape_key();
            })
        }
    }

}

const EditMerchantLocations : React.FC<Props> = (props) => {
    const bl = useBL(props)

    const [scrollTo, setScrollTo] = useState<number>(0)

    return (
        <DialogContent className="w-[750px] h-[550px] flex flex-col">
            <DialogHeader>
                <DialogTitle>Edit your locations</DialogTitle>
            </DialogHeader>
            { bl.isLoading && <div>...</div> }
            { !bl.isLoading &&
              <Form {...bl.form}>
                <form 
                    className="flex flex-col mt-3 w-full flex-grow"
                    onSubmit={bl.form.handleSubmit(bl.save)}>
                        <div className="flex flex-row w-full flex-grow">
                            <Button 
                                variant="outline" 
                                type="button"
                                onClick={() => {
                                    bl.form.setValue("locations", [...bl.form.getValues().locations ?? [], { id: uuid(), title: "Location", services: [] }] as any[])
                                    setScrollTo(bl.form.getValues().locations.length - 1)
                                }}
                                className="flex-none w-[60px] h-full flex items-center justify-center mr-3">
                                <PlusIcon size={24} />
                            </Button>
                            <Carousel 
                                opts={{
                                    startIndex: scrollTo,
                                }}
                                className="w-full h-full overflow-x-hidden">
                                <CarouselContent className="h-[345px]">
                                 {bl.locations.fields.map((field, index) => {
                                    return (
                                        <CarouselItem
                                            key={field.id}
                                            className="flex-none flex flex-col space-y-3 p-3 border border-input rounded-xl w-[300px] mr-3 mb-2">
                                            <FormField
                                                control={bl.form.control}
                                                name={`locations.${index}.title`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Name" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            <FormField
                                                control={bl.form.control}
                                                name={`locations.${index}.address`}
                                                render={({field}) => (
                                                    <FormItem>
                                                    <FormControl>
                                                            <AddressInput {...field} placeholder="Physical address" />
                                                    </FormControl>
                                                    </FormItem>
                                                )} />
                                            <FormField
                                                control={bl.form.control}
                                                name={`locations.${index}.services`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-grow h-0">
                                                        <FormControl>
                                                            <HashTagInput 
                                                                {...field}
                                                                withPreview={true}
                                                                className="h-full"
                                                                seperators={[","]}
                                                                encodeTagFn={capitalizeWords}
                                                                placeholder="Services offered" />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                                <CarouselButton
                                                    className="flex-none"
                                                    onSelect={() => bl.locations.remove(index)}>
                                                    <Trash2Icon size={16} />
                                                </CarouselButton>
                                        </CarouselItem>
                                    )
                                })}
                                </CarouselContent>
                                <div className="flex flex-row mt-2 space-x-3">
                                    <CarouselPrevious />
                                    <CarouselNext />
                                </div>
                            </Carousel>
                        </div>
                        <DialogFooter className="flex flex-row space-x-3 mt-4">
                            <CancelDialogButton />
                            <Button
                                variant={bl.status.button.variant}
                                type="submit"
                                className="flex-grow">
                                    {bl.status.formState == "idle" ? "Save" : bl.status.button.title}
                            </Button>
                            <Button
                                variant={bl.status.button.variant}
                                type="button"
                                onClick={() => bl.form.handleSubmit(bl.saveAndClose)()}
                                className="flex-grow">
                                    {bl.status.formState == "idle" ? "Save & Close" : bl.status.button.title}
                            </Button>
                        </DialogFooter>
                </form>
              </Form>
            }
        </DialogContent>
    )
}

export default EditMerchantLocations
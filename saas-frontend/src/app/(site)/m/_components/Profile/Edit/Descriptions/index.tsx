import UseVendorDescriptions from "@/app/(site)/m/_hooks/UseVendorDescriptions"
import useEditVendorDescriptions, { UpdateVendorFormSchema, VendorDescriptionSchema } from "./_hooks/UseEditVendorDescriptions"
import useFormStatus from "@/components/utils/UseFormStatus"
import { clone, escape_key } from "@/lib/functions"
import { DialogContent } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { v4 as uuid } from "uuid"
import { Input } from "@/components/ui/input"
import RichTextInput from "@/components/ux/RichTextInput"
import FileUploader from "@/components/ux/FileUploader"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Carousel, CarouselButton, CarouselContent, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel"
import { useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const [startIndex, setStartIndex] = useState(0)
    const vendorInformationResponse = UseVendorDescriptions(props.merchantId)

    const makeDescription = useForm<VendorDescriptionSchema>({
        defaultValues: {
            id: uuid(),
            title: '',
            body: '',
            supporting_images: []
        }
    })

    // this is the one to update existing descriptions
    const editVendor = useEditVendorDescriptions(props.merchantId)
    const formStatus = useFormStatus();

    // we need to watch the descriptions
    editVendor.form.watch('descriptions')

    const descriptions = editVendor.form.getValues().descriptions ?? []
    const activeDescription = makeDescription.getValues()
    const updateActive = descriptions.some(x => x.id == activeDescription.id)

    return {
        formStatus,
        startIndex,
        vendorInformationResponse,
        hasLoaded: editVendor.hasLoaded,
        form: makeDescription,
        control: makeDescription.control,
        values: activeDescription,
        descriptions,
        setDescriptions: (descriptions: VendorDescriptionSchema[], options?: { shouldValidate?: boolean, shouldDirty?: boolean }) => {
            editVendor.form.setValue('descriptions', descriptions, options)
        },
        setEdit: (description: VendorDescriptionSchema) => {
            makeDescription.reset(description)
        },
        editActive: updateActive,
        submit: (values: VendorDescriptionSchema) => {
            if (formStatus.formState != 'idle') return
            // update the vendor descriptions if it exists (lookup via id)
            const newDescriptions = editVendor.form.getValues().descriptions
            const existing = newDescriptions.find(x => x.id == values.id)
            if (existing) {
                const idx = newDescriptions.indexOf(existing)
                newDescriptions[idx] = values
            } else {
                newDescriptions.push(values)
            }
            makeDescription.reset({
                id: uuid(),
                title: '',
                body: '',
                supporting_images: []
            })
            // then set the start position
            setStartIndex(newDescriptions.length - 1)
        },
        finish: async (values: UpdateVendorFormSchema) => 
            formStatus.submit(
                editVendor.mutation.mutateAsync, 
                values,
                escape_key
            )
    }
}

const ViewDescriptionComponent:React.FC<{description: VendorDescriptionSchema}> = ({description}) => {
    return (
        <div className="flex flex-col space-y-2 p-2 h-full">
            <h3 className="text-lg font-semibold">{description.title}</h3>
            <div className="h-0.5 bg-black w-full" />
            <Carousel className="w-full">
                <CarouselContent>
                {(description.supporting_images ?? []).map((img, idx) => (
                    <CarouselItem 
                        key={idx}
                        className="relative w-1/4 aspect-video">
                        <Image 
                            src={img.url} 
                            layout="fill"
                            objectFit="contain"
                            alt={img.title} />
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
            <p className="p-2 flex-grow h-0 overflow-y-auto" dangerouslySetInnerHTML={{ __html: description.body }} />
        </div>
    )
}

const EditMerchantDescriptionsComponent: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.hasLoaded) return <></>

    return (
        <DialogContent
            className="grid grid-cols-2 max-w-none w-[750px] h-[640px] gap-3">
            <Form
                {...bl.form}>
                <form
                    key={bl.values.id}
                    className="flex flex-col" onSubmit={bl.form.handleSubmit(bl.submit)}>
                    <h3 className="text-lg font-bold">{bl.editActive ? "Update description" : "Manage your descriptions"} </h3>
                    <p className="text-sm text-slate-400 p-2">
                        {bl.editActive ? `Okay nice, lets update this description.`
                            : `Use below to draft one of the descriptions for your profile.`
                        }</p>
                    <div className="flex flex-col space-y-2">
                    <FormField
                        name="title"
                        control={bl.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Headline
                                </FormLabel>
                                <Input  {...field} />
                            </FormItem>
                        )} />
                    <FormField
                        name="supporting_images"
                        control={bl.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Supporting Images
                                </FormLabel>
                                <div className="flex flex-row space-x-2">
                                    <FileUploader   
                                        id="merchant_supporting_images"
                                        className="flex-none w-[60px] h-[40px] rounded-sm"
                                        {...field}
                                        // we don't want to show any values
                                        value={undefined}
                                        connection={{
                                            container: 'public',
                                            relative_path: `vendor/${props.merchantId}/descriptions/${bl.values.id}`
                                        }}
                                        allowMultiple={true}
                                        acceptOnly={{
                                            type: 'IMAGE',
                                            orientation: 'LANDSCAPE'
                                        }} 
                                        targetImage={{
                                            width: 800,
                                            height: 600
                                        }}     
                                        targetImageVariants={[]}
                                        onDropAsync={() => {
                                            // we just do nothing
                                        }}   
                                        onUploadCompleteAsync={(files) => {
                                            // now we need to update the supporting images
                                            const newImages = bl.values.supporting_images ?? []
                                            files.forEach(file => {
                                                newImages.push({
                                                    name: file.name,
                                                    url: file.url,
                                                    urlRelative: file.urlRelative,
                                                    size: file.size,
                                                    type: file.type,
                                                    title: 'Supporting image',
                                                    description: 'A supporting image for the merchant description',
                                                    hashtags: []
                                                })
                                            })
                                            field.onChange(newImages)
                                        }}
                                    />
                                    <Carousel className="flex flex-row space-x-2 flex-grow items-center">
                                        <CarouselPrevious />
                                        <CarouselContent className="flex-grow">
                                            {(bl.values.supporting_images ?? []).map((img, idx) => (
                                                <CarouselItem 
                                                    className="relative flex-none w-1/3 aspect-video"
                                                    key={idx}>
                                                    <Image 
                                                        src={img.url} 
                                                        layout="fill"
                                                        objectFit="contain"
                                                        alt={img.title} />
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselNext />
                                    </Carousel>
                                </div>
                            </FormItem>
                        )} />
                    <FormField
                        name="body"
                        control={bl.control}
                        render={({ field }) => (
                            <FormItem>
                                <RichTextInput 
                                    label="Detailed Explanation"
                                    maxWords={500}
                                    className="h-[300px] w-full"
                                    {...field} 
                                />
                            </FormItem>
                        )} />
                    </div>
                    <div className="flex flex-row space-x-3 mt-auto">
                        <CancelDialogButton
                            onCancel={() => {
                                bl.form.reset({
                                    id: uuid(),
                                    title: '',
                                    body: '',
                                    supporting_images: []
                                })
                            }} 
                            label={!bl.editActive ? "Reset" : "Discard"}/>
                        <Button 
                            variant="default"
                            type="submit"
                            className="flex-grow"
                            >
                            { bl.editActive ? "Update" : "Add another description" }
                        </Button>
                    </div>
                </form>
            </Form>
            <div className="flex flex-col">
                <h3 className="text-lg font-bold">Finalise all descriptions</h3>
                <p className="text-sm text-slate-400 p-2">Just a heads-up: While it looks like a carousel here, it will show up as an accordion in your profile.</p>
                <Carousel 
                    className="flex flex-col flex-grow min-h-0"
                    opts={{
                        slidesToScroll: 1,
                        startIndex: bl.startIndex
                    }}>
                    <CarouselContent className="flex flex-grow w-full">
                        {bl.descriptions.map((desc, idx) => (
                            <CarouselItem key={idx} className="max-w-full min-w-full flex-grow">
                                <ViewDescriptionComponent description={desc} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <div className="flex flex-row justify-between">
                        <div className="flex flex-row space-x-3">
                            { bl.descriptions.length > 0 &&
                                <>
                                <CarouselButton
                                    onSelect={(index) => {
                                        bl.setEdit(bl.descriptions[index])
                                    }}
                                    >
                                    <PencilIcon size={14} />
                                </CarouselButton>
                                <CarouselButton
                                    disabled={bl.descriptions.length == 0}
                                    onSelect={(index) => {
                                        const newDescriptions = clone(bl.descriptions)
                                        newDescriptions.splice(index, 1)
                                        bl.setDescriptions(newDescriptions, { shouldValidate: true })
                                    }}
                                    >
                                    <Trash2Icon size={14} />
                                </CarouselButton>
                                </>
                            }
                            <CarouselPrevious />
                            <CarouselNext />
                        </div>
                        <CarouselDots />
                    </div>
                </Carousel>
                <div className="flex flex-row mt-4 space-x-2">
                    <CancelDialogButton />
                    <Button 
                        className="flex-grow"
                        type="button"
                        onClick={() => {
                            bl.finish({
                                id: props.merchantId,
                                descriptions: bl.descriptions
                            })
                        }}
                        variant={bl.formStatus.button.variant}>{
                            bl.formStatus.formState === 'idle' ? "Save to profile" : bl.formStatus.button.title
                        }
                    </Button>
                </div>
            </div>
        </DialogContent>
    )
}

export default EditMerchantDescriptionsComponent
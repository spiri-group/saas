'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useParams } from "next/navigation";
import { DateTime } from "luxon";
import SocialPost from "../Feed/components/Post";
import UseCreatePostForMerchant, { CreatePostSchema } from "./hooks/UseCreatePostForMerchant";
import { Panel } from "@/components/ux/Panel";

import HashTagInput from "@/components/ux/HashtagInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import IconButton from "@/components/ui/iconbutton";
import { Paintbrush } from "lucide-react";
import TextFormatterInput from "@/components/ux/TextFormatterInput";
import ColorPickerDropDown from "@/components/ux/ColorPickerDropDown";
import FileUploader from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import { escape_key } from "@/lib/functions";

const useBL = () => {
    const params = useParams();
    if (params == null || params.merchantId == null) throw `merchantId is null`

    const { form, values, mutation } = UseCreatePostForMerchant(params.merchantId as string)

    return {
        merchantId : params != null ? params.merchantId : null,
        form, values,
        submit: async (values: CreatePostSchema) => {
            await mutation.mutateAsync(values)
            escape_key()
        }
    }
    
}

const SocialPostPreview : React.FC<{ 
    form: UseFormReturn<CreatePostSchema>
}> = (props) => {
    
    useWatch({control: props.form.control})

    const values = props.form.getValues();

    return (
        <div className="flex flex-col h-full">
            <Label className="text-xl mb-2"> Preview </Label>
            <SocialPost 
                className="flex-grow p-2"
                disableInteraction={true}
                socialPost={
                {
                    id: values.id,
                    type: values.type,
                    title: values.title ?? "",
                    description: values.description ?? "",
                    vendorId: "", 
                    customerId: "",
                    ref: null as any,
                    availableAfter: DateTime.fromJSDate(values.availableAfter).toISO() as string,
                    media: undefined,
                    hashtags: values.hashtags,
                    content: values.content as any
                }
            } />
        </div>
    )
}

const CreateSocialPost : React.FC = () => {
    const bl = useBL()

    if (bl.merchantId == null) return null;
    
    return (
        <>
            <div className="grid grid-cols-2">
                <Form {...bl.form} > 
                    <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col h-full pr-4">
                        <div className="space-y-2">
                            <div className="flex flex-col">
                                <h2 className="text-slate-600 mb-2">Post Content</h2>
                                <div className="p-2 space-y-2">
                                    <div className="flex flex-row">
                                        <div className="flex-none w-[450px] flex flex-row items-start space-x-4">
                                            <FormField
                                                name="content.backgroundType"
                                                render={({field}) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>Background</FormLabel>
                                                        <FormControl>
                                                            <RadioGroup onValueChange={(value) => {
                                                                bl.form.setValue(field.name, (value as any), {shouldValidate: true})
                                                            }} defaultValue="none">
                                                                <div className="flex flex-row items-center space-x-2">
                                                                    <RadioGroupItem value="none" id="none" />
                                                                    <Label htmlFor="none">None</Label>
                                                                </div>
                                                                <div className="flex flex-row items-center space-x-2">
                                                                    <RadioGroupItem value="color" id="r4" />
                                                                    <Label htmlFor="r4">Color</Label>
                                                                </div>
                                                                <div className="flex flex-row items-center space-x-2">
                                                                    <RadioGroupItem value="image" id="r4" />
                                                                    <Label htmlFor="r4">Image</Label>
                                                                </div>
                                                            </RadioGroup>
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            <div className="flex-none w-[100px]">
                                                { (bl.values.content as any).backgroundType == "color" && (
                                                    <FormField 
                                                        control={bl.form.control}
                                                        name="content.backgroundColor"
                                                        render={({ field }) => (
                                                        <FormControl className="">
                                                            <ColorPickerDropDown 
                                                                className="flex-none w-[100px] aspect-square"
                                                                placeholder={"Select colour"}
                                                                {...field} />
                                                        </FormControl>
                                                    )} />
                                                )}
                                                { (bl.values.content as any).backgroundType == "image" && (
                                                    <FormField
                                                        name="content.backgroundImage"
                                                        render={({field}) => (
                                                            <FormControl>
                                                                <FileUploader 
                                                                    id={bl.values.id}
                                                                    className={"w-[100px] aspect-square border-slate-400 border border-dashed"} 
                                                                    connection={{
                                                                        container: "public",
                                                                        relative_path: `merchant/${bl.merchantId}/socialPost/${bl.values.id}`
                                                                    }} 
                                                                    targetImage={{
                                                                        height: 345,
                                                                        width: 345
                                                                    }}
                                                                    value={field.value != null ? field.value.url : []}
                                                                    targetImageVariants={[]}
                                                                    onDropAsync={function (): void {
                                                                        field.onChange(null)
                                                                    }} 
                                                                    onUploadCompleteAsync={function (files: media_type[]): void {
                                                                        field.onChange(files[0])
                                                                    }}                                    
                                                                />
                                                            </FormControl>
                                                        )} />  
                                                )}
                                            </div>
                                        </div>
                                        <FormField
                                            name="content.textVerticalAlignment"
                                            render={({ field }) => (
                                                <FormItem className="flex-grow flex flex-col pl-2">
                                                    <FormLabel className="text-wrap mb-2">Text alignment</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={(value) => 
                                                            bl.form.setValue(field.name, (value as any), {shouldValidate: true})
                                                        } defaultValue="top">
                                                            <div className="flex flex-row items-center space-x-2">
                                                                <RadioGroupItem value="top" id="r1" />
                                                                <Label htmlFor="r1">Top</Label>
                                                            </div>
                                                            <div className="flex flex-row items-center space-x-2">
                                                                <RadioGroupItem value="center" id="r2" />
                                                                <Label htmlFor="r2">Center</Label>
                                                            </div>
                                                            <div className="flex flex-row items-center space-x-2">
                                                                <RadioGroupItem value="bottom" id="r3" />
                                                                <Label htmlFor="r3">Bottom</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                    </div>
                                    <div className="flex flex-row items-center">
                                        <FormItem className="flex flex-row items-center space-x-3 w-full">
                                            <FormLabel>Overlay text 1</FormLabel>
                                            <FormField
                                                control={bl.form.control}
                                                name="content.mainText.format"
                                                render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger>
                                                        <IconButton type="button" variant="link" className="w-full cursor-pointer" icon={<Paintbrush />} />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="flex-none w-[500px]">
                                                        <TextFormatterInput {...field} />     
                                                    </PopoverContent>
                                                </Popover>
                                                )}
                                            />
                                            <FormField 
                                                control={bl.form.control}
                                                name="content.mainText.content"
                                                render={({ field }) => (
                                                <FormControl className="flex-grow">
                                                    <Input placeholder="Main text" {...field} />
                                                </FormControl>
                                            )} />
                                        </FormItem>
                                    </div>
                                    <div className="flex flex-row">
                                        <FormItem className="flex flex-row items-center space-x-3 w-full">
                                            <FormLabel>Overlay text 2</FormLabel>
                                            <FormField
                                                control={bl.form.control}
                                                name="content.subText.format"
                                                render={({ field }) => (
                                                <Popover>
                                                    <PopoverTrigger>
                                                        <IconButton type="button" variant="link" className="w-full cursor-pointer" icon={<Paintbrush />} />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="flex-none w-[500px]">
                                                        <TextFormatterInput {...field} />     
                                                    </PopoverContent>
                                                </Popover>
                                                )}
                                            />
                                            <FormField 
                                                control={bl.form.control}
                                                name="content.subText.content"
                                                render={({ field }) => (
                                                <FormControl className="flex-grow">
                                                    <Input placeholder="Sub text" {...field} />
                                                </FormControl>
                                            )} />
                                        </FormItem>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-slate-600 mb-2">Post details</h2>
                                <div className="p-2 space-y-2">
                                    <FormField 
                                        control={bl.form.control}
                                        name="title"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="message" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField 
                                        control={bl.form.control}
                                        name="hashtags"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <HashTagInput {...field} placeholder="Hashtags" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField 
                                        control={bl.form.control}
                                        name="description"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="my-2">See more</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Further explanation ..." {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            {/* <RadioGroup defaultValue="now" className="flex flex-row">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="now" id="r1" />
                                    <Label htmlFor="r1">Post Now</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="schedule" id="r2" />
                                    <Label htmlFor="r2">Schedule</Label>
                                </div>
                            </RadioGroup> */}
                        </div>
                        <Button className="mt-auto w-full" type="submit">Post</Button>
                    </form>
                </Form>
                <Panel className="mx-3 mt-3">
                    <SocialPostPreview form={bl.form} />
                </Panel>
            </div>
        </> 
    )
}

export default CreateSocialPost;
'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useParams } from "next/navigation";
import { DateTime } from "luxon";
import SocialPost from "../Feed/components/Post";
import { Panel } from "@/components/ux/Panel";

import HashTagInput from "@/components/ux/HashtagInput";
import UseCreatePostForCustomer, { CreatePostSchema } from "./hooks/UseCreatePostForCustomer";
import { escape_key } from "@/lib/functions";

type Props = BLProps & {
}

type BLProps = {
    gql_conn: gql_conn_type
}

const useBL = () => {
    const params = useParams();
    if (params == null || params.userId == null) throw `userId is null`

    const { form, values, mutation } = UseCreatePostForCustomer(params.userId as string)

    return {
        userId : params.userId,
        form, values,
        submit: async (values: CreatePostSchema) => {
            await mutation.mutateAsync(values)
            escape_key()
        }
    }
    
}

const SocialPostPreview : React.FC<{ 
    control: UseFormReturn<CreatePostSchema>["control"]
}> = (props) => {
    
    const values = useWatch({control: props.control})

    return (
        <div>
            <Label className="text-xl mb-2"> Preview </Label>
            <SocialPost 
                className="p-2"
                disableInteraction={true}
                socialPost={
                {
                    ...values,
                    vendorId: "",
                    customerId: "",
                    ref: null as any,
                    availableAfter: values.availableAfter ? DateTime.fromJSDate(values.availableAfter).toISO() as string : undefined,
                    media: undefined,
                    hashtags: values.hashtags
                } as any
            } />
        </div>
    )
}

const CreateSocialPost : React.FC<Props> = () => {
    const bl = useBL()

    if (bl.userId == null) return null;
    
    return (
        <>
            <div className="grid grid-cols-2">
                <Form {...bl.form} > 
                    <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col h-full">
                        <div className="space-y-2">
                            <FormLabel className="text-xl"> Create a new social post </FormLabel>
                            <Tabs defaultValue="photoandvideo">
                                <TabsList>
                                    <TabsTrigger value="photoandvideo">Photo or Video</TabsTrigger>
                                    <TabsTrigger value="link">Embed Link</TabsTrigger>
                                </TabsList>
                                <TabsContent className="h-full" value="photoandvideo">
                                    <FormField 
                                        control={bl.form.control}
                                        name="media"
                                        render={() => {
                                            return (
                                                <FormItem>
                                                    <FormControl>
                                                    {/* <FileUploader
                                                        className={"w-[300px] aspect-video"} 
                                                        connection={{
                                                            container: "public",
                                                            relative_path: `profile/${bl.userId}/socialpost/${bl.values.id}}`
                                                        }} 
                                                        onDropAsync={function (files: string[]): void {
                                                        throw new Error("Function not implemented.");
                                                        }} 
                                                        onUploadCompleteAsync={function (files: media_type[]): void {
                                                            bl.form.setValue(field.name, files.map(f => f.url))
                                                        }}                                    
                                                    /> */}
                                                    </FormControl>
                                                </FormItem>
                                            )
                                        
                                    }}/>
                                </TabsContent>
                                <TabsContent className="h-full" value="link">
                                    <FormField 
                                        control={bl.form.control}
                                        name="embed"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Embed link" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </TabsContent>
                            </Tabs>
                            <FormField 
                                control={bl.form.control}
                                name="description"
                                render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea placeholder="Description" {...field} />
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
                            <RadioGroup defaultValue="now" className="flex flex-row">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="now" id="r1" />
                                    <Label htmlFor="r1">Post Now</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="schedule" id="r2" />
                                    <Label htmlFor="r2">Schedule</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <Button className="mt-auto w-full" type="submit">Post</Button>
                    </form>
                </Form>
                <Panel className="mx-3 mt-3">
                    <SocialPostPreview 
                        control={bl.form.control} />
                </Panel>
            </div>
        </> 
    )
}

export default CreateSocialPost;
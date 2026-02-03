'use client'

import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UseCreateReview from "./hooks/UseCreateReview";
import RatingStarInput from "@/components/ux/RatingStarInput";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { escape_key } from "@/lib/functions";

type BLProps = {
    objectId: string
    objectPartition: string
}

const useBL = (props: BLProps) => {

    const createRatingAndReview = UseCreateReview(props.objectId, props.objectPartition)

    return {
        form: createRatingAndReview.form,
        submit: async (data: z.infer<typeof createRatingAndReview.schema>) => {
            await createRatingAndReview.mutation.mutateAsync(data) 
            createRatingAndReview.form.reset({
                headline: "",
                text: ""
            });
            escape_key()
        }
    }
}

type Props = BLProps & {
    className?: string
    useMerchantTheming?: boolean
}

const NewReview : React.FC<Props> = (props) => {
    const bl =  useBL(props);

    // Apply merchant theming classes if enabled
    const triggerClass = props.useMerchantTheming
        ? "text-xs md:text-base text-merchant-links hover:underline"
        : "text-xs md:text-base";

    const headerClass = props.useMerchantTheming
        ? "text-merchant-headings-foreground"
        : "";

    const labelClass = props.useMerchantTheming
        ? "text-merchant-default-foreground"
        : "";

    return (
        <div className="ml-auto">
            <div className="hidden md:block">
                <Dialog>
                    <DialogTrigger className={triggerClass}>
                        Add Review
                    </DialogTrigger>
                    <DialogContent className="flex flex-col w-[500px] h-[420px]">
                        <Form {...bl.form}>
                        <form className={cn("flex flex-col space-y-4", props.className)}
                            onSubmit={bl.form.handleSubmit(bl.submit)}>
                            <h1 className={headerClass}> Create Review </h1>
                            <FormLabel className={labelClass}> Overall Rating </FormLabel>
                            <FormField 
                                name="rating"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RatingStarInput {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormLabel className={labelClass}> Headline </FormLabel>
                            <FormField 
                                name="headline"
                                control={bl.form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                placeholder="What's most important to know?"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormLabel className={labelClass}> Add a written review </FormLabel>
                            <FormField 
                                name="text"
                                control={bl.form.control}
                                render={({field}) => {
                                    return (
                                        <FormItem>
                                            <FormControl>
                                            <Textarea 
                                                placeholder="Share details of your own experience here"
                                                {...field} 
                                                onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    // if the number of chacters is less than 22 dont run
                                                    if (e.currentTarget.value.length < 22) {
                                                        if (target.scrollHeight > 40) {
                                                            target.style.height = '40px';
                                                        }
                                                        return;
                                                    };
                                                // otherwise transform to scroll height with some padding
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 2 + 'px';
                                                }}
                                                style={{
                                                    maxHeight: "100px",
                                                    minHeight: 40,
                                                    padding: "8px", // Add some padding
                                                    boxSizing: "border-box",
                                                    height: 100,
                                                    resize: "none"
                                                }}
                                                maxLength={140}
                                            />
                                            </FormControl>
                                        </FormItem>
                                    )
                                }} 
                            />
                        <Button type="submit" className="flex mt-auto"> Send </Button>
                        </form>
                    </Form>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="block md:hidden">
                <Drawer>
                    <DrawerTrigger className="ml-auto mb-2 text-xs md:text-base">
                        Add Review
                    </DrawerTrigger>
                    <DrawerContent className="p-4 h-[95%]">
                        <Form {...bl.form}>
                            <form className={cn("flex flex-col space-y-4", props.className)}
                                onSubmit={bl.form.handleSubmit(bl.submit)}>
                                <h1> Create Review </h1>  
                                <FormLabel> Overall Rating </FormLabel>
                                <FormField 
                                    name="rating"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <RatingStarInput {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormLabel> Headline </FormLabel>
                                <FormField 
                                    name="headline"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input 
                                                    {...field} 
                                                    placeholder="What's most important to know?"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormLabel> Add a written review </FormLabel>
                                <FormField 
                                    name="text"
                                    control={bl.form.control}
                                    render={({field}) => {
                                        return (
                                            <FormItem>
                                                <FormControl>
                                                <Textarea 
                                                    placeholder="Share details of your own experience here"
                                                    {...field} 
                                                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        // if the number of chacters is less than 22 dont run
                                                        if (e.currentTarget.value.length < 22) {
                                                            if (target.scrollHeight > 40) {
                                                                target.style.height = '40px';
                                                            }
                                                            return;
                                                        };
                                                    // otherwise transform to scroll height with some padding
                                                        target.style.height = 'auto';
                                                        target.style.height = target.scrollHeight + 2 + 'px';
                                                    }}
                                                    style={{
                                                        maxHeight: "100px",
                                                        minHeight: 40,
                                                        padding: "8px", // Add some padding
                                                        boxSizing: "border-box",
                                                        height: 100,
                                                        resize: "none"
                                                    }}
                                                    maxLength={140}
                                                />
                                                </FormControl>
                                            </FormItem>
                                        )
                                    }} 
                                />
                            <Button type="submit" className="flex mt-2"> Send </Button>
                            </form>
                        </Form>
                        <DrawerClose>
                            <Button variant="outline" className="w-full mt-2">Cancel</Button>
                        </DrawerClose>
                    </DrawerContent>
                </Drawer>
            </div>
        </div> 
    )
}

export default NewReview
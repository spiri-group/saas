import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Props = {
    control: any
}

const PropertyHouseForm: React.FC<Props> = (props) => {
 
    return (
        <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
                <AccordionTrigger>Where should we leave your packages at this address?</AccordionTrigger>
                <AccordionContent>
                    <FormField
                        control={props.control}
                        name="dropOffPackage"
                        render={(typeField) => (
                            <RadioGroup
                            onValueChange={typeField.field.onChange}
                            value={typeField.field.value ?? ""}
                            className="flex flex-col"
                            >
                            <div className="flex items-center space-x-1">
                                <RadioGroupItem value="FRONT_DOOR" />
                                <Label className="mr-2">Front door</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                                <RadioGroupItem value="BACK_DOOR" />
                                <Label className="ml-2">Back door</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                                <RadioGroupItem value="SIDE_PORCH" />
                                <Label className="ml-2">Side porch</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                                <RadioGroupItem value="OUTSIDE_GARAGE" />
                                <Label className="ml-2">Outside garage</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                                <RadioGroupItem value="NO_PREFERENCE" />
                                <Label className="ml-2">No preference</Label>
                            </div>
                            </RadioGroup>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Do we need a security code, call box number or key to access this building?</AccordionTrigger>
                <AccordionContent className="flex flex-col">
                <FormField
                    name="securityCode"
                    control={props.control}
                    render={({ field }) => (
                    <FormItem className="flex-grow flex flex-row items-center">
                        <FormLabel className="w-40">Security code</FormLabel>
                        <FormControl className="flex-grow">
                            <Input {...field} value={field.value ?? ""} placeholder="Security code" />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <FormField
                    name="callBox"
                    control={props.control}
                    render={({ field }) => (
                    <FormItem className="flex-grow flex flex-row items-center">
                        <FormLabel className="w-40">Call box</FormLabel>
                        <FormControl className="flex-grow">
                            <Input {...field} value={field.value ?? ""} placeholder="Call box" />
                        </FormControl>
                    </FormItem>
                    )}
                />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
                <AccordionTrigger>Is this address closed for deliveries on Saturdays & Sundays?</AccordionTrigger>
                <AccordionContent className="flex flex-row space-x-4">
                    <FormField
                        control={props.control}
                        name="openSaturday"
                        render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                            <FormLabel> Saturdays </FormLabel>
                            <FormControl>
                                <div className="flex flex-row space-x-2">
                                    <Button
                                        onClick={() => field.onChange(field.value === true ? null : true)}
                                        variant={field.value === true ? "default" : "outline"}> Open </Button>
                                    <Button
                                        onClick={() => field.onChange(field.value === false ? null : false)}
                                        variant={field.value === false ? "default" : "outline"}> Closed     </Button>
                                </div>
                            </FormControl>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={props.control}
                        name="openSunday"
                        render={({ field }) => (
                        <FormItem className="flex flex-col space-y-2">
                            <FormLabel> Sunday </FormLabel>
                            <FormControl>
                                <div className="flex flex-row space-x-2">
                                    <Button
                                        onClick={() => field.onChange(field.value === true ? null : true)}
                                        variant={field.value === true ? "default" : "outline"}> Open </Button>
                                    <Button
                                        onClick={() => field.onChange(field.value === false ? null : false)}
                                        variant={field.value === false ? "default" : "outline"}> Closed     </Button>
                                </div>
                            </FormControl>
                        </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
                <AccordionTrigger>Do you have a dog at this address?</AccordionTrigger>
                <AccordionContent>
                    <FormField
                        control={props.control}
                        name="haveDog"
                        render={({ field }) => (
                        <FormItem className="flex flex-row space-x-2">
                            <FormControl>
                            <div className="flex flex-row space-x-2">
                                <Button
                                    onClick={() => field.onChange(true)}
                                    variant={field.value === true ? "default" : "outline"} > Yes </Button>
                                <Button
                                    onClick={() => field.onChange(false)}
                                    variant={field.value === false ? "default" : "outline"}> No </Button>
                            </div>
                            </FormControl>
                        </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
                <AccordionTrigger>Do we need additional instructions to deliver to this address?</AccordionTrigger>
                <AccordionContent className="flex flex-col">
                    <FormField
                        name="details"
                        control={props.control}
                        render={({ field }) => (
                            <FormItem className="flex-grow flex flex-row items-center">
                                <FormControl className="flex-grow">
                                    <Textarea {...field} value={field.value ?? ""} placeholder="Provide other details here" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}

export default PropertyHouseForm;
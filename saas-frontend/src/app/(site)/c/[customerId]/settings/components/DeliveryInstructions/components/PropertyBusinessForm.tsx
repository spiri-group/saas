import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
    control: any
}

const PropertyBusinessForm: React.FC<Props> = (props) => {
    
    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return (   
        <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
                <AccordionTrigger>When is this address open for deliveries?</AccordionTrigger>
                <AccordionContent className="flex flex-col space-y-4">
                    {daysOfWeek.map((day, index) => (
                        <FormField
                            key={index}
                            control={props.control}
                            name={`onDefaultDays.${index}`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            className="mr-2"
                                            checked={field.value === day}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    field.onChange(day)
                                                } else {
                                                    field.onChange(undefined)
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="mt-1">{day}</FormLabel>
                                </FormItem>
                            )}
                        />
                    ))}
                    <FormField
                        control={props.control}
                        name="onFederalHolidays"
                        render={({ field }) => (
                            <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Can this address receive deliveries on federal holidays?</FormLabel>
                                <FormControl>
                                    <div className="flex flex-row space-x-2">
                                        <Button onClick={() => field.onChange(true)} variant={field.value === true ? 'default' : 'outline'}>Yes</Button>
                                        <Button onClick={() => field.onChange(false)} variant={field.value === false ? 'default' : 'outline'}>No</Button>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Where should we leave your packages at this address?</AccordionTrigger>
                <AccordionContent>
                    <FormField 
                        name="dropOffPackage"
                        render={(typeField) => (
                            <RadioGroup onValueChange={typeField.field.onChange} defaultValue={typeField.field.value} className="flex flex-col">
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="FRONT_DOOR"/>
                                    <Label className="mr-2">Front door</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="MAIL_ROOM"/>
                                    <Label className="mr-2">Mailroom</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="PROPERTY_STAFF"/>
                                    <Label className="mr-2">Property Staff</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="BUILDING_RECEPTION"/>
                                    <Label className="mr-2">Building Reception</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="LEASING_OFFICE"/>
                                    <Label className="mr-2">Leasing Office</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="BACK_DOOR"/>
                                    <Label className="ml-2">Back door</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="SIDE_PORCH"/>
                                    <Label className="ml-2">Side porch</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="OUTSIDE_GARAGE"/>
                                    <Label className="ml-2">Outside garage</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="LOADING_DOCK"/>
                                    <Label className="ml-2">Loading dock</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="NO_PREFERENCE"/>
                                    <Label className="ml-2">No preference</Label>
                                </div>
                            </RadioGroup>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
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
            <AccordionItem value="item-4">
                <AccordionTrigger>Is this address closed for deliveries on Saturdays & Sundays?</AccordionTrigger>
                <AccordionContent className="flex flex-row space-x-4">
                    <FormField
                        name="openSaturday"
                        control={props.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Saturdays</FormLabel>
                                <FormControl>
                                    <div className="flex flex-row space-x-2">
                                        <Button onClick={() => field.onChange(field.value === true ? null : true)} variant={field.value === true ? "default" : "outline"}>Open</Button>
                                        <Button onClick={() => field.onChange(field.value === false ? null : false)} variant={field.value === false ? "default" : "outline"}>Closed</Button>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="openSunday"
                        control={props.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-col space-y-2">
                                <FormLabel>Sunday</FormLabel>
                                <FormControl>
                                    <div className="flex flex-row space-x-2">
                                        <Button onClick={() => field.onChange(field.value === true ? null : true)} variant={field.value === true ? "default" : "outline"}>Open</Button>
                                        <Button onClick={() => field.onChange(field.value === false ? null : false)} variant={field.value === false ? "default" : "outline"}>Closed</Button>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
                <AccordionTrigger>Do we need additional instructions to deliver to this address?</AccordionTrigger>
                <AccordionContent>
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

export default PropertyBusinessForm;
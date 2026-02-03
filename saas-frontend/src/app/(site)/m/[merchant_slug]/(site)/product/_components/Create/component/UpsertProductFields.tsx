'use client'

import z from 'zod';
import { v4 as uuid } from 'uuid';
import { Input } from '@/components/ui/input';
import { ControllerRenderProps, UseFormReturn, useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import classNames from 'classnames';
import { isNullOrUndefined, isNullOrWhitespace, upsert } from '@/lib/functions';
import { PopoverTrigger, Popover, PopoverContent } from '@/components/ui/popover';
import ComboBox from '@/components/ux/ComboBox';
import React from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ux/Carousel';

export const unitsOfMeasure = [
    { label: "Piece", value: "pc", type: "other" },
    { label: "Kilogram", value: "kg", type: "weight" },
    { label: "Gram", value: "g", type: "weight" },
    { label: "Pound", value: "lb", type: "weight" },
    { label: "Ounce", value: "oz", type: "weight" },
    { label: "Liter", value: "l", type: "volume" },
    { label: "Milliliter", value: "ml", type: "volume" },
    { label: "Centimeter", value: "cm", type: "length" },
    { label: "Meter", value: "m", type: "length" },
    { label: "Inch", value: "in", type: "length" },
    { label: "Foot", value: "ft", type: "length" }
]
export const UnitsOfMeasure = z.enum(unitsOfMeasure.map(item => item.value) as [string, ...string[]])

export type ProductVariantProperty = z.infer<typeof ProductVariantProperty>

export const ProductVariantProperty = z.object({
    id: z.string().uuid(),
    value: z.string().optional(),
    enabled: z.boolean(),
    sortOrder: z.coerce.number()
}).refine(data => {
    if (!data.enabled) {
        return true;
    } else {
        return !isNullOrWhitespace(data.value)
    }
});

export type ProductProperty = z.infer<typeof ProductProperty>

export const ProductProperty = z.object({
    id: z.string().uuid(),
    key: z.string().min(1),
    valueType: z.enum(["STRING", "BOOLEAN", "QUANTITY"]),
    options: z.array(z.string()).optional().refine(val => !val || val.length > 1, {
        message: "If values are provided, their length must be greater than one"
    }),
    unitOfMeasure: UnitsOfMeasure.optional()
}).superRefine((data, ctx) => {
    if (data.valueType === "QUANTITY" && isNullOrUndefined(data.unitOfMeasure)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Unit of measure is required when valueType is QUANTITY",
            path: ["unitOfMeasure"]
        });
    }
})

export const valueTypes = [
    { label: "Text", value: "STRING" },
    { label: "Yes / No", value: "BOOLEAN" },
    { label: "Quantity", value: "QUANTITY" }
] as { label: string; value: string }[];


const useBL = () => {
    const [isOpen, setIsOpen] = React.useState(false)

    const form = useForm<ProductProperty>({
        resolver: zodResolver(ProductProperty),
        defaultValues: {
            id: uuid(),
            key: "Field 1",
            options: []
        }
    })

    const selectedValueType = form.watch('valueType')

    return {
        form,
        selectedValueType,
        isOpen,
        open: () => setIsOpen(true),
        close: () => {
           form.reset({ id: uuid() }) 
           setIsOpen(false)
        }
    }
}

type Props = ControllerRenderProps<{
    [key: string]: ProductProperty[]
}, any> & {
    className?: string,
    form: UseFormReturn<any>
}

const UpsertProductFields: React.FC<Props> = (props) => {
    const { form, isOpen, open, close, selectedValueType } = useBL()

    const onValid = (values: ProductProperty) => {
        props.onChange(upsert(props.value ?? [], values, { idFields: ['id'] }))
        form.reset({
            id: uuid()
        })
        close();
    }

    const onInvalid = (errors: any) => {
       console.log(errors)
    }   

    return (
        <div className={classNames("flex flex-col pl-1", props.className)}>
            <span className="text-md font-semibold mt-2">Variant Properties</span>
            <p className="text-sm text-gray-500 mt-1">Add custom properties to help define the different versions of your product e.g. color</p>
            <Popover open={isOpen}>
                <PopoverTrigger asChild>    
                    <Button className="w-full my-2" onClick={open}>Add Property</Button>
                </PopoverTrigger>
                <PopoverContent className="p-4 space-y-2">
                    <Form {...form}>
                        <FormField
                            control={form.control}
                            name="key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input {...field} placeholder="Name" />
                                    </FormControl>
                                </FormItem>
                            )} />
                        <FormField
                            control={form.control}
                            name="valueType"
                            render={({ field }) => {
                                const selected = valueTypes.find(item => item.value === field.value)
                                return (
                                    <FormItem>
                                        <FormControl>
                                            <ComboBox 
                                                items={valueTypes}
                                                objectName='Type'
                                                fieldMapping={{
                                                    labelColumn: 'label',
                                                    keyColumn: 'value'
                                                }}
                                                onChange={(selected) => {
                                                    if (!isNullOrUndefined(selected)) {
                                                        form.setValue("valueType", selected.value as any)
                                                    }
                                                }}
                                                value={selected}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )
                        }} />
                        {
                            selectedValueType === "QUANTITY" && (
                                <FormField
                                    control={form.control}
                                    name="unitOfMeasure"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <ComboBox 
                                                    items={unitsOfMeasure}
                                                    objectName='Unit of Measure'
                                                    fieldMapping={{
                                                        labelColumn: 'label',
                                                        keyColumn: 'value'
                                                    }}
                                                    onChange={(selected) => {
                                                        if (!isNullOrUndefined(selected)) {
                                                            form.setValue("unitOfMeasure", selected.value as any)
                                                        }
                                                    }}
                                                    value={unitsOfMeasure.find(item => item.value === field.value)}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                            )
                        }
                        <div className="flex flex-row space-x-2">
                            <Button type="button" variant="link" onClick={close}>Cancel</Button>
                            <Button 
                                className='flex-grow'
                                type="button"
                                onClick={form.handleSubmit(onValid,onInvalid)}>Add</Button>
                        </div>
                    </Form>
                </PopoverContent>
            </Popover>
            <Carousel orientation='vertical' className="flex-grow min-h-0 flex flex-col space-y-2">
                <CarouselPrevious style="RECTANGLE" className="w-full" />
                <CarouselContent outerClassName='flex-grow' className="flex-col space-y-2 text-xs">
                    <CarouselItem className="flex flex-row items-center justify-between border border-primary rounded-xl p-3">
                        <span>Dimensions</span>
                        <span>Predefined</span>
                    </CarouselItem>
                    <CarouselItem className="flex flex-row items-center justify-between border border-primary rounded-xl p-3">
                        <span>Weight</span>
                        <span>Predefined</span>
                    </CarouselItem>
                    <CarouselItem className="flex flex-row items-center justify-between border border-primary rounded-xl p-3">
                        <span>Price & Available Stock</span>
                        <span>Predefined</span>
                    </CarouselItem>
                    {
                    props.value?.map((property, idx) => {
                        const valueType = valueTypes.find(item => item.value === property.valueType)

                        return (
                            <CarouselItem key={idx} className="flex flex-row items-center justify-between border border-primary rounded-xl p-3">
                                <div className='space-x-2 items-center pl-2'>
                                <span>{property.key}</span>
                                <span>:</span>
                                <span>{valueType!.label}</span>
                                </div>
                                <div className='flex flex-row space-x-2 items-center'>
                                    <PencilIcon size={16} className="cursor-pointer" />
                                    <Trash2Icon size={16} className="cursor-pointer" />
                                </div>
                            </CarouselItem>
                        )
                    })
                    }
                </CarouselContent>
                <CarouselNext style="RECTANGLE" className="w-full" />
            </Carousel>
        </div>
    )
}

export default UpsertProductFields;
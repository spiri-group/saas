'use client'

import { Button } from "@/components/ui/button"
import { FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import CurrencyInput, { CurrencyAmountSchema } from "@/components/ux/CurrencyInput"
import RichTextInput from "@/components/ux/RichTextInput"
import { ControllerRenderProps, useFormContext, useWatch } from "react-hook-form"
import { z } from "zod"
import { ProductProperty, ProductVariantProperty, unitsOfMeasure } from "./UpsertProductFields"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel"
import React, { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { countWords, escape_key, isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import ComboBox from "@/components/ux/ComboBox"
import { v4 as uuid } from "uuid"
import { CircleHelpIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from "lucide-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import UpsertProductImages, { MediaInputSchema } from "./UpsertProductImages"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import CountryInput from "@/components/ux/CountryInput"
import { HarmonizedSystemCodeSchema } from "@/lib/services/harmonized-system/types"
import PricingExplanationPopover from "./PricingExplanationPopover"
import HSCodePicker from "./HSCodePicker"


export type ProductVariant = z.infer<typeof ProductVariant>

export const ProductVariant = z.object({
    isDefault: z.boolean(),
    id: z.string().uuid(),
    name: z.string().min(1),
    code: z.string().min(1),
    countryOfOrigin: z.string().min(1),
    countryOfManufacture: z.string().min(1),
    harmonizedTarrifCode: HarmonizedSystemCodeSchema,
    defaultPrice: CurrencyAmountSchema.refine(
      (value) => value.amount > 0, 
      "Price must be greater than 0"
    ),
    returnRate: z.number().min(0).max(1).optional(),
    requireReturnShipping: z.boolean().optional(),
    returnCost: CurrencyAmountSchema.optional(),
    landedCost: CurrencyAmountSchema.refine(
      (value) => value.amount > 0,
      "Landed cost must be greater than 0"
    ),
    dimensions: z.object({
          height: z.coerce.number().min(0),
          width: z.coerce.number().min(0),
          depth: z.coerce.number().min(0),
          uom: z.string().refine((value) => !isNullOrUndefined(unitsOfMeasure.find(x => x.value == value)), { message: "Invalid unit of measure" })
    }),
    weight: z.object({
          amount: z.coerce.number().min(0),
          uom: z.string().refine((value) => !isNullOrUndefined(unitsOfMeasure.find(x => x.value == value)), { message: "Invalid unit of measure" })
    }),
    qty_soh: z.coerce.number().int().min(1),
    tone: z.enum(['push', 'normal', 'ease']).optional(),
    description: z.string().refine((value) => countWords(value) > 0),
    images: z.array(MediaInputSchema).min(1).max(10),
    properties: z.array(ProductVariantProperty).optional(),
})

type Props = ControllerRenderProps<{
  [key: string]: ProductVariant[]
}, any> & {
  relativePath: string,
  productName: string,
  properties: ProductProperty[]
}

const UpsertVariant : React.FC<{
  className?: string,
  idx: number,
  showNameInput: boolean,
  showToneSelector: boolean,
  properties: ProductProperty[],
  variant: ProductVariant,
  productName: string,
  relativePath: string}> = ({className, properties, variant, idx, relativePath, showNameInput, showToneSelector, productName}) => {
  const { control, setValue, getValues, formState: { errors }, watch } = useFormContext();
  
  // Watch for changes to pricing strategy, landed cost, and stock
  const pricingStrategy = watch('pricingStrategy');
  const landedCostObj = watch(`variants.${idx}.landedCost`);
  const landedCost = landedCostObj?.amount || 0;
  const qtySOH = watch(`variants.${idx}.qty_soh`);
  
  // Sophisticated pricing algorithm (same as UseCreateProduct)
  const calculateSophisticatedPrice = (strategy: string, landedCostMinor: number, variantData: any = {}): number => {
    if (landedCostMinor <= 0) return 0;
    
    // Constants
    const refundRate = 0.08; // 8% expected refund rate
    const returnShipping = 600; // $6.00 in minor units
    const restockCost = 30; // $0.30 in minor units  
    const handlingCost = 50; // $0.50 in minor units
    const processingFeeRate = 0.029; // 2.9%
    const fixedFee = 30; // $0.30 in minor units
    const expectedDiscountRate = 0.05; // 5% average discount
    const taxRate = 0; // 0 if price shown before tax
    
    // Calculate Effective Cost (EC)
    const refundCosts = refundRate * (returnShipping + restockCost + handlingCost);
    const effectiveCost = landedCostMinor + refundCosts;
    
    // Calculate Expected Profit per Unit (EPU) based on strategy
    let targetEPU = 0;
    const cushionMin = 100; // $1.00 minimum cushion
    const floorEPU = 50; // $0.50 floor
    
    switch (strategy) {
      case 'volume': // Sell more units
        const gamma = 0.075; // 7.5% margin
        targetEPU = Math.max(cushionMin, gamma * effectiveCost);
        break;
      case 'unit-profit': // Steady profit per unit
        targetEPU = 600; // $6.00 target profit
        break;
      case 'revenue': // Hit sales target
        targetEPU = 500; // $5.00
        break;
      case 'inventory': // Clear stock quickly
        const inventoryGamma = 0.025; // 2.5% margin
        targetEPU = Math.max(floorEPU, inventoryGamma * effectiveCost);
        break;
      case 'premium': // Premium positioning
        const alpha = 0.8; // 80% margin on effective cost
        targetEPU = alpha * effectiveCost;
        break;
      case 'risk-averse': // Safe baseline
        const beta = 0.3; // 30% margin on effective cost
        targetEPU = beta * effectiveCost;
        break;
      default:
        targetEPU = 600; // Default to unit-profit
    }
    
    // Apply tone adjustment to EPU
    const tone = variantData.tone || 'normal';
    switch (tone) {
      case 'push':
        targetEPU = targetEPU * 1.1; // +10% more aggressive
        break;
      case 'ease':
        targetEPU = targetEPU * 0.9; // -10% more gentle
        break;
      case 'normal':
      default:
        // No adjustment
        break;
    }
    
    // Net rate after all deductions
    const netRate = 1 - processingFeeRate - taxRate - expectedDiscountRate;
    
    // Calculate final price using the formula
    const rawPrice = (targetEPU + effectiveCost + fixedFee) / netRate;
    
    return Math.round(rawPrice);
  };
  
  // Auto-update price when cost changes
  useEffect(() => {
    console.log('Auto-pricing effect triggered:', { pricingStrategy, landedCost, idx });
    
    if (pricingStrategy && landedCost && landedCost > 0) {
      const currentVariant = getValues(`variants.${idx}`);
      console.log('Current variant data:', currentVariant);
      
      const newPrice = calculateSophisticatedPrice(pricingStrategy, landedCost, currentVariant);
      console.log('Calculated new price:', newPrice);
      
      // Only update if the price actually changed to avoid infinite loops
      const currentPrice = getValues(`variants.${idx}.defaultPrice.amount`);
      console.log('Current price vs new price:', currentPrice, newPrice);
      
      if (currentPrice !== newPrice) {
        console.log('Updating price from', currentPrice, 'to', newPrice);
        setValue(`variants.${idx}.defaultPrice`, {
          amount: newPrice,
          currency: currentVariant.defaultPrice.currency
        }, { shouldDirty: true });
      }
    }
  }, [pricingStrategy, landedCostObj?.amount, qtySOH]); // Re-run when strategy or cost changes

  const [activePopover, setActivePopover] = useState<"none" | "description" | "thumbnail" | "images">("none");
  const closePopover = () => setActivePopover("none");
  
  return (
    <div key={variant.id} className={cn("flex flex-col space-y-2 p-3", className)}>
      <div className="flex flex-row items-center">
        <div className="grid grid-cols-2 gap-3 flex-grow">
            {showNameInput &&
              <div className="flex flex-row w-full items-center">
                  <FormField
                    control={control}
                    name={`variants.${idx}.isDefault`}
                    render={({field}) => (
                      <FormItem className="mr-2">
                        <FormControl>
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <StarIcon 
                                onClick={() => {
                                  // if its already true we do nothing,
                                  // if its not the variant currently set to default, we set it to default
                                  if (field.value) return;
                                  // lets do a shallow copy and set the isDefault
                                  // property of the variant to true
                                  // and set the isDefault property of the current default
                                  setValue("variants", [...getValues().variants].map((v, i) => {
                                    return { ...v, isDefault: i === idx }
                                  }), { shouldDirty: true });
                                  // to ensure it refreshes the current item we need to call field.onChange also
                                  field.onChange(true);
                                }}
                                size={24}
                                className={cn("cursor-pointer", field.value ? "text-yellow-500 fill-yellow-500" : "text-gray-400")} />
                            </TooltipTrigger>
                            <TooltipContent className="py-3">
                              <h2 className="font-bold text-xl mb-2">Set as the default variant</h2>
                              <p className="w-52 text-wrap prose">As the default, this will be shown first to your customers, and its thumbnail will represent the product in the catalog.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormControl>
                      </FormItem>
                    )} />
                  <FormField
                    control={control}
                    name={`variants.${idx}.name`}
                    render={({field}) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input {...field} className="w-full" placeholder="Name" />
                        </FormControl>
                      </FormItem>
                    )} />
              </div>
            }
            <FormField
              control={control}
              name={`variants.${idx}.code`}
              render={({field}) => (
                <FormItem className={cn(!showNameInput ? "col-span-2" : "", "w-full")}>
                  <FormControl>
                    <Input {...field} 
                      className={cn("w-full", errors.variants?.[idx]?.code ? "placeholder:text-red-800" : "")}
                      placeholder="Code" />
                  </FormControl>
                </FormItem>
              )} />
          </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
          <FormField
            control={control}
            name={`variants.${idx}.images`}
            render={({field}) => (
              <Popover open={activePopover === "images"}>
                <PopoverTrigger asChild>
                  <Button className={
                    (!isNullOrUndefined(errors.variants) && !isNullOrUndefined(errors.variants[idx]) && errors.variants[idx].images) ? "text-red-800" :
                    (activePopover === "images" || (!isNullOrUndefined(field.value) && field.value.length > 0) ? "text-black" : "text-gray-400")} variant={activePopover === "images" ? "default" : "outline"} onClick={() => setActivePopover("images")}>
                    Images{!isNullOrUndefined(field.value) && field.value.length > 0 && ` (${field.value.length})`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-4 w-[330px]">
                  <UpsertProductImages
                      {...field}
                      id={variant.id}
                      aspectRatio="square"
                      relativePath={`${relativePath}/variants/${variant.id}`}
                      maxImages={10}
                      />
                   <Button type="button" variant="default" className="w-full mt-2"
                      onClick={() => {
                        setActivePopover("none");
                      }}>
                      Finish & Confirm
                   </Button>
                </PopoverContent>
              </Popover>
            )} />
          <FormField
                control={control}
                name={`variants.${idx}.description`}
                render={({field}) => (
                  <Popover open={activePopover === "description"}>
                    <PopoverTrigger asChild>
                        <Button 
                          onClick={() => setActivePopover("description")} 
                          variant={"outline"} 
                          className={cn(
                            errors.variants?.[idx]?.description ? "text-red-800" :
                            (`${isNullOrWhitespace(field.value) ? "text-gray-400" : ""}`), "overflow-y-hidden")}>
                          {field.value && countWords(field.value) > 0 ? "Update Description" : "Add Description"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4 w-[500px] h-[400px]">
                        <FormItem className="flex flex-col w-full h-full">
                            <FormControl>
                                <RichTextInput
                                    label="Description"
                                    {...field}
                                    maxWords={1000}
                                    className="w-full flex-grow min-h-0" />
                            </FormControl>
                            <Button type="button" variant="default" className="mt-2" onClick={closePopover}>Finish and Confirm</Button>
                        </FormItem>
                    </PopoverContent>
                </Popover>
            )} />
          <FormField
                control={control}
                name={`variants.${idx}.harmonizedTarrifCode`}
                render={({field}) => (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          errors.variants?.[idx]?.harmonizedTarrifCode ? "text-red-800" :
                          (field.value?.hsCode ? "text-black" : "text-gray-400")
                        )}>
                        {field.value?.hsCode ? `HS: ${field.value.formattedHsCode || field.value.hsCode}` : "Select HS Code (6 digit)"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="h-[675px] w-[900px]">
                      <DialogTitle>Select Harmonized System Code</DialogTitle>
                      <HSCodePicker
                        productName={productName}
                        defaultValue={field.value}
                        onChange={field.onChange}
                        renderAsContent={true}
                      />
                    </DialogContent>
                  </Dialog>
                )} />
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
            <FormField
              control={control}
              name={`variants.${idx}.countryOfManufacture`}
              render={({field}) => (
                <FormItem className="w-full flex flex-row space-x-1 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <CircleHelpIcon
                        className={cn("cursor-pointer mt-1", errors.variants?.[idx]?.countryOfOrigin ? "text-red-800" : "")}
                        size={24} />
                    </PopoverTrigger>
                    <PopoverContent className="py-3 w-80 flex flex-col space-y-1">
                      <label className="font-bold p-2 text-md">Where the product was physically assembled or produced.</label>
                      <p className="text-sm">This refers to the country where the product was physically assembled or produced. It&apos;s the location where the final production steps occurred, including the assembly of parts, packaging, and any processes that result in the product being ready for sale. It may or may not be the same as the country of origin, but it specifically reflects the place of manufacturing.</p>
                      <Button type="button" onClick={escape_key} variant="link">Close</Button>
                    </PopoverContent>
                  </Popover>
                  <FormControl>
                    <CountryInput
                      placeholder="Country of Manufacture"
                      onChange={field.onChange}
                      defaultValue={field.value}
                      />
                  </FormControl>
                </FormItem>
              )} />
              <FormField
              control={control}
              name={`variants.${idx}.countryOfOrigin`}
              render={({field}) => (
                <FormItem className="flex flex-row space-x-1 w-full items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <CircleHelpIcon
                        className={cn("cursor-pointer mt-1", errors.variants?.[idx]?.countryOfOrigin ? "text-red-800" : "")}
                        size={24} />
                    </PopoverTrigger>
                    <PopoverContent className="py-3 w-80 text-sm flex flex-col space-y-1">
                      <label className="font-bold p-2 text-md"> Where the product was primarily transformed into a finished product.</label>
                      <p className="text-sm">This refers to the country where the product has undergone significant transformation or where it was primarily made into its finished form. It&apos;s the country where the product&apos;s essential characteristics or features were established. For example, if a product was assembled in one country but the materials were sourced from another, the country of origin is typically where the product was &quot;finished.&quot;</p>
                      <Button type="button" onClick={escape_key} variant="link">Close</Button>
                    </PopoverContent>
                  </Popover>
                  <FormControl>
                    <CountryInput
                      placeholder="Country of Origin"
                      onChange={field.onChange}
                      defaultValue={field.value}
                      />
                  </FormControl>
                </FormItem>
              )} />
          </div>
      <Carousel className="w-full flex-grow min-h-0" orientation="vertical"     
        opts={{ }} plugins={[WheelGesturesPlugin()]}>
        <CarouselContent contentAsGrid={true} 
            outerClassName="w-full h-full"
            className="grid-cols-2 auto-rows-min gap-x-2 gap-y-3 w-full h-full">
            <CarouselItem className="space-y-2 w-full p-1">
                <div className="flex flex-col space-y-2">
                    <div className="h-10 flex flex-row items-center">
                      <span className={cn(
                        errors.variants?.[idx]?.dimensions ? "text-red-800" : "",
                        "text-sm")}>Dimensions</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <FormField
                        control={control}
                        name={`variants.${idx}.dimensions.height`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Input
                                withButtons={false}
                                type="number"
                                className="flex-grow min-w-none text-right"
                                {...field}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">H</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`variants.${idx}.dimensions.width`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Input
                                withButtons={false}
                                type="number"
                                className="flex-grow min-w-none text-right"
                                {...field}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">W</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`variants.${idx}.dimensions.depth`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Input
                                withButtons={false}
                                type="number"
                                className="flex-grow min-w-none text-right"
                                {...field}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">D</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={control}
                      name={`variants.${idx}.dimensions.uom`}
                      render={({field}) => (
                        <FormItem className="flex flex-row items-center space-x-2">
                          <FormControl>
                          <ComboBox
                            objectName="Unit of Measure"
                            className={cn(errors.variants?.[idx]?.dimensions ? "text-red-800" : "")}
                            fieldMapping={{ keyColumn: "value", labelColumn: "label" }}
                            items={unitsOfMeasure.filter(x => x.type === "length")}
                            value={unitsOfMeasure.find((uom) => uom.value === field.value)}
                            onChange={(selected) => field.onChange(selected.value)} />
                          </FormControl>
                        </FormItem>
                      )} />
                </div>
            </CarouselItem>
            <CarouselItem className="w-full p-1">
              <div className="h-10 py-4 flex flex-row items-center">
                <span className={cn(errors.variants?.[idx]?.weight ? "text-red-800" : "", "text-sm")}>
                  Weight
                </span>
              </div>
              <FormField
                  control={control}
                  name={`variants.${idx}.weight.amount`}
                  render={({field}) => (
                    <FormItem className="mt-2">
                      <FormControl>
                        <Input 
                          withButtons={false} 
                          {...field} 
                          type="number"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
              <FormField
                control={control}
                name={`variants.${idx}.weight.uom`}
                render={({field}) => (
                  <FormItem className="flex flex-row items-center space-x-2 mt-4">
                    <FormControl>
                    <ComboBox
                      objectName="Unit of Measure"
                      className={cn(errors.variants?.[idx]?.weight ? "text-red-800" : "")}
                      fieldMapping={{ keyColumn: "value", labelColumn: "label" }}
                      items={unitsOfMeasure.filter(x => x.type === "weight")}
                      value={unitsOfMeasure.find((uom) => uom.value === field.value)}
                      onChange={(selected) => field.onChange(selected.value)}/>
                    </FormControl>
                  </FormItem>
                )} />
            </CarouselItem>
            <CarouselItem className="space-y-2 w-full p-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <div className="h-10 py-4 flex flex-row items-center space-x-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <CircleHelpIcon
                          className={cn("cursor-pointer mt-1", errors.variants?.[idx]?.landedCost ? "text-red-800" : "")}
                          size={24} />
                      </PopoverTrigger>
                      <PopoverContent className="py-3 w-80 flex flex-col space-y-1">
                        <label className="font-bold p-2 text-md">Your total cost for this product (Landed Cost)</label>
                        <p className="text-sm">This is your total cost for the product including purchase price, shipping, customs duties, taxes, and any other expenses to get the product ready for sale. This helps you track profitability and set appropriate pricing.</p>
                        <Button type="button" onClick={escape_key} variant="link">Close</Button>
                      </PopoverContent>
                    </Popover>
                    <span className={cn("text-bold text-sm", errors.variants?.[idx]?.landedCost ? "text-red-800" : "")}>
                      My Cost
                    </span>
                  </div>
                  <FormField
                    control={control}
                    name={`variants.${idx}.landedCost`}
                    render={({field}) => (
                      <FormItem>
                        <FormControl>
                          <CurrencyInput 
                            {...field}
                            className={cn(errors.variants?.[idx]?.landedCost ? "text-red-800" : "")}
                            decimalLimit={2} />
                        </FormControl>
                      </FormItem>
                    )} />
                </div>
                <div className="space-y-2">
                  <div className="h-10 py-4 flex flex-row items-center">
                    <span className={cn("text-bold text-sm", errors.variants?.[idx]?.qty_soh ? "text-red-800" : "")}>
                      Available Stock
                    </span>
                  </div>
                  <FormField
                    control={control}
                    name={`variants.${idx}.qty_soh`}
                    render={({field}) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} 
                            min={1}
                            className={cn(errors.variants?.[idx]?.qty_soh ? "text-red-800" : "")}
                            type="number" />
                        </FormControl>
                      </FormItem>
                    )} />
                </div>
              </div>
            </CarouselItem>
            <CarouselItem className="space-y-2 w-full p-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <div className="h-10 py-4 flex flex-row items-center justify-between">
                    <span className={cn("text-bold text-sm", errors.variants?.[idx]?.defaultPrice ? "text-red-800" : "")}>
                      Selling Price
                    </span>
                    {(() => {
                      const currentVariant = getValues(`variants.${idx}`);
                      return pricingStrategy && landedCost && landedCost > 0 && (
                        <PricingExplanationPopover
                          landedCost={landedCost}
                          pricingStrategy={pricingStrategy}
                          tone={currentVariant?.tone || 'normal'}
                          currency={currentVariant?.defaultPrice?.currency || 'AUD'}
                          finalPrice={currentVariant?.defaultPrice?.amount || 0}
                          stockQuantity={currentVariant?.qty_soh || 0}
                        >
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-4 p-0 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Why?
                          </Button>
                        </PricingExplanationPopover>
                      );
                    })()}
                  </div>
                  <FormField
                    control={control}
                    name={`variants.${idx}.defaultPrice`}
                    render={({field}) => (
                      <FormItem>
                        <FormControl>
                          <CurrencyInput 
                            {...field}
                            className={cn(errors.variants?.[idx]?.defaultPrice ? "text-red-800" : "")}
                            decimalLimit={2} />
                        </FormControl>
                      </FormItem>
                    )} />
                </div>
                <div className="space-y-2">
                  {showToneSelector && (
                    <div className="h-10 py-4 flex flex-row items-center space-x-1">
                      <span className="text-bold text-sm">Pricing Strategy Intensity</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <CircleHelpIcon
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            size={16} />
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4">
                          <div className="space-y-3">
                            <h3 className="font-semibold text-sm">Pricing Strategy Intensity</h3>
                          <p className="text-xs text-muted-foreground">
                            This adjusts how aggressive your pricing strategy is applied:
                          </p>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="font-medium text-green-600">🟢 Ease (Gentle -10%)</div>
                              <div className="text-muted-foreground ml-4">
                                More conservative pricing. If your strategy targets $6 profit, ease gives $5.40 profit.
                                <div className="italic mt-1">Good for: Testing markets, price-sensitive customers</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium">⚪ Normal (No change)</div>
                              <div className="text-muted-foreground ml-4">
                                Standard pricing as calculated by your strategy.
                                <div className="italic mt-1">Good for: Most products, balanced approach</div>
                              </div>
                            </div>
                            
                            <div>
                              <div className="font-medium text-orange-600">🔴 Push (Aggressive +10%)</div>
                              <div className="text-muted-foreground ml-4">
                                More aggressive pricing. If your strategy targets $6 profit, push gives $6.60 profit.
                                <div className="italic mt-1">Good for: Unique products, strong demand, premium positioning</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            <strong>Example:</strong> With Unit Profit strategy ($6 target) and $10 cost:
                            <ul className="ml-4 mt-1 space-y-1">
                              <li>• Ease: ~$20.40 final price ($5.40 profit)</li>
                              <li>• Normal: ~$22.60 final price ($6.00 profit)</li>
                              <li>• Push: ~$24.90 final price ($6.60 profit)</li>
                            </ul>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    </div>
                  )}
                  {showToneSelector && (
                    <FormField
                      control={control}
                      name={`variants.${idx}.tone`}
                      render={({field}) => (
                        <FormItem>
                          <FormControl>
                            <select 
                              {...field}
                              className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                            >
                              <option value="ease">Ease (gentle)</option>
                              <option value="normal">Normal</option>
                              <option value="push">Push (aggressive)</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                  )}
                </div>
              </div>
            </CarouselItem>
            {
              (variant.properties ?? [])
                .filter((prop) => properties.find((p) => p.id === prop.id))
                .map((prop, propIdx) => (
                <CarouselItem key={prop.id} className="w-full">
                <FormField
                  control={control}
                  name={`variants.${idx}.properties.${propIdx}`}
                  render={({ field }) => {
                    const { key, valueType, unitOfMeasure } = properties.find((p) => p.id === prop.id) ?? { valueType: undefined };
              
                    if (isNullOrUndefined(valueType)) {
                      return <></>; // Returning nothing if no valueType is found
                    }

                    const {value, sortOrder} = field.value as ProductVariantProperty

                    const handleChange = (entered_value: any, fieldType: "value" | "sort") => {
                      if (fieldType === "value") {
                        field.onChange({
                          id: prop.id,
                          sortOrder,
                          value: entered_value.toString()
                        });
                      } else {
                        field.onChange({
                          id: prop.id,
                          value,
                          sortOrder: parseInt(entered_value.toString())
                        });
                      }
                    }

                    let inputComponent = 
                    <Input 
                        key={`variants.${idx}.properties.${propIdx}.value`}
                        {...field} 
                        value={value} 
                        type={valueType === "QUANTITY" ? "number" : "text"}
                        onChange={(ev) => handleChange(ev.target.value, "value")} 
                        placeholder="Value" />;
                    if (valueType === "BOOLEAN") {
                      const booleanOptions = [
                        { label: "Yes", value: true },
                        { label: "No", value: false }
                      ]
                      inputComponent = 
                        <ComboBox 
                          objectName="Yes or No"
                          fieldMapping={{ keyColumn: "value", labelColumn:"label"}} 
                          onChange={(selected) => {
                            if (isNullOrUndefined(selected)) return;
                            handleChange(selected.value, "value");
                          }}
                          value={booleanOptions.find((option) => !isNullOrUndefined(value) && option.value === Boolean(value))}
                          items={booleanOptions} />;
                    } else if (valueType === "QUANTITY") {
                      inputComponent = 
                        <div className="flex flex-row items-center space-x-3">
                          {inputComponent}
                          <span>{unitOfMeasure}</span>
                        </div>
                    } else if (valueType === "STRING") {
                       inputComponent = 
                        <div className="flex flex-row items-center space-x-3">
                          {inputComponent}
                          <Input withButtons={false} value={sortOrder} type="number" onChange={(ev) => handleChange(ev.target.value, "sort")} placeholder="Sort Order" />
                        </div>
                    }
              
                    return (
                      <FormItem>
                        <div className="flex flex-row items-center justify-between">
                          <FormLabel>{key}</FormLabel>
                          <FormField
                            control={control}
                            name={`variants.${idx}.properties.${propIdx}.enabled`}
                            render={({ field }) => (
                              <FormControl>
                                {field.value ? (
                                  <Button type="button" onClick={() => field.onChange(false)} variant="link" className="text-primary py-0">Enabled</Button>
                                ) : (
                                  <Button type="button" onClick={() => field.onChange(true)} variant="link" className="text-slate-500 py-0">Disabled</Button>
                                )}
                              </FormControl>
                            )} />
                        </div>
                        <FormControl>
                          {inputComponent}
                        </FormControl>
                      </FormItem>
                    );
                  }}
                />
                </CarouselItem>
              ))
            }
        </CarouselContent>
      </Carousel>
    </div>
  )
}

const VariantChooser: React.FC<Props & { activeVariantIndex: number, onSelection: (variant: ProductVariant) => void}> = ({
  onSelection, ...props
}) => {

  const { control } = useFormContext();

  const variants = useWatch({
    control,
    name: "variants",
  })

  const default_variant = {
    isDefault: false,
    code: "",
    countryOfOrigin: "",
    countryOfManufacture: "",
    harmonizedTarrifCode: null,
    defaultPrice: { amount: 0, currency: "AUD" },
    landedCost: { amount: 0, currency: "AUD" },
    qty_soh: 0,
    description: "",
    tone: 'normal' as 'push' | 'normal' | 'ease',
    dimensions: {
      height: 0,
      width: 0,
      depth: 0,
      uom: undefined
    },
    weight: {
      amount: 0,
      uom: undefined
    },
    images: [],
    properties: props.properties.map((prop) => ({ id: prop.id, value: "", sortOrder: 1, enabled: true }))
  }

  return (
    <Carousel
          key={`variants-carousel`}
          orientation="horizontal" 
          className="h-auto flex flex-row space-x-3 items-center w-full">
          <CarouselPrevious />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="h-full w-16 flex items-center justify-center"
                onClick={() => {
                  const newItem = { id: uuid(), name: `Variant ${variants.length + 1}`, ...default_variant }
                  variants.push(newItem);
                  props.onChange(variants);
                }}>
                <PlusIcon size={24} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Use this to create a new variant.</p>
            </TooltipContent>
          </Tooltip>
          <CarouselContent outerClassName="flex-grow mr-2" className="flex flex-row space-x-3">
            {variants && variants.map((item, idx) => {
              const isActive = props.activeVariantIndex === idx;
                return (
                  <CarouselItem 
                    key={item.id} 
                    className={cn("flex flex-col space-y-1")}
                    >
                    <div 
                      style={{ position:"relative", height: 65, width: 80 }}
                      className={cn("flex-none flex items-center justify-center rounded-xl", isActive ? "border-accent border-2" : "bg-slate-200")}>
                      {/* {!isNullOrUndefined(item.thumbnail) && !isNullOrUndefined(item.thumbnail.image)
                      ? <img src={item.thumbnail.image.url} className="w-full h-full object-cover rounded-xl" />
                      : <span className="text-sm">{item.name}</span>
                      } */}
                      <span className="text-xs">{item.name}</span>
                      { item.isDefault && <StarIcon className="absolute top-2 left-2 text-yellow-500 fill-yellow-500" size={14} /> }
                    </div>
                    <div className="grid grid-cols-2">
                      <Button size="icon" type="button" onClick={() => onSelection(item)} variant="ghost">
                        <PencilIcon size={16} />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" disabled={variants.length == 1} type="button" variant="ghost">
                            <Trash2Icon size={16} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="p-4">
                          <DialogTitle>Delete {item.name}</DialogTitle>
                          <p>Are you sure you want to delete this?</p>
                          <div className="flex flex-row space-x-3">
                            <Button type="button" onClick={() => {
                              variants.splice(idx, 1);
                              props.onChange(variants);
                            }}>Yes</Button>
                            <Button type="button" onClick={() => {
                              escape_key();
                            }}>No</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CarouselItem>
                )
            })}
          </CarouselContent>
          <CarouselNext />
      </Carousel>
  )
}

const UpsertVariants : React.FC<Props> = (props) => {

    const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);

    return (  
      <>
      <p className="bg-info p-3 text-sm prose rounded-md mb-2">
        A variant is a product version, like a T-shirt in different sizes or colors.
      </p>
      <VariantChooser 
        {...props}
        activeVariantIndex={activeVariantIndex}
        onChange={(value) => {
          props.onChange(value);
          setActiveVariantIndex(value.length - 1);
        }}
        onSelection={(variant) => {
          setActiveVariantIndex(props.value.findIndex((v) => v.id === variant.id));
        }} />
      { !isNullOrUndefined(props.value) && props.value.length > 0 &&
        <UpsertVariant 
            className="flex-grow min-h-0"
            productName={props.productName}
            variant={props.value[activeVariantIndex]} 
            showNameInput={props.value.length > 1}
            showToneSelector={props.value.length > 1}
            idx={activeVariantIndex}
            relativePath={props.relativePath}
            properties={props.properties} />
      }
      </>
    )
}
  
export default UpsertVariants;
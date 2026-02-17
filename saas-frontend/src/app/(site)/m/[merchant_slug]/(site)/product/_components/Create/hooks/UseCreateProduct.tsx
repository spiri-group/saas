'use client';

import { gql } from "@/lib/services/gql";
import { product_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { countWords, isNullOrUndefined, isNullOrWhitespace, omit, upsert } from "@/lib/functions";
import { ProductProperty } from "../component/UpsertProductFields";
import { ProductVariant } from "../component/UpsertVariants";
import { useEffect, useState } from "react";
import useFormStatus from "@/components/utils/UseFormStatus";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { default_thumbnail } from "@/components/ux/ThumbnailInput";
import { toast } from "sonner";


// Product type enum values
export const ProductTypeValues = ['STANDARD', 'CRYSTAL'] as const;
export type ProductType = typeof ProductTypeValues[number];

// Crystal form options
export const CrystalFormValues = [
    'raw', 'tumbled', 'point', 'cluster', 'sphere', 'palm_stone',
    'tower', 'wand', 'pyramid', 'heart', 'skull', 'cabochon',
    'faceted', 'slice', 'geode', 'jewelry', 'freeform', 'cube',
    'carving', 'blade', 'fan', 'other'
] as const;
export type CrystalForm = typeof CrystalFormValues[number];

// Crystal grade options
export const CrystalGradeValues = ['A', 'AA', 'AAA', 'museum', 'specimen', 'polished'] as const;
export type CrystalGrade = typeof CrystalGradeValues[number];

// Crystal color options
export const CrystalColorValues = [
    'clear', 'white', 'black', 'red', 'orange', 'yellow', 'green',
    'blue', 'purple', 'pink', 'brown', 'gray', 'gold', 'silver',
    'multicolor', 'iridescent'
] as const;
export type CrystalColor = typeof CrystalColorValues[number];

// Crystal type data schema
export const CrystalTypeDataSchema = z.object({
    crystalRefId: z.string().min(1, "Crystal type is required"),
    crystalForm: z.enum(CrystalFormValues),
    crystalGrade: z.enum(CrystalGradeValues).optional(),
    crystalLocality: z.string().optional(),
    crystalColor: z.enum(CrystalColorValues).optional(),
});

// Product type data schema
export const ProductTypeDataSchema = z.object({
    crystal: CrystalTypeDataSchema.optional(),
});

export type CreateProductSchema = z.infer<typeof CreateProductSchema>

export const CreateProductSchema = z.object({
    soldFromLocationId: z.string().uuid(),
    productReturnPolicyId: z.string().uuid().optional(),
    noRefunds: z.boolean().optional(),
    category: z.string().min(1, "Category is required"),
    id: z.string().uuid(),
    name: z.string(),
    thumbnail: ThumbnailSchema.optional(),
    thumbnail_content_set: z.boolean().refine(value => value === true, {
        message: "Thumbnail content must be set to true"
    }),
    properties: z.array(ProductProperty).max(25),
    description: z.string().refine((value) => countWords(value) <= 500).optional(),
    pricingStrategy: z.enum([
      'volume', // Sell more units (volume focus)
      'unit-profit', // Make steady profit per unit (unit profit focus)
      'revenue', // Hit a monthly sales target (revenue focus)
      'inventory', // Clear stock quickly (inventory focus)
      'premium', // Position as premium (brand/value focus)
      'risk-averse' // Stay safe / cover costs (risk-averse baseline)
    ]),
    variants: z.array(ProductVariant).min(1).refine((value) => value.filter(x => x.isDefault).length == 1, {
        message: "You must have one default variant"
    }),
    pricingRules: z.object({
        targetMargin: z.number().min(0).max(0.95).optional(),
        floorMargin: z.number().min(0).max(0.9).optional(),
        autoProtect: z.boolean().optional()
    }).optional(),
    refundRules: z.object({
        allowAutoReturns: z.boolean().optional(),
        maxShippingCost: CurrencyAmountSchema.optional(),
        productCost: CurrencyAmountSchema.optional(),
        refundWithoutReturn: z.boolean(),
        useDefaultAddress: z.boolean().optional(),
        customAddress: z.object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postcode: z.string().optional(),
            country: z.string().optional()
        }).optional(),
        requirePhoto: z.boolean().optional(),
        refundTiming: z.enum(['immediate', 'carrier_scan', 'delivered', 'manual'])
    }).optional(),
    // Product type discriminator
    productType: z.enum(ProductTypeValues),
    // Type-specific data
    typeData: ProductTypeDataSchema.optional(),
    // Spiritual practice tags
    spiritualInterests: z.array(z.string()).optional(),
}).refine((data) => {
    // Either productReturnPolicyId or noRefunds must be provided
    return !!(data.productReturnPolicyId || data.noRefunds);
}, {
    message: "Either select a refund policy or check 'No refunds'",
    path: ["productReturnPolicyId"]
}).refine((data) => {
    // If refunds are enabled, refund rules must be provided
    if (!data.noRefunds) {
        return !!(data.refundRules?.refundWithoutReturn !== undefined && data.refundRules?.refundTiming);
    }
    return true;
}, {
    message: "Please complete the refund settings",
    path: ["refundRules"]
}).refine((data) => {
    // If productType is CRYSTAL, crystal type data is required
    if (data.productType === 'CRYSTAL') {
        return !!(data.typeData?.crystal?.crystalRefId && data.typeData?.crystal?.crystalForm);
    }
    return true;
}, {
    message: "Crystal type and form are required for crystal products",
    path: ["typeData.crystal.crystalRefId"]
})

const UseCreateProduct = (merchantId: string, merchantCurrency: string, existingProductId?: string) => {
    const [default_currency, setDefaultCurrency] = useState<string>(merchantCurrency);
    const queryClient = useQueryClient();

    const productId = existingProductId || uuid();
    const isUpdateMode = !!existingProductId;

    const status = useFormStatus();
    const form = useForm<CreateProductSchema>({
        resolver: zodResolver(CreateProductSchema),
        defaultValues: {
            id: productId,
            category: undefined,
            noRefunds: false,
            productType: 'STANDARD',
            typeData: undefined,
            spiritualInterests: [],
            thumbnail: {
                ...default_thumbnail,
                image: {
                    ...default_thumbnail.image,
                    objectFit: 'contain' // Set default objectFit to 'contain'
                }
            },
            properties: [],
            variants: [{
                isDefault: true,
                id: uuid(),
                name: "Variant 1",
                code: "",
                countryOfOrigin: "",
                countryOfManufacture: "",
                harmonizedTarrifCode: {
                    hsCode: "",
                    description: ""
                },
                defaultPrice: {
                    amount: 0,
                    currency: default_currency
                },
                landedCost: {
                    amount: 0,
                    currency: default_currency
                },
                qty_soh: 0,
                tone: 'normal',
                description: "",
                images: [],
                dimensions: {
                    height: 0,
                    width: 0,
                    depth: 0,
                    uom: "cm"
                },
                weight: {
                    amount: 0,
                    uom: "g"
                },
                properties: []
            }],
            pricingRules: {
                targetMargin: 0.25,
                floorMargin: 0.12,
                autoProtect: true
            },
            refundRules: {
                allowAutoReturns: true,
                maxShippingCost: {
                    amount: 1000, // $10.00 in minor units
                    currency: default_currency
                },
                refundWithoutReturn: false,
                useDefaultAddress: true,
                requirePhoto: false,
                refundTiming: 'carrier_scan' as const
            },
        }
    })

    // we neetto watch for changes to properties on the product
    // so that we can add another 
    const properties = form.watch("properties");
    useEffect(() => {
        if (isNullOrUndefined(properties)) return;
        if (properties.length == 0) return;

        // add a property to each variant
        const variants = form.getValues().variants as ProductVariant[];
        variants.forEach((variant) => {
            variant.properties = variant.properties ?? [];

            properties.forEach((property) => {
                // only add it if it doesn't exist
                if (variant.properties != undefined && variant.properties.some(p => p.id == property.id)) {
                    return;
                }

                variant.properties = upsert(variant.properties ?? [], {
                    enabled: true,
                    id: property.id,
                    value: "",
                    sortOrder: 0
                }, {
                    lookupFn: (a, b) => {
                    return a.id == b.id;
                    }
                })
            })

        })

        form.setValue("variants", variants, { shouldDirty: true });

    }, [properties])

    // we need to watch the product name
    // we need to set the thumbnail as long as its not set
    const name = form.watch("name");
    useEffect(() => {
        if (isNullOrWhitespace(name)) return;
        if (form.getValues().thumbnail_content_set) return;

        const thumbnail = form.getValues().thumbnail as any;
        // we need to set the title of the thumbnail
        form.setValue("thumbnail", {
            ...thumbnail,
            title: {
                ...thumbnail.title,
                content: name
            }
        }, { shouldDirty: true });
        
    }, [name])

    // Watch pricing strategy and auto-calculate variant prices
    const pricingStrategy = form.watch("pricingStrategy");
    const variants = form.watch("variants");
    
    // Sophisticated pricing algorithm
    const calculatePriceFromStrategy = (strategy: string, landedCost: number, variant: any = {}): number => {
        if (landedCost <= 0) return 0;
        
        // Constants (could be made configurable later)
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
        const effectiveCost = landedCost + refundCosts;
        
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
                targetEPU = 600; // $6.00 target profit (could be user input)
                break;
            case 'revenue': // Hit sales target
                targetEPU = 500; // $5.00 (with auto-tune potential)
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
        const tone: 'push' | 'normal' | 'ease' = variant.tone;
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
        
        // Round to minor units
        return Math.round(rawPrice);
    };
    
    useEffect(() => {
        if (pricingStrategy && variants) {
            const updatedVariants = variants.map((variant: any) => {
                const landedCost = variant.landedCost?.amount || 0;
                if (landedCost > 0) {
                    const newPrice = calculatePriceFromStrategy(pricingStrategy, landedCost, variant);
                    return {
                        ...variant,
                        defaultPrice: {
                            amount: newPrice,
                            currency: variant.defaultPrice?.currency || default_currency
                        }
                    };
                }
                return variant;
            });
            
            // Only update if prices actually changed
            const hasChanges = updatedVariants.some((variant: any, index: number) => 
                variant.defaultPrice?.amount !== variants[index]?.defaultPrice?.amount
            );
            
            if (hasChanges) {
                form.setValue("variants", updatedVariants, { shouldDirty: true });
            }
        }
    }, [pricingStrategy, variants?.map((v: any) => v.landedCost?.amount).join(',')]); // Only run when strategy or costs change


    return {
        form, 
        status,
        values: form.getValues(),
        schema: CreateProductSchema,
        changeDefaultCurrency: setDefaultCurrency,
        mutation: useMutation({
            mutationFn: async (newProduct: CreateProductSchema) => {
                // Force coercion by using safeParse which applies transforms
                const parseResult = CreateProductSchema.safeParse(newProduct);
                if (!parseResult.success) {
                    throw new Error(`Validation failed: ${parseResult.error.message}`);
                }
                const validatedProduct = parseResult.data;


                const productInput = omit(validatedProduct,
                    ['createdAt', 'updatedAt', "thumbnail_content_set", "variants.images.url", "thumbnail.image.media.url", "variants.thumbnail.image.media.url", "variants.returnCost", "pricingRules"]
                );

                const resp = await gql<{
                    upsert_product: {
                        product: product_type
                    }
                }>(
                    `mutation upsert_product($merchantId: String!, $product: ProductInput!) {
                        upsert_product(merchantId: $merchantId, product: $product) {
                            product {
                                id
                                ref {
                                    id
                                    partition
                                    container
                                }
                            }
                        }
                    }
                    `,
                    {
                        product: productInput,
                        merchantId
                    }
                )

                return resp.upsert_product.product;
            },
            onSuccess: async (data : product_type) => {
                // update the schedule query cache so they can schedule
                queryClient.setQueryData(["products-for-merchant", merchantId], (old: product_type[]) => {
                    if (old == undefined) return [data];
                    // If updating, replace existing; if creating, add to beginning
                    if (isUpdateMode) {
                        return old.map(p => p.id === data.id ? data : p);
                    }
                    return [data, ...old];
                });
                toast.success(isUpdateMode ? "Product updated successfully!" : "Product created successfully!");
            },
            onError: (error) => {
                console.error(`Failed to ${isUpdateMode ? 'update' : 'create'} product:`, error);
                toast.error(`Failed to ${isUpdateMode ? 'update' : 'create'} product. Please check your connection and try again.`);
            }
        })
    }
}

export default UseCreateProduct;
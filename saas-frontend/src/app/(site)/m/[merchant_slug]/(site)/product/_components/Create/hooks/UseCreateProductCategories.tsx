'use client';

import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query"
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

export type CreateProductCategoriesSchema = z.infer<typeof CreateProductCategoriesSchema>

const NewCategorySchema = z.object({
    id: z.string().uuid(),
    name: z.string()
})

export const CreateProductCategoriesSchema = z.object({
    categories: NewCategorySchema.array()
})

const UseCreateProductCategories = (merchantId: string) => {

    const form = useForm<CreateProductCategoriesSchema>({
        resolver: zodResolver(CreateProductCategoriesSchema)
    })

    const categories = useFieldArray({ control: form.control, name: "categories" })

    return {
        form, 
        values: categories,
        mutation: useMutation({
            mutationFn: async (newProduct: CreateProductCategoriesSchema) => {
                for (const category of newProduct.categories) {
                    await gql(`
                        mutation CreateCategory($vendorId: ID!, $input: ListingGroupingInput!) {
                            upsert_listingGrouping(vendorId: $vendorId, listingGrouping: $input) {
                                listingGrouping {
                                    id
                                    name
                                }
                            }
                        }
                    `, {
                        vendorId: merchantId,
                        input: {
                            type: "CATEGORY",
                            id: category.id,
                            name: category.name
                        }
                    })
                }
                
                return {}
            },
            onSuccess: async () => {
                
            }
        })
    }
}

export default UseCreateProductCategories;
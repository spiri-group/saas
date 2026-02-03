import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { v4 as uuid } from "uuid";

export type companySectionForm_type = z.infer<typeof companySectionFormSchema>

export const companySectionFormSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1)
})

const UseEditVendorSection = (initialData?: companySectionForm_type) => {

    const form = useForm<companySectionForm_type>({
        resolver: zodResolver(companySectionFormSchema),
        defaultValues: initialData ?? {
            id: uuid()
        }
    })

    return {
        form
    }
}

export default UseEditVendorSection
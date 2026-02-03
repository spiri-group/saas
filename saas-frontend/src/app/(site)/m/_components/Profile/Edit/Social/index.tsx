import useFormStatus from "@/components/utils/UseFormStatus"
import useEditVendorSocials, { UpdateVendorFormSchema } from "./_hooks/UseEditVendorSocials"
import { useFieldArray } from "react-hook-form"
import { useEffect } from "react"
import { capitalize, escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { iconsMapping } from "@/icons/social"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
        
}

const useBL = (props: BLProps) => {

    const { merchantId } = props

    const {form, isLoading, mutation} = useEditVendorSocials(merchantId)
    const status = useFormStatus()

    const social = useFieldArray({
        control: form.control,
        name: 'socials'
    })

    useEffect(() => {
        social.replace(form.getValues().socials)
    }, [isLoading])

    return {
        form,
        isLoading,
        social,
        status,
        save: async (values: UpdateVendorFormSchema) => {
            await status.submit(mutation.mutateAsync, values, () => {
                escape_key();
            })
        }
    }

}

const EditMerchantSocials: React.FC<Props> = (props) => {

    const bl = useBL(props)

    return (
        <DialogContent>
            <DialogHeader>
                <h2 className="text-xl font-semibold">Socials</h2>
            </DialogHeader>
            <DialogDescription>
                Enter in your social media links and presence. If you don&apos;t have them simply leave it blank.
            </DialogDescription>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.save)}>
                <ul className="p-2 grid grid-cols-3 grid-rows-auto gap-3">
                    {bl.social.fields.map((field, index) => {
                        return (
                            <li key={field.id}
                                className="w-full flex flex-col space-y-2">
                                <div className="flex flex-row items-center space-x-2">
                                    {iconsMapping[field.platform]('solid')}
                                    <h3 className="text-lg font-semibold">{capitalize(field.platform)}</h3>
                                </div>
                                <FormField
                                    control={bl.form.control}
                                    name={`socials.${index}.handle`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Handle <span className="text-slate-400">(Optional)</span></FormLabel>
                                            <FormControl>
                                                <Input {...field}
                                                    value={field.value ?? ""} />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                <FormField
                                    control={bl.form.control}
                                    name={`socials.${index}.url`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Url</FormLabel>
                                            <FormControl>
                                                <Input {...field}
                                                    value={field.value ?? ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </li>
                        )
                    })}
                </ul>
                <DialogFooter className="flex flex-row space-x-3 mt-2">
                    <CancelDialogButton />
                    <Button variant={bl.status.button.variant}
                        type="submit"
                        className="flex-grow"
                        disabled={bl.isLoading || !bl.form.formState.isDirty}>
                        {bl.status.formState == "idle" ? "Save" : bl.status.button.title}
                    </Button>
                </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )

}

export default EditMerchantSocials
import useFormStatus from "@/components/utils/UseFormStatus"
import useEditVendorIntro, { UpdateVendorFormSchema } from "./_hooks/UseEditVendorIntro"
import { escape_key } from "@/lib/functions"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormField } from "@/components/ui/form"
import RichTextInput from "@/components/ux/RichTextInput"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import { Button } from "@/components/ui/button"

type BLProps = {
    merchantId: string
}

type Props = BLProps & {

}

const useBL = ({ merchantId }: BLProps) => {

    const status = useFormStatus();
    const {form, mutation} = useEditVendorIntro(merchantId)

    return {
        form: form,
        status,
        finish: async (values: UpdateVendorFormSchema) => 
            status.submit(
                mutation.mutateAsync, 
                values,
                escape_key
            )  
    }
}

const EditMerchantIntro: React.FC<Props> = (props) => {

    const bl = useBL(props)

    return (
        <DialogContent className="w-[500px]">
            <DialogHeader>
                Edit your intro
            </DialogHeader>
            <DialogDescription>
                Write a short succinct intro on what you do.
            </DialogDescription>
            <Form {...bl.form}>
                <form className="mt-2" onSubmit={bl.form.handleSubmit(bl.finish)}>
                    <FormField
                        control={bl.form.control}
                        name="intro"
                        render={({field}) => (
                            <RichTextInput
                                {...field}
                                label=""
                                className="h-[360px]"
                                maxWords={100}
                                />
                        )} />
                    <DialogFooter className="mt-4">
                        <CancelDialogButton />
                        <Button
                            variant={bl.status.button.variant}
                            type="submit"
                            >
                            {bl.status.formState == "idle" ? "Save to profile" : bl.status.button.title }
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditMerchantIntro
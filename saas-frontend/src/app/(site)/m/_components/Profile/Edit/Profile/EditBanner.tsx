import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import FileUploader from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import UseVendorInformation from "../../../Nametag/hooks/UseVendorInformation";
import UseEditVendorBanner, { updateVendor_type } from "../_hooks/UseEditVendorBanner";
import CancelDialogButton from "@/components/ux/CancelDialogButton";

type BLProps = {
    merchantId: string
}

const useBL = (props: BLProps) => {

    const vendorInformationResponse = UseVendorInformation(props.merchantId);
    const editVendor = UseEditVendorBanner(props.merchantId)

    if (vendorInformationResponse.data != null ) {
        if (editVendor.form.getValues().banner == null) {
            editVendor.form.reset({
                id: props.merchantId,
                banner: vendorInformationResponse.data.banner
            })
        }
    }

    return {
        form: editVendor.form,
        values: editVendor.form.getValues(),
        submit: async (values: updateVendor_type) => {
            await editVendor.mutation.mutateAsync(values)
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        }
    }
}

type Props = BLProps & {

}

const EditBanner : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (   
        <>
            <h1 className="text-2xl font-bold">Edit profile banner</h1>
            <p className="w-[600px]">Boost your profile&apos;s appeal with a striking banner! It sets your brand tone, attracts more visitors, and creates a memorable first impression. A compelling banner can significantly enhance your visibility and draw more customers to your profile.</p>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col">
                    <div className="flex-grow flex flex-col space-y-3 w-full h-full">
                        <FormLabel>Image</FormLabel>
                        <FormField 
                            name="banner"
                            render={({field}) => {
                                return (
                                    <FormItem className="flex-grow w-full">
                                        <FormControl>
                                        <FileUploader
                                            id={props.merchantId}
                                            className={"h-[150px] w-[600px] border border-dashed"}
                                            connection={{
                                                container: "public",
                                                relative_path: `merchant/${props.merchantId}/banner}`
                                            }}
                                            acceptOnly={{
                                                type: "IMAGE",
                                                orientation: "LANDSCAPE"
                                            }}
                                            targetImage={{
                                                height: 150,
                                                width: 600
                                            }}
                                            value={field.value != null ? [field.value.url] : []}
                                            targetImageVariants={[]}
                                            onDropAsync={function (): void {
                                                field.onChange(null)
                                            }}
                                            onUploadCompleteAsync={function (files: media_type[]): void {
                                                field.onChange(files[0])
                                            }}
                                        />
                                        </FormControl>
                                    </FormItem>
                                )
                            }}  />
                    </div>
                    <div className="flex flex-row space-x-3 mt-3">
                        <CancelDialogButton />
                        <Button type="submit" className="w-full">Confirm</Button>
                    </div>
                </form>
            </Form>
        </>
    )
}

export default EditBanner;
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import AddTeamMembers from "./components/AddTeamMembers";
import UseEditTeamMembers, { updateVendor_type } from "./hooks/UseEditTeamMembers";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { DialogContent } from "@/components/ui/dialog";
import useFormStatus from "@/components/utils/UseFormStatus";
import { escape_key } from "@/lib/functions";

//TODO: fix this form

type BLProps = {
    merchantId: string
}

const useBL = (props: BLProps) => {

    const editTeamMembers = UseEditTeamMembers(props.merchantId)
    const status = useFormStatus();

    return {
        form: editTeamMembers.form,
        values: editTeamMembers.form.getValues(),
        status,
        submit: async (values: updateVendor_type ) => {
            await status.submit(
                editTeamMembers.mutation.mutateAsync, 
                values,
                escape_key
            )
        }
    }
}

type Props = BLProps & {

}

const EditTeamMembers : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (   
        <DialogContent className="w-[850px]">
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)}
                    className="flex flex-col p-2">
                    <FormField
                        name="teamMembers"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="h-full mb-6">
                                <FormControl>
                                    <AddTeamMembers
                                        {...field}
                                        merchantId={props.merchantId}
                                        autoSave={() => bl.form.handleSubmit(bl.submit)()}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditTeamMembers;
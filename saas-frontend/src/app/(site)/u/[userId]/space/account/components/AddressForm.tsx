'use client'

import { address_type } from "@/utils/spiriverse"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import AddressInput from "@/components/ux/AddressInput"
import CancelDialogButton from "@/components/ux/CancelDialogButton"
import UseUpsertAddress, { AddressesSchema } from "../hooks/UseUpsertAddress"
import { escape_key } from "@/lib/functions"
import PhoneInput from "@/components/ux/PhoneInput"

type BLProps = {
    userId: string,
    address?: address_type | null
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    
    const upsertAddress = UseUpsertAddress(props.userId, props.address)

    return {
        form: upsertAddress.form,
        values: upsertAddress.form.getValues(),
        save: async (values: AddressesSchema) => {
            await upsertAddress.mutation.mutateAsync(values)
            escape_key()
        }
    }
}

const AddressForm: React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.save)} className="flex flex-col w-full space-y-3 p-2 w-full">
                <div className="grid grid-cols-2 gap-2">
                    <FormField
                        name="firstname"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="w-40">Firstname</FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} value={field.value ?? ""} placeholder="Name" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="lastname"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="w-40">Lastname</FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} value={field.value ?? ""} placeholder="Name" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    name="phoneNumber"
                    control={bl.form.control}
                    render={({ field }) => (
                        <FormItem className="flex-grow flex flex-row items-center">
                            <FormLabel className="w-40">Phone</FormLabel>
                            <FormControl className="flex-grow">
                                <PhoneInput defaultCountry="AU" {...field} value={field.value} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    name="address"
                    control={bl.form.control}
                    render={({ field }) => (
                    <FormItem className="flex flex-row flex-grow items-center">
                        <FormLabel className="w-40"> Address </FormLabel>
                        <FormControl>
                            <AddressInput {...field} value={field.value ?? ""} placeholder="Address" />
                        </FormControl>
                    </FormItem>
                    )}
                />
                <div className="flex flex-row space-x-2 mt-auto">
                    <CancelDialogButton />
                    <Button type="submit" className="flex-grow"> {props.address ? 'Confirm' : 'Add'} </Button>
                </div>
            </form>
        </Form>
    )
}  

export default AddressForm;
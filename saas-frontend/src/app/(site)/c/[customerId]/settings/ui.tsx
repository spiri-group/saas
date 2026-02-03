"use client"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel"
import { address_type } from "@/utils/spiriverse"
import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import React, { useState } from "react"
import DeliveryInstructionsForm from "./components/DeliveryInstructions"
import UseRemoveAddress from "./hooks/UseRemoveAddress"
import AddressForm from "./components/AddressForm"
import UseUpdateUserProfile, { UpdateUserProfileFormSchema } from "./hooks/UseUpdateUserProfile"
import UseUserProfile from "./hooks/UseUserProfile"
import UseSetAddressAsDefault from "./hooks/UseSetAddressAsDefault"
import useFormStatus from "@/components/utils/UseFormStatus"
import { toast } from "sonner"

type BLProps = {
    userId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    
    const updateUserProfile = UseUpdateUserProfile(props.userId)
    const userProfile = UseUserProfile(props.userId)
    const removeAddress = UseRemoveAddress()
    const setAddressAsDefault = UseSetAddressAsDefault()

    const status = useFormStatus();

    return {
        mutation: updateUserProfile.mutation,
        form: updateUserProfile.form,
        values: updateUserProfile.form.getValues(),
        status,
        save: async (values: UpdateUserProfileFormSchema) => {
            await status.submit(
                updateUserProfile.mutation.mutateAsync,
                values,
                () => {
                    status.reset()
                }
            )
        },
        loading: userProfile.isLoading,
        saving: status.formState == "processing",
        userProfile: {
            get: userProfile.data
        },
        removeAddress,
        setAddressAsDefault
    }
}

const UserProfileForm: React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.save)} className="flex-grow w-full flex flex-col p-3">
                    <div className="flex flex-col space-y-2 items-center md:flex-row space-x-2">
                        <FormField
                            name="email"
                            control={bl.form.control}
                            render={({ field }) => (
                            <FormItem className="flex-grow flex flex-row items-center space-x-3">
                                <FormLabel>Email</FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} value={field.value ?? ""} placeholder="Email" disabled={true} />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                        <FormField
                            name="firstname"
                            control={bl.form.control}
                            render={({ field }) => (
                            <FormItem className="flex-grow flex flex-row items-center space-x-3">
                                <FormLabel>First name</FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} value={field.value ?? ""} placeholder="First name" />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                        <FormField
                            name="lastname"
                            control={bl.form.control}
                            render={({ field }) => (
                            <FormItem className="flex-grow flex flex-row items-center space-x-3">
                                <FormLabel>Last name</FormLabel>
                                <FormControl className="flex-grow">
                                    <Input {...field} value={field.value ?? ""} placeholder="Last name" />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                        <Button 
                            disabled={bl.saving || bl.form.formState.isDirty == false}
                            variant={bl.status.button.variant}
                            type="submit">
                                { bl.status.formState == "idle" ? "Save": bl.status.button.title }
                            </Button>
                    </div>
            </form>
        </Form>
    )
}  

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props)

    const [selectedAddress, setSelectedAddress] = useState<address_type | null>(null)

    if (bl.loading) return <div></div>

    return (
        <>  
            <div className="flex flex-col min-h-screen-minus-nav pt-2">
                <Panel className="flex-grow mt-1 mb-3 mr-3">
                    <PanelHeader className="p-4">
                        <h2 className="text-xl font-bold"> 
                        My Details
                        </h2>
                    </PanelHeader>
                    <PanelContent className="px-3">
                        <UserProfileForm userId={props.userId} />
                        <div className="p-2">
                            <h2> Addresses </h2>
                            <div className="flex flex-col md:grid grid-cols-4 mt-3 gap-3 grid-rows-auto">
                                <Popover>
                                    <PopoverTrigger> 
                                        <Card className="flex flex-col items-center justify-center h-full w-full border-dashed border-gray-800 rounded-md space-y-3">
                                            <Plus size={50} className="text-primary" />
                                            <span> Add address </span>
                                        </Card>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <AddressForm userId={props.userId} />
                                    </PopoverContent>
                                </Popover>
                                {bl.userProfile.get?.addresses?.length && (
                                    <>
                                        {bl.userProfile.get.addresses.map((address) => (
                                            <Card key={address.id} className="flex flex-col w-full p-2 mt-2 space-y-3">
                                                <div className="flex flex-row space-x-2">
                                                    <span>{address.firstname}</span>
                                                    <span>{address.lastname}</span>
                                                </div>
                                                <span>Phone number: {address.phoneNumber.displayAs}</span>
                                                <span>{address.address?.formattedAddress}</span>
                                                    <Button variant="link" onClick={() => setSelectedAddress(address)}>
                                                        Set delivery instructions
                                                    </Button>
                                                <div className="flex flex-row">
                                                    <Popover>
                                                        <PopoverTrigger>
                                                            <Button variant="link">Edit</Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent>
                                                            <AddressForm userId={props.userId} address={address} />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button 
                                                        variant="link" 
                                                        onClick={() => {
                                                            if (address.id && props.userId) {
                                                                if (address.isDefault) {
                                                                    toast.error("Cannot remove default address"); // replace with your toast function
                                                                } else {
                                                                    bl.removeAddress.mutation.mutate({
                                                                        customerId: props.userId,
                                                                        addressId: address.id
                                                                    })
                                                                }
                                                            }
                                                        }}
                                                    > Remove </Button>
                                                    {!address.isDefault &&
                                                        <Button 
                                                            variant="link" 
                                                            onClick={() => {
                                                                if (address.id && props.userId) {
                                                                    bl.setAddressAsDefault.mutation.mutate({
                                                                        customerId: props.userId,
                                                                        addressId: address.id
                                                                    })
                                                                }
                                                            }}
                                                        > Set as default </Button>
                }
                                                </div>
                                            </Card>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </PanelContent>
                </Panel>
            </div>
            {selectedAddress != null && (
                <Dialog open={true}>
                    <DialogContent className="flex flex-col flex-grow">
                        <DeliveryInstructionsForm 
                            userId={props.userId} 
                            addressId={selectedAddress.id} 
                            onCancel={() => setSelectedAddress(null)} />
                    </DialogContent>
                </Dialog>
            )}
        </>
    )
}

export default UI;
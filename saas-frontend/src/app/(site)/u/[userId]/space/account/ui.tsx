'use client';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Plus, User, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import React, { useState } from 'react';
import { address_type } from '@/utils/spiriverse';
import DeliveryInstructionsForm from './components/DeliveryInstructions';
import UseRemoveAddress from './hooks/UseRemoveAddress';
import AddressForm from './components/AddressForm';
import UseUpdateUserProfile, { UpdateUserProfileFormSchema } from '@/hooks/user/UseUpdateUserProfile';
import UseUserProfile from '@/hooks/user/UseUserProfile';
import UseSetAddressAsDefault from './hooks/UseSetAddressAsDefault';
import useFormStatus from '@/components/utils/UseFormStatus';
import { toast } from 'sonner';

type Props = {
    userId: string;
};

const useBL = (props: { userId: string }) => {
    const updateUserProfile = UseUpdateUserProfile(props.userId);
    const userProfile = UseUserProfile(props.userId);
    const removeAddress = UseRemoveAddress();
    const setAddressAsDefault = UseSetAddressAsDefault();
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
                () => { status.reset(); }
            );
        },
        loading: userProfile.isLoading,
        saving: status.formState == 'processing',
        userProfile: { get: userProfile.data },
        removeAddress,
        setAddressAsDefault
    };
};

const UserProfileForm: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.save)} className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <FormField
                        name="email"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className="text-slate-400 text-xs">Email</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Email" disabled={true}
                                        className="bg-white/5 border-white/10 text-white" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="firstname"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className="text-slate-400 text-xs">First name</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="First name"
                                        className="bg-white/5 border-white/10 text-white" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="lastname"
                        control={bl.form.control}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className="text-slate-400 text-xs">Last name</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value ?? ''} placeholder="Last name"
                                        className="bg-white/5 border-white/10 text-white" />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        disabled={bl.saving || bl.form.formState.isDirty == false}
                        variant={bl.status.button.variant}
                        type="submit"
                        className="bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
                    >
                        {bl.status.formState == 'idle' ? 'Save' : bl.status.button.title}
                    </Button>
                </div>
            </form>
        </Form>
    );
};

const UI: React.FC<Props> = ({ userId }) => {
    const bl = useBL({ userId });
    const [selectedAddress, setSelectedAddress] = useState<address_type | null>(null);

    if (bl.loading) {
        return (
            <div className="min-h-screen-minus-nav flex items-center justify-center">
                <User className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen-minus-nav flex flex-col p-4 md:p-6" data-testid="account-page">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-500/20 rounded-xl">
                        <User className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-light text-white">My Account</h1>
                        <p className="text-slate-400 text-sm">Profile and delivery addresses</p>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 mb-4">
                    <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        Profile
                    </h2>
                    <UserProfileForm userId={userId} />
                </div>

                {/* Addresses Section */}
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex-grow">
                    <h2 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        Delivery Addresses
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Add address card */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    data-testid="add-address-btn"
                                    className="flex flex-col items-center justify-center h-40 w-full border border-dashed border-white/20 rounded-xl hover:border-white/30 hover:bg-white/5 transition-all"
                                >
                                    <Plus size={32} className="text-amber-400 mb-2" />
                                    <span className="text-sm text-slate-400">Add address</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="bg-slate-900 border-white/20">
                                <AddressForm userId={userId} />
                            </PopoverContent>
                        </Popover>

                        {/* Existing addresses */}
                        {bl.userProfile.get?.addresses?.map((address) => (
                            <Card key={address.id} className="bg-white/5 border-white/10 p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm text-white">{address.firstname} {address.lastname}</span>
                                        {address.isDefault && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Default</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">
                                        {address.phoneNumber?.displayAs}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {address.address?.formattedAddress}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/10">
                                    <Button variant="link" size="sm" className="text-xs text-slate-400 hover:text-white px-1"
                                        onClick={() => setSelectedAddress(address)}>
                                        Delivery instructions
                                    </Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="link" size="sm" className="text-xs text-slate-400 hover:text-white px-1">
                                                Edit
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="bg-slate-900 border-white/20">
                                            <AddressForm userId={userId} address={address} />
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="link" size="sm" className="text-xs text-slate-400 hover:text-red-400 px-1"
                                        onClick={() => {
                                            if (address.id && userId) {
                                                if (address.isDefault) {
                                                    toast.error('Cannot remove default address');
                                                } else {
                                                    bl.removeAddress.mutation.mutate({
                                                        customerId: userId,
                                                        addressId: address.id
                                                    });
                                                }
                                            }
                                        }}>
                                        Remove
                                    </Button>
                                    {!address.isDefault && (
                                        <Button variant="link" size="sm" className="text-xs text-amber-400 hover:text-amber-300 px-1"
                                            onClick={() => {
                                                if (address.id && userId) {
                                                    bl.setAddressAsDefault.mutation.mutate({
                                                        customerId: userId,
                                                        addressId: address.id
                                                    });
                                                }
                                            }}>
                                            Set default
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {selectedAddress != null && (
                <Dialog open={true} onOpenChange={() => setSelectedAddress(null)}>
                    <DialogContent>
                        <DeliveryInstructionsForm
                            userId={userId}
                            addressId={selectedAddress.id}
                            onCancel={() => setSelectedAddress(null)}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default UI;

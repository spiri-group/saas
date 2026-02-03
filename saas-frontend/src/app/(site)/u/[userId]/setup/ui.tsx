'use client';

import UseUpdateUserProfile, { UpdateUserProfileFormSchema } from "@/app/(site)/c/[customerId]/settings/hooks/UseUpdateUserProfile"
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import useFormStatus from "@/components/utils/UseFormStatus"
import AddressInput from "@/components/ux/AddressInput";
import PhoneInput from "@/components/ux/PhoneInput";
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/services/gql';
import { v4 as uuid } from 'uuid';
import { Sparkles, User, Phone, MapPin, Shield, ArrowRight, Store, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import SpiriLogo from "@/icons/spiri-logo";
import HierarchicalReligionPicker from '@/components/ux/HierarchicalReligionPicker';

type BLProps = {
    userId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const router = useRouter();
    const { form, mutation, } = UseUpdateUserProfile(props.userId)

    const status_asUser = useFormStatus();
    const status_asMerchant = useFormStatus();
    const status_asPractitioner = useFormStatus();

    return {
        isReady: true,
        form,
        status: {
            merchant: status_asMerchant,
            user: status_asUser,
            practitioner: status_asPractitioner,
        },
        saveMerchant: async (values: UpdateUserProfileFormSchema) => {
            await status_asMerchant.submit(
                async (profileValues) => {
                    console.log('[saveMerchant] Starting merchant setup flow');

                    // First update the user profile
                    await mutation.mutateAsync(profileValues);
                    console.log('[saveMerchant] User profile updated');

                    // Then create draft merchant and get merchantId
                    const merchantId = uuid();
                    console.log('[saveMerchant] Generated merchantId:', merchantId);

                    const response = await gql<{ create_draft_merchant: { id: string } }>(
                        `mutation CreateDraftMerchant($merchantId: ID!) {
                            create_draft_merchant(merchantId: $merchantId) {
                                id
                            }
                        }`,
                        { merchantId }
                    );

                    console.log('[saveMerchant] Draft merchant created, response:', response);
                    return response.create_draft_merchant.id;
                },
                values,
                (merchantId) => {
                    console.log('[saveMerchant] Redirecting to /m/setup with merchantId:', merchantId);
                    router.replace(`/m/setup?merchantId=${merchantId}`)
                }
            )
        },
        saveUser: async (values: UpdateUserProfileFormSchema) => {
            await status_asUser.submit(mutation.mutateAsync, values,
                () => {
                    router.replace('/')
                }
            )
        },
        savePractitioner: async (values: UpdateUserProfileFormSchema) => {
            await status_asPractitioner.submit(
                async (profileValues) => {
                    console.log('[savePractitioner] Starting practitioner setup flow');

                    // First update the user profile
                    await mutation.mutateAsync(profileValues);
                    console.log('[savePractitioner] User profile updated');

                    // Then create draft practitioner and get practitionerId
                    const practitionerId = uuid();
                    console.log('[savePractitioner] Generated practitionerId:', practitionerId);

                    const response = await gql<{ create_draft_merchant: { id: string } }>(
                        `mutation CreateDraftPractitioner($merchantId: ID!) {
                            create_draft_merchant(merchantId: $merchantId) {
                                id
                            }
                        }`,
                        { merchantId: practitionerId }
                    );

                    console.log('[savePractitioner] Draft practitioner created, response:', response);
                    return response.create_draft_merchant.id;
                },
                values,
                (practitionerId) => {
                    console.log('[savePractitioner] Redirecting to /p/setup with practitionerId:', practitionerId);
                    router.replace(`/p/setup?practitionerId=${practitionerId}`)
                }
            )
        }
    }
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Debug logging
    useEffect(() => {
        console.log('[UserSetup] Form state:', {
            isDirty: bl.form.formState.isDirty,
            isValid: bl.form.formState.isValid,
            errors: bl.form.formState.errors,
            values: bl.form.getValues()
        });
    }, [bl.form.formState]);

    return (
        <div className="w-screen min-h-screen-minus-nav w-full relative overflow-hidden">
            {/* Dark slate background matching homepage */}
            <div className="absolute inset-0 bg-slate-950"></div>

            {/* Animated orbs - matching homepage with red/gold accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/15 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-full min-h-screen-minus-nav grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 items-stretch">
                {/* Left side - Welcome content */}
                <div
                    className={`hidden lg:flex flex-col transition-all duration-1000 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                    }`}
                >
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-6">
                            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                            <SpiriLogo height={40} />
                        </div>

                        <h1 className="text-3xl font-light text-white mb-4 tracking-wide">
                            Welcome to Your Spiritual Journey
                        </h1>

                        <div className="space-y-4 text-slate-200 leading-relaxed">
                            <p className="text-lg font-light">
                                We&apos;re excited to have you join SpiriVerse—a sacred digital space where energy, faith, and creativity converge.
                            </p>

                            <p>
                                Our mission is to connect you with meaningful spiritual experiences and trusted practitioners across diverse traditions. Whether you&apos;re seeking healing, guidance, connection, or creative expression, you&apos;ll find a welcoming community here.
                            </p>

                            <p>
                                To ensure we deliver the best experience possible, we&apos;re asking for a few details during signup. Your information helps us provide smooth communication, timely booking updates, and personalized recommendations.
                            </p>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6">
                                <div className="flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                                    <p className="text-sm text-slate-300">
                                        We understand that trust and privacy are essential on your journey. Your information is safe with us and used solely to enhance your experience and maintain seamless support.
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm italic text-slate-300 pt-4">
                                Thank you for choosing SpiriVerse as your trusted platform for spiritual connection and growth.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right side - Form */}
                <div
                    className={`flex flex-col transition-all duration-1000 delay-300 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                    }`}
                >
                    <div className="backdrop-blur-xl bg-white/95 border border-white/20 rounded-2xl p-8 shadow-2xl">
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-light text-slate-800">Let&apos;s Get Started</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <User className="w-4 h-4" />
                                    <span className="font-mono">{bl.form.getValues('email')}</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">Complete your profile to begin your spiritual journey</p>
                        </div>

                        <Form {...bl.form}>
                            <form className="space-y-6">
                                {/* First Name and Last Name - side by side */}
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-500 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <FormField
                                        name="firstname"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700">First Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder="Enter your first name"
                                                        className="border-slate-200 focus:border-red-400 focus:ring-red-400/20"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name="lastname"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder="Enter your last name"
                                                        className="border-slate-200 focus:border-red-400 focus:ring-red-400/20"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Phone Number */}
                                <FormField
                                    name="phoneNumber"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem className={`transition-all duration-500 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                            <FormLabel className="text-slate-700 flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-red-600" />
                                                Phone Number
                                            </FormLabel>
                                            <FormControl>
                                                <PhoneInput
                                                    {...field}
                                                    value={field.value ?? { value: "", raw: "", displayAs: "" }}
                                                    defaultCountry="AU"
                                                    ariaLabel="Phone number"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {/* Address */}
                                <FormField
                                    name="address"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem className={`transition-all duration-500 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                            <FormLabel className="text-slate-700 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-red-600" />
                                                Address
                                            </FormLabel>
                                            <FormControl>
                                                <AddressInput
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    placeholder="Enter your address"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {/* Religion */}
                                <FormField
                                    name="religion"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem className={`transition-all duration-500 delay-750 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                            <FormLabel className="text-slate-700 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-red-600" />
                                                Religion (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <HierarchicalReligionPicker
                                                    selectedReligionId={field.value?.id || undefined}
                                                    onReligionSelect={(religionId, religionLabel) => {
                                                        field.onChange(religionId ? { id: religionId, label: religionLabel } : null);
                                                    }}
                                                    placeholder="Select your religion"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {/* Open to Other Experiences Checkbox */}
                                <FormField
                                    name="openToOtherExperiences"
                                    control={bl.form.control}
                                    render={({ field }) => (
                                        <FormItem className={`flex flex-row items-start space-x-3 space-y-0 transition-all duration-500 delay-775 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-slate-700 cursor-pointer">
                                                    I&apos;m open to other experiences
                                                </FormLabel>
                                                <FormDescription className="text-xs text-slate-500">
                                                    Allow us to show you products and experiences from other spiritual traditions
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {/* Security Question */}
                                <div className={`space-y-4 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-6 transition-all duration-500 delay-800 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-5 h-5 text-amber-600" />
                                        <h3 className="text-md font-semibold text-slate-800">Set a Recovery Question</h3>
                                    </div>
                                    <FormDescription className="text-sm text-slate-600">
                                        This question will help our support team verify your identity. Choose something that&apos;s not easily discoverable on social networks.
                                    </FormDescription>

                                    <FormField
                                        name="securityQuestions.0.question"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder="e.g., What was the name of your first pet?"
                                                        className="border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 bg-white"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        name="securityQuestions.0.answer"
                                        control={bl.form.control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder="Your answer"
                                                        className="border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 bg-white"
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className={`flex flex-col gap-3 pt-4 transition-all duration-500 delay-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                    {/* Main action - Start Browsing */}
                                    {bl.status.merchant.formState === "idle" && bl.status.practitioner.formState === "idle" && (
                                        <Button
                                            disabled={bl.status.user.formState === "processing" || !bl.form.formState.isDirty}
                                            variant={bl.status.user.button.variant}
                                            type="button"
                                            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                                            onClick={() => {
                                                bl.form.handleSubmit(bl.saveUser)()
                                            }}
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                {bl.status.user.formState === "idle" ? (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Start Browsing SpiriVerse
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </>
                                                ) : bl.status.user.button.title}
                                            </span>
                                        </Button>
                                    )}

                                    {/* Secondary actions - Merchant and Practitioner */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {bl.status.user.formState === "idle" && bl.status.practitioner.formState === "idle" && (
                                            <Button
                                                disabled={bl.status.merchant.formState === "processing" || !bl.form.formState.isDirty}
                                                variant={bl.status.merchant.button.variant}
                                                type="button"
                                                data-testid="continue-as-merchant-btn"
                                                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                                                onClick={() => {
                                                    bl.form.handleSubmit(bl.saveMerchant)()
                                                }}
                                            >
                                                <span className="flex items-center justify-center gap-2">
                                                    {bl.status.merchant.formState === "idle" ? (
                                                        <>
                                                            <Store className="w-4 h-4" />
                                                            Continue as Merchant
                                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    ) : bl.status.merchant.button.title}
                                                </span>
                                            </Button>
                                        )}

                                        {bl.status.user.formState === "idle" && bl.status.merchant.formState === "idle" && (
                                            <Button
                                                disabled={bl.status.practitioner.formState === "processing" || !bl.form.formState.isDirty}
                                                variant={bl.status.practitioner.button.variant}
                                                type="button"
                                                data-testid="continue-as-practitioner-btn"
                                                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                                                onClick={() => {
                                                    bl.form.handleSubmit(bl.savePractitioner)()
                                                }}
                                            >
                                                <span className="flex items-center justify-center gap-2">
                                                    {bl.status.practitioner.formState === "idle" ? (
                                                        <>
                                                            <Star className="w-4 h-4" />
                                                            Continue as Practitioner
                                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    ) : bl.status.practitioner.button.title}
                                                </span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UI;
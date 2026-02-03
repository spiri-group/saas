'use client';

import { DialogContent, DialogHeader } from "@/components/ui/dialog"
import Link from "next/link";
import UseStripeMerchantAccount from "../../_hooks/UseStripeMerchantAccount";
import { buttonVariants } from "@/components/ui/button";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { cn } from "@/lib/utils";
import SpiriLogo from "@/icons/spiri-logo";
import StripeLogo from "@/icons/stripe-logo";

type Props = {
    merchantId: string
}

const MerchantBankingComponent : React.FC<Props> = ({ merchantId }) => {
    const current_url = window.location.href
    const stripeBusinessAccount = UseStripeMerchantAccount(merchantId, undefined, current_url)

    if (!stripeBusinessAccount.isLoading) {
        if (stripeBusinessAccount.data != null) {
            const link = stripeBusinessAccount.data.update_link != undefined ? stripeBusinessAccount.data.update_link.url : stripeBusinessAccount.data.onboarding_link.url;
            const isUpdate = stripeBusinessAccount.data.update_link != undefined;
            return (
                <DialogContent className="max-w-none w-[500px] h-[300px]">
                    <DialogHeader className="flex flex-row justify-between items-center">
                        <h2 className="text-xl font-bold">Your banking information</h2>
                        <div className="flex flex-row space-x-1 items-center">
                            <SpiriLogo
                                height={24} />
                            <StripeLogo
                                height={36} />
                        </div>
                    </DialogHeader>
                    <p className="text-sm">
                        {isUpdate ? 
                            "Update your banking information securely through Stripe." : 
                            "We are proud to partner with Stripe to handle all your payouts seamlessly and securely. Through this collaboration, Stripe allows us to offer a trusted and efficient way to receive your earnings directly to your bank account."
                        }
                    </p>
                    <p className="text-sm">Stripe&apos;s secure infrastructure ensures that your personal and financial information is protected throughout the process.</p>
                    <div className="flex flex-row space-x-3">
                        <CancelDialogButton />
                        <Link 
                            className={cn("flex-grow", buttonVariants({ variant: "default" }))}
                            href={link}>Continue to Stripe
                    </Link>
                    </div>
                </DialogContent>
            )
        }
    } else {
        
        return <></>
    }
}

export default MerchantBankingComponent
'use client';

import {loadConnectAndInitialize, StripeConnectInstance} from '@stripe/connect-js';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    ConnectTaxRegistrations,
    ConnectComponentsProvider,
  } from "@stripe/react-connect-js"
import { useEffect, useState } from "react"
import UseStripeMerchantAccount from '../../_hooks/UseStripeMerchantAccount';
import CancelDialogButton from '@/components/ux/CancelDialogButton';
import MerchantBankingComponent from '../Banking';

type Props = {
    merchantId: string
}

const MerchantTaxRegistrations: React.FC<Props> = (props) => {
    
  const current_url = window.location.href
  const stripeAccount = UseStripeMerchantAccount(props.merchantId, ["tax_registrations"], current_url)

  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null)

  useEffect(() => {
        if (stripeAccount.data?.token != null) {
            const instance = loadConnectAndInitialize({
            publishableKey: process.env.NEXT_PUBLIC_stripe_token as string,
            fetchClientSecret: () => Promise.resolve(stripeAccount.data?.token as string), // Wrap token in a Promise
            fonts: [{ family: "Inter", cssSrc: 'https://fonts.googleapis.com/css?family=Inter' }],
            appearance: {
                variables: {
                fontFamily: "Inter"
                }
            }
            });
            setStripeConnectInstance(instance);
        }
   }, [stripeAccount.isLoading]);


  if (stripeAccount.isLoading) return <></>;
  
  if (stripeAccount.data?.onboarding_link != null) return <MerchantBankingComponent merchantId={props.merchantId} />;

  return (
    <DialogContent className="flex flex-col w-[800px] h-[650px]">
        <DialogHeader>
            <DialogTitle> Tax Registrations </DialogTitle>
        </DialogHeader>
        <div className="flex-grow">
        {
            stripeConnectInstance != null && (
                <>
                    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
                        <ConnectTaxRegistrations  />
                    </ConnectComponentsProvider>
                </>
            )
        }
        </div>
        <DialogFooter>
            <CancelDialogButton className="w-full" 
                label="Finish"
                />
        </DialogFooter>
    </DialogContent>
  )
}

export default MerchantTaxRegistrations
'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import CurrencySpan from '@/components/ux/CurrencySpan';
import { Panel } from '@/components/ui/panel';

interface PaymentMethodCollectorProps {
  clientSecret: string;
  amount: { amount: number; currency: string };
  itemDescription: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitButtonText?: string;
}

const PaymentForm = ({
  amount,
  itemDescription,
  onSuccess,
  onCancel,
  submitButtonText = 'Save Card & Submit'
}: Omit<PaymentMethodCollectorProps, 'clientSecret'>) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required', // Only redirect if payment method requires it (cards don't)
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred while saving your payment method.');
      setIsProcessing(false);
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      // SetupIntent confirmed successfully - show success state before closing
      setIsProcessing(false);
      setIsSuccess(true);
      // Show success message for 2 seconds before closing
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } else {
      // Handle other statuses (e.g., requires_action for 3D Secure)
      setErrorMessage('Payment method setup is pending. Please complete any additional verification.');
      setIsProcessing(false);
    }
  };

  // Show success state
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">Card Saved Successfully!</h3>
          <p className="text-slate-400 text-sm">Your reading request has been submitted.</p>
          <p className="text-slate-500 text-xs mt-2">You&apos;ll be notified when a reader claims your request.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order Summary */}
      <Panel dark className="p-4 rounded-lg border border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300 text-sm">{itemDescription}</span>
          <CurrencySpan value={amount} className="text-white font-medium" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
          <span className="text-white font-medium">Total</span>
          <CurrencySpan value={amount} className="text-purple-400 font-bold text-lg" />
        </div>
      </Panel>

      {/* Payment Element */}
      <div className="bg-white rounded-lg p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {submitButtonText}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

const StripePaymentMethodCollector = (props: PaymentMethodCollectorProps) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    const initStripe = async () => {
      const stripeKey = process.env.NEXT_PUBLIC_stripe_token ?? '';
      const stripeInstance = await loadStripe(stripeKey);
      setStripe(stripeInstance);
    };
    initStripe();
  }, []);

  if (!stripe) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#a855f7',
            colorBackground: '#1e293b',
            colorText: '#e2e8f0',
            colorDanger: '#ef4444',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm
        amount={props.amount}
        itemDescription={props.itemDescription}
        onSuccess={props.onSuccess}
        onCancel={props.onCancel}
        submitButtonText={props.submitButtonText}
      />
    </Elements>
  );
};

export default StripePaymentMethodCollector;

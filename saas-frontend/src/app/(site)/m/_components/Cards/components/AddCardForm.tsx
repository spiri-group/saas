'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { LoaderIcon, CreditCardIcon } from 'lucide-react';
import { useCreateCardSetupIntent } from '../hooks/UseCardSetupIntent';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Initialize Stripe outside of component to avoid recreating on each render
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
    if (!stripePromise) {
        const key = process.env.NEXT_PUBLIC_stripe_token ?? '';
        stripePromise = loadStripe(key);
    }
    return stripePromise;
};

type CardFormProps = {
    clientSecret: string;
    merchantId: string;
    onSuccess: () => void;
    onCancel: () => void;
};

const CardForm: React.FC<CardFormProps> = ({ clientSecret, merchantId, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError('Card element not found');
            setIsProcessing(false);
            return;
        }

        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: {
                card: cardElement,
            },
        });

        if (setupError) {
            setError(setupError.message || 'Failed to add card');
            setIsProcessing(false);
            return;
        }

        if (setupIntent?.status === 'succeeded') {
            // Invalidate the cards query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['merchant-cards', merchantId] });
            toast.success('Card added successfully');
            onSuccess();
        } else {
            setError('Card setup did not complete successfully');
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-background">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#ffffff',
                                '::placeholder': {
                                    color: '#6b7280',
                                },
                            },
                            invalid: {
                                color: '#ef4444',
                            },
                        },
                        hidePostalCode: false,
                    }}
                />
            </div>

            {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex justify-end space-x-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isProcessing}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={!stripe || isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                            Adding...
                        </>
                    ) : (
                        <>
                            <CreditCardIcon className="h-4 w-4 mr-2" />
                            Add Card
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

type AddCardFormProps = {
    merchantId: string;
    onSuccess: () => void;
    onCancel: () => void;
};

const AddCardForm: React.FC<AddCardFormProps> = ({ merchantId, onSuccess, onCancel }) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const createSetupIntent = useCreateCardSetupIntent();

    useEffect(() => {
        const initSetupIntent = async () => {
            try {
                const result = await createSetupIntent.mutateAsync(merchantId);
                if (result.success && result.clientSecret) {
                    setClientSecret(result.clientSecret);
                } else {
                    setError(result.message || 'Failed to initialize card setup');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to initialize card setup');
            } finally {
                setIsLoading(false);
            }
        };

        initSetupIntent();
    }, [merchantId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <LoaderIcon className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Preparing card form...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                </div>
                <div className="flex justify-end">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Unable to initialize card setup
            </div>
        );
    }

    return (
        <Elements
            stripe={getStripe()}
            options={{
                clientSecret,
                appearance: {
                    theme: 'night',
                    variables: {
                        colorPrimary: '#8b5cf6',
                    },
                },
            }}
        >
            <CardForm
                clientSecret={clientSecret}
                merchantId={merchantId}
                onSuccess={onSuccess}
                onCancel={onCancel}
            />
        </Elements>
    );
};

export default AddCardForm;

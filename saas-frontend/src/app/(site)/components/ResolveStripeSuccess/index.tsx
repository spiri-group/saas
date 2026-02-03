'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import PurchaseSuccess from "../Catalogue/components/PurchaseSuccess";
import { Loader2, RefreshCw, Mail, X } from "lucide-react";
import { useSignalRConnection } from "@/components/utils/SignalRProvider";
import useCreatePlatformAlert from "./hooks/UseCreatePlatformAlert";

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed' | 'timeout';

type PaymentConfirmedData = {
    orderId: string;
    setupIntentId: string;
    target: string;
};

const ResolveStripeSuccess = () => {
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const signalR = useSignalRConnection();
    const createPlatformAlert = useCreatePlatformAlert();
    const [activeDialog, setActiveDialog] = useState<string | null>(null);
    const [forObjectRef, setForObjectRef] = useState<recordref_type | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [isRetrying, setIsRetrying] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pollCountRef = useRef(0);
    const setupIntentIdRef = useRef<string | null>(null);
    const alertCreatedRef = useRef(false);

    // Clear URL params and reset state
    const handleClose = useCallback(() => {
        // Stop any ongoing polling
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Reset state
        setPaymentStatus('idle');
        setActiveDialog(null);
        setForObjectRef(null);
        setupIntentIdRef.current = null;

        // Clear URL params by navigating to the current path without query params
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    // Retry checking payment status
    const handleRetry = useCallback(async () => {
        const setupIntentId = setupIntentIdRef.current;
        if (!setupIntentId) return;

        setIsRetrying(true);
        setPaymentStatus('processing');
        pollCountRef.current = 0;

        try {
            const resp = await gql<{
                checkSetupIntentPayment: {
                    forObject: recordref_type,
                    target: string,
                    paymentConfirmed: boolean
                }
            }>(`query checkSetupIntentPayment($setupIntentId: String!) {
                checkSetupIntentPayment(id: $setupIntentId) {
                    forObject {
                        id
                        partition
                        container
                    }
                    target
                    paymentConfirmed
                }
            }`, { setupIntentId });

            if (resp.checkSetupIntentPayment.paymentConfirmed) {
                setActiveDialog(resp.checkSetupIntentPayment.target);
                setForObjectRef(resp.checkSetupIntentPayment.forObject);
                setPaymentStatus('success');
            } else {
                // Still not confirmed, go back to timeout state
                setPaymentStatus('timeout');
            }
        } catch (error) {
            console.error('[ResolveStripeSuccess] Error retrying payment check:', error);
            setPaymentStatus('timeout');
        } finally {
            setIsRetrying(false);
        }
    }, []);

    const dialogMapping: Record<string, React.FC<{ forObject?: recordref_type | null }>> = {
        "CUSTOMER-WEB-ORDER": () => <PurchaseSuccess />
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Handle payment confirmation (called by SignalR or polling)
    const handlePaymentConfirmed = useCallback(async (setupIntentId: string, target?: string) => {
        console.log('[ResolveStripeSuccess] Payment confirmed for setupIntent:', setupIntentId);

        // Stop polling if running
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }

        // Fetch the forObject details
        try {
            const resp = await gql<{
                checkSetupIntentPayment: {
                    forObject: recordref_type,
                    target: string,
                    paymentConfirmed: boolean
                }
            }>(`query checkSetupIntentPayment($setupIntentId: String!) {
                checkSetupIntentPayment(id: $setupIntentId) {
                    forObject {
                        id
                        partition
                        container
                    }
                    target
                    paymentConfirmed
                }
            }`, { setupIntentId });

            setForObjectRef(resp.checkSetupIntentPayment.forObject);
            setActiveDialog(target || resp.checkSetupIntentPayment.target);
            setPaymentStatus('success');
        } catch (error) {
            console.error('[ResolveStripeSuccess] Error fetching payment details:', error);
            // Still show success with the target we have
            setActiveDialog(target || 'CUSTOMER-WEB-ORDER');
            setPaymentStatus('success');
        }
    }, []);

    // Listen for SignalR paymentConfirmed messages
    useEffect(() => {
        if (!signalR?.connection) return;

        const handleSignalRMessage = (messages: { type: string; data: PaymentConfirmedData }[]) => {
            console.log('[ResolveStripeSuccess] Received SignalR paymentConfirmed:', messages);

            for (const msg of messages) {
                if (msg.type === 'data' && msg.data?.setupIntentId === setupIntentIdRef.current) {
                    handlePaymentConfirmed(msg.data.setupIntentId, msg.data.target);
                    break;
                }
            }
        };

        signalR.connection.on('paymentConfirmed', handleSignalRMessage);

        return () => {
            signalR.connection?.off('paymentConfirmed', handleSignalRMessage);
        };
    }, [signalR?.connection, handlePaymentConfirmed]);

    // Main effect to detect redirect and start processing
    useEffect(() => {
        const process = async () => {
            if (params != null
                && params.has("redirect_status")
                && params.has("setup_intent")
                && params.get("redirect_status") === "succeeded") {

                const setupIntentId = params.get("setup_intent");
                if (!setupIntentId) return;

                setupIntentIdRef.current = setupIntentId;
                setPaymentStatus('processing');

                console.log('[ResolveStripeSuccess] Processing payment for setupIntent:', setupIntentId);

                // Check payment status function
                const checkPaymentStatus = async (): Promise<boolean> => {
                    try {
                        const resp = await gql<{
                            checkSetupIntentPayment: {
                                forObject: recordref_type,
                                target: string,
                                paymentConfirmed: boolean
                            }
                        }>(`query checkSetupIntentPayment($setupIntentId: String!) {
                            checkSetupIntentPayment(id: $setupIntentId) {
                                forObject {
                                    id
                                    partition
                                    container
                                }
                                target
                                paymentConfirmed
                            }
                        }`, { setupIntentId });

                        if (resp.checkSetupIntentPayment.paymentConfirmed) {
                            setActiveDialog(resp.checkSetupIntentPayment.target);
                            setForObjectRef(resp.checkSetupIntentPayment.forObject);
                            setPaymentStatus('success');
                            return true;
                        }
                        return false;
                    } catch (error) {
                        console.error('[ResolveStripeSuccess] Error checking payment status:', error);
                        return false;
                    }
                };

                // Initial check - payment might already be confirmed
                const initialSuccess = await checkPaymentStatus();
                if (initialSuccess) {
                    console.log('[ResolveStripeSuccess] Payment already confirmed on initial check');
                    return;
                }

                // Start polling as fallback (SignalR may not be available in tests)
                const maxPolls = 30; // 60 seconds total
                pollCountRef.current = 0;

                pollIntervalRef.current = setInterval(async () => {
                    pollCountRef.current++;
                    console.log(`[ResolveStripeSuccess] Polling attempt ${pollCountRef.current}/${maxPolls}`);

                    const success = await checkPaymentStatus();

                    if (success || pollCountRef.current >= maxPolls) {
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }

                        if (!success && pollCountRef.current >= maxPolls) {
                            console.log('[ResolveStripeSuccess] Polling timeout');
                            setPaymentStatus('timeout');

                            // Create platform alert for support team (only once)
                            if (!alertCreatedRef.current) {
                                alertCreatedRef.current = true;
                                createPlatformAlert.mutate({
                                    alertType: 'PAYMENT_TIMEOUT',
                                    severity: 'HIGH',
                                    title: 'Payment Confirmation Timeout',
                                    message: `Payment confirmation timed out after ${maxPolls * 2} seconds for setup intent: ${setupIntentId}`,
                                    context: {
                                        setupIntentId: setupIntentId,
                                        url: typeof window !== 'undefined' ? window.location.href : undefined,
                                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                                    },
                                    source: {
                                        component: 'ResolveStripeSuccess',
                                        environment: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'development' : 'production',
                                    }
                                });
                            }
                        }
                    }
                }, 2000);

            } else {
                setActiveDialog(null);
                setForObjectRef(null);
                setPaymentStatus('idle');
                setupIntentIdRef.current = null;
            }
        };

        process();
    }, [params]);

    // Show processing dialog while waiting for payment confirmation
    if (paymentStatus === 'processing') {
        return (
            <Dialog open={true}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing Payment
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6">
                        <p className="text-center text-muted-foreground">
                            Please wait while we confirm your payment...
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Show timeout message if payment confirmation took too long
    if (paymentStatus === 'timeout') {
        return (
            <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Payment Processing</DialogTitle>
                        <DialogDescription>
                            Your payment is being processed
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-4 space-y-4">
                        <p className="text-center text-muted-foreground">
                            Your payment is being processed. You will receive a confirmation email shortly.
                        </p>

                        <div className="flex flex-col w-full gap-2">
                            <Button
                                onClick={handleRetry}
                                disabled={isRetrying}
                                className="w-full"
                            >
                                {isRetrying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Check Again
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleClose}
                                className="w-full"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Close
                            </Button>
                        </div>

                        <div className="pt-2 border-t w-full">
                            <p className="text-center text-sm text-muted-foreground">
                                Need help?{' '}
                                <a
                                    href="mailto:support@spiriverse.com?subject=Payment%20Processing%20Issue"
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                    <Mail className="h-3 w-3" />
                                    Contact Support
                                </a>
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (activeDialog == null || paymentStatus !== 'success') return <></>;

    const DialogComponent = dialogMapping[activeDialog];
    if (DialogComponent == null) return <></>;

    return (
        <Dialog open={activeDialog != null}>
            <DialogComponent forObject={forObjectRef} />
        </Dialog>
    );
};

export default ResolveStripeSuccess;

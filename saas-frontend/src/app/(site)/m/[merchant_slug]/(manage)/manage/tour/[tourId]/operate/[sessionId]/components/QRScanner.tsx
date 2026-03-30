'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import UseCheckInBooking from "./CheckIn/hooks/UseCheckInBooking";
import { recordref_type } from "@/utils/spiriverse";

type Props = {
    merchantId: string;
    sessionId: string;
    sessionRef: recordref_type;
};

/** Play a short beep via Web Audio API */
const playBeep = (success: boolean) => {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = success ? 880 : 300;
        osc.type = success ? 'sine' : 'square';
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + (success ? 0.15 : 0.3));
    } catch {
        // Web Audio not available
    }
};

const QRScanner: React.FC<Props> = ({ merchantId, sessionId, sessionRef }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [lastResult, setLastResult] = useState<{ code: string; success: boolean; message: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const checkInMutation = UseCheckInBooking(sessionRef);
    const processingRef = useRef(false);

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        // Prevent duplicate processing while a check-in is in progress
        if (processingRef.current) return;
        processingRef.current = true;

        // Extract booking code from QR data — could be a URL or raw code
        let bookingCode = decodedText.trim();

        // If it's a URL, try to extract the code from the path or query
        try {
            if (bookingCode.startsWith('http')) {
                const url = new URL(bookingCode);
                const pathParts = url.pathname.split('/').filter(Boolean);
                bookingCode = pathParts[pathParts.length - 1] || bookingCode;
            }
        } catch {
            // Not a URL, use as-is
        }

        // Strip non-numeric characters for booking codes
        const numericCode = bookingCode.replace(/\D/g, '');
        if (numericCode.length >= 6) {
            bookingCode = numericCode.slice(0, 6);
        }

        try {
            const result = await checkInMutation.mutateAsync({
                bookingCode,
                sessionId,
                vendorId: merchantId,
            });

            playBeep(result.success);

            setLastResult({
                code: bookingCode,
                success: result.success,
                message: result.message,
            });
        } catch (err: any) {
            playBeep(false);

            setLastResult({
                code: bookingCode,
                success: false,
                message: err?.message || "Check-in failed",
            });
        }

        // Allow next scan after a delay
        setTimeout(() => {
            processingRef.current = false;
            setLastResult(null);
        }, 3000);
    }, [checkInMutation, merchantId, sessionId]);

    const startScanning = useCallback(async () => {
        setError(null);
        try {
            // Dynamic import — html5-qrcode is only needed when scanning
            const { Html5Qrcode } = await import('html5-qrcode');

            if (!containerRef.current) return;

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                handleScanSuccess,
                () => {} // ignore scan failures (no QR in frame)
            );

            setIsScanning(true);
        } catch (err: any) {
            if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
                setError("Camera access denied. Please allow camera access in your browser settings.");
            } else if (err?.message?.includes('html5-qrcode')) {
                setError("QR scanner library not available. Please install html5-qrcode: yarn add html5-qrcode");
            } else {
                setError(err?.message || "Could not start camera");
            }
        }
    }, [handleScanSuccess]);

    const stopScanning = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch {
                // Already stopped
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel dark>
                <PanelHeader>
                    <PanelTitle as="h2">QR Code Scanner</PanelTitle>
                    <PanelDescription>
                        Point the camera at a booking QR code to check in guests instantly
                    </PanelDescription>
                </PanelHeader>

                {/* Scanner viewport */}
                <div ref={containerRef} className="relative mt-4">
                    <div
                        id="qr-reader"
                        className={`w-full max-w-sm mx-auto rounded-lg overflow-hidden ${!isScanning ? 'bg-muted min-h-[250px]' : ''}`}
                        data-testid="qr-reader"
                    >
                        {!isScanning && (
                            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                                <Camera className="w-12 h-12 mb-3 opacity-40" />
                                <p className="text-base">Camera preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center mt-4">
                    {!isScanning ? (
                        <Button
                            onClick={startScanning}
                            size="lg"
                            className="gap-2 h-12 text-base"
                            data-testid="start-scanner-btn"
                        >
                            <Camera className="w-5 h-5" />
                            Start Scanning
                        </Button>
                    ) : (
                        <Button
                            onClick={stopScanning}
                            variant="outline"
                            size="lg"
                            className="gap-2 h-12 text-base"
                            data-testid="stop-scanner-btn"
                        >
                            <CameraOff className="w-5 h-5" />
                            Stop Scanning
                        </Button>
                    )}
                </div>

                {/* Scan result feedback */}
                {lastResult && (
                    <Alert
                        className={`mt-4 ${lastResult.success ? 'border-green-500 bg-green-100' : 'border-red-500'}`}
                        variant={lastResult.success ? "default" : "destructive"}
                        data-testid="scan-result"
                    >
                        {lastResult.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <XCircle className="h-5 w-5" />
                        )}
                        <AlertTitle className="text-base">{lastResult.success ? "Checked In" : "Error"}</AlertTitle>
                        <AlertDescription className="text-sm">
                            {lastResult.message}
                            <span className="font-mono text-xs ml-2">#{lastResult.code}</span>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Checking in spinner */}
                {checkInMutation.isPending && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-base">Checking in...</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <Alert variant="destructive" className="mt-4" data-testid="scanner-error">
                        <XCircle className="h-5 w-5" />
                        <AlertTitle className="text-base">Scanner Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </Panel>
        </div>
    );
};

export default QRScanner;

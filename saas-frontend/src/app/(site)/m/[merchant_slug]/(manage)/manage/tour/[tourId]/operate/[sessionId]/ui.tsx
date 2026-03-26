'use client'

import React, { useEffect } from "react"
import { useParams } from "next/navigation";

import { Panel, PanelHeader } from "@/components/ux/Panel";
import BookingInfoHeader from "./components/BookingInfoHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SessionOnBooking from "./components/SessionOnBooking";
import CheckInComponent from "./components/CheckIn";
import QRScanner from "./components/QRScanner";
import SessionNotes from "./components/SessionNotes";
import ManifestPrintView from "./components/ManifestPrintView";
import PostSessionSummary from "./components/PostSessionSummary";
import OfflineBanner from "./components/OfflineBanner";

/** Keep the iPad screen awake while on this page */
const useWakeLock = () => {
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch {
                // Wake Lock not supported or failed — not critical
            }
        };

        requestLock();

        // Re-acquire on visibility change (iPad returning from background)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') requestLock();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            wakeLock?.release().catch(() => {});
        };
    }, []);
};

const UI : React.FC = () => {
    const params = useParams<{ merchant_slug: string, tourId: string, sessionId: string }>();

    // Extract merchant ID from slug (e.g., "my-shop-abc123" -> "abc123")
    const merchantId = params?.merchant_slug?.split("-").pop() || "";
    const sessionId = params?.sessionId || "";
    const tourId = params?.tourId || "";

    const sessionRef = {
        id: sessionId,
        partition: [merchantId, tourId],
        container: "Tour-Session"
    };

    // Keep screen awake during session operations
    useWakeLock();

    return (
        <>
            <OfflineBanner />
            <Panel dark className="flex flex-row md:flex-col">
                <PanelHeader className="text-sm md:text-base">Operate Mode</PanelHeader>
                <BookingInfoHeader />
            </Panel>
            <Tabs defaultValue="participants" className="my-2 w-full flex-grow">
                <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 text-sm md:text-base h-12">
                    <TabsTrigger value="participants" className="py-2.5">Bookings</TabsTrigger>
                    <TabsTrigger value="checkin" className="py-2.5">Check-In</TabsTrigger>
                    <TabsTrigger value="qr" className="py-2.5">QR Scan</TabsTrigger>
                    <TabsTrigger value="manifest" className="py-2.5">Guest List</TabsTrigger>
                    <TabsTrigger value="notes" className="py-2.5">Notes</TabsTrigger>
                    <TabsTrigger value="summary" className="py-2.5">Summary</TabsTrigger>
                </TabsList>
                <TabsContent className="px-2 h-full" value="participants">
                    <SessionOnBooking />
                </TabsContent>
                <TabsContent className="px-2" value="checkin">
                    <CheckInComponent
                        merchantId={merchantId}
                        sessionId={sessionId}
                        sessionRef={sessionRef}
                    />
                </TabsContent>
                <TabsContent className="px-2" value="qr">
                    <QRScanner
                        merchantId={merchantId}
                        sessionId={sessionId}
                        sessionRef={sessionRef}
                    />
                </TabsContent>
                <TabsContent className="px-2" value="manifest">
                    <ManifestPrintView
                        sessionRef={sessionRef}
                        merchantId={merchantId}
                        tourId={tourId}
                        sessionId={sessionId}
                    />
                </TabsContent>
                <TabsContent className="px-2" value="notes">
                    <SessionNotes sessionId={sessionId} tourId={tourId} />
                </TabsContent>
                <TabsContent className="px-2" value="summary">
                    <PostSessionSummary sessionRef={sessionRef} />
                </TabsContent>
            </Tabs>
        </>
    )
}

export default UI;

'use client'

import React from "react"
import { useParams } from "next/navigation";

import { Panel, PanelHeader } from "@/components/ux/Panel";
import BookingInfoHeader from "./components/BookingInfoHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SessionOnBooking from "./components/SessionOnBooking";
import CheckInComponent from "./components/CheckIn";

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

    return (
        <>
            <Panel className="flex flex-row md:flex-col">
                <PanelHeader className="text-xs md:text-base">Operate Mode</PanelHeader>
                <BookingInfoHeader />
            </Panel>
            <Tabs defaultValue="participants" className="my-2 w-full flex-grow">
                <TabsList className="w-full grid grid-cols-3 text-xs md:text-base">
                    <TabsTrigger value="participants">Bookings</TabsTrigger>
                    <TabsTrigger value="checkin">Check-In</TabsTrigger>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
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
                <TabsContent className="px-2" value="announcements">
                    {/* <AnnouncementsComponent /> */}
                </TabsContent>
            </Tabs>
        </>
    )
}

export default UI;
'use client'

import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/components/ux/Panel";
import TourBookings from "./components/TourBookings";
import ScheduledServiceBookings from "./components/ScheduledServiceBookings";
import { Calendar, Compass } from "lucide-react";

type Props = {
    userId?: string
}

const UI: React.FC<Props> = (props) => {
    return (
        <Panel className="h-full">
            <h1 className="font-bold text-xl mb-4">My Bookings</h1>

            <Tabs defaultValue="services" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="services" className="flex items-center gap-2" data-testid="services-tab">
                        <Calendar className="w-4 h-4" />
                        Scheduled Services
                    </TabsTrigger>
                    <TabsTrigger value="tours" className="flex items-center gap-2" data-testid="tours-tab">
                        <Compass className="w-4 h-4" />
                        Tours & Events
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                    <ScheduledServiceBookings customerId={props.userId} />
                </TabsContent>

                <TabsContent value="tours">
                    <TourBookings userId={props.userId} />
                </TabsContent>
            </Tabs>
        </Panel>
    )
}

export default UI;
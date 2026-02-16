'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TourBookings from './components/TourBookings';
import ScheduledServiceBookings from './components/ScheduledServiceBookings';
import { Calendar, Compass, CalendarDays } from 'lucide-react';

type Props = {
    userId: string;
};

const UI: React.FC<Props> = ({ userId }) => {
    return (
        <div className="min-h-screen-minus-nav flex flex-col p-4 md:p-6" data-testid="bookings-page">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                    <CalendarDays className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-xl font-light text-white">My Bookings</h1>
                    <p className="text-slate-400 text-sm">Scheduled services, tours and events</p>
                </div>
            </div>

            {/* Content */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex-grow">
                <Tabs defaultValue="services" className="w-full">
                    <TabsList className="mb-4 bg-white/5 border border-white/10">
                        <TabsTrigger
                            value="services"
                            data-testid="bookings-services-tab"
                            className="flex items-center gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Scheduled Services
                        </TabsTrigger>
                        <TabsTrigger
                            value="tours"
                            data-testid="bookings-tours-tab"
                            className="flex items-center gap-1.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                        >
                            <Compass className="w-3.5 h-3.5" />
                            Tours & Events
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="services">
                        <ScheduledServiceBookings customerId={userId} />
                    </TabsContent>

                    <TabsContent value="tours">
                        <TourBookings userId={userId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default UI;

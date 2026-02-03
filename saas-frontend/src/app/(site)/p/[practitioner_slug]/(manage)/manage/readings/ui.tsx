'use client'

import React from "react";
import { Session } from "next-auth";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
// Import the SpiriReadings UI from the merchant manage area
import SpiriReadingsUI from "../../../../../m/[merchant_slug]/(manage)/manage/spiri-readings/ui";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

export default function PractitionerReadingsUI({ session, practitionerId, slug }: Props) {
    return (
        <div className="flex min-h-full">
            {/* Sidebar */}
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            {/* Main Content - Reuse the SpiriReadings UI */}
            <div className="flex-1 md:ml-[200px]">
                <SpiriReadingsUI merchantId={practitionerId} />
            </div>
        </div>
    );
}

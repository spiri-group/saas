'use client'

import React from "react";
import { Session } from "next-auth";
// Import the SpiriReadings UI from the merchant manage area
import SpiriReadingsUI from "../../../../../m/[merchant_slug]/(manage)/manage/spiri-readings/ui";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

export default function PractitionerReadingsUI({ session, practitionerId, slug }: Props) {
    return (
        <SpiriReadingsUI merchantId={practitionerId} />
    );
}

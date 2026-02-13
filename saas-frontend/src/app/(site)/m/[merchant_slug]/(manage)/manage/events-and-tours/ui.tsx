'use client'

import React from "react"
import CreateScheduleComponent from "./components/Schedule";
import SessionsComponent from "./components/Sessions";
import WithPaymentsEnabled from "../../../../_components/Banking/_components/WithPaymentsEnabled";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import { ArrowUpCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
}

const TourUpgradeBanner: React.FC<{ merchantId: string }> = ({ merchantId }) => {
    const { features } = useTierFeatures(merchantId);
    const router = useRouter();
    const pathname = usePathname();

    if (features.canCreateTours) return null;

    const handleUpgrade = () => {
        const match = pathname.match(/^\/m\/([^/]+)/);
        if (match) {
            router.push(`/m/${match[1]}/manage/subscription`);
        }
    };

    return (
        <div
            data-testid="tour-upgrade-banner"
            className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-3 mb-4"
        >
            <div className="flex items-center gap-3">
                <ArrowUpCircle className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                    Guided tours are a <span className="font-medium text-purple-400">Transcend</span> feature.
                </p>
            </div>
            <button
                type="button"
                data-testid="tour-upgrade-banner-btn"
                onClick={handleUpgrade}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 whitespace-nowrap"
            >
                Upgrade &rarr;
            </button>
        </div>
    );
};

const UI : React.FC<Props> = (props) => {
    return (
       <>
            <div className="flex w-full h-full flex-col flex-col-reverse space-y-2 md:flex flex-row space-x-2">
                <div className="flex-grow">
                    <TourUpgradeBanner merchantId={props.merchantId} />
                    <CreateScheduleComponent vendorId={props.merchantId} />
                </div>
                <SessionsComponent />
            </div>
       </>
    )
}

export default WithPaymentsEnabled(UI);

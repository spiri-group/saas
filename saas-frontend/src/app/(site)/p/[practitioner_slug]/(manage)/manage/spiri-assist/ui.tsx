'use client'

import React, { useState } from "react"
import { recordref_type } from "@/utils/spiriverse";
import CaseDetails from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/CaseDetails";
import AssignedCases from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/AssignedCases";
import AvailableCases from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/AvailableCases";
import CaseApplications from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/CaseApplications";
import { Panel, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import { useRouter } from "next/navigation";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";
import { Search, Shield, MessageSquare, ArrowRight } from "lucide-react";

type Props = {
    merchantId: string
    practitionerSlug: string
}

const useBL = (props: Props) => {
    const [selectedCaseRef, setSelectedCaseRef] = useState<recordref_type | null>(null)
    const [triggerClicked, setTriggerClicked] = useState<boolean>(false);

    const handleTriggerClick = () => {
        setTriggerClicked(prevState => !prevState);
    };

    return {
        merchantId: props.merchantId,
        triggerClicked: {
            get: triggerClicked,
            set: handleTriggerClick
        },
        selectedCaseRef: {
            get: selectedCaseRef,
            set: setSelectedCaseRef
        }
    }
}

const SpiriAssistLockedPreview: React.FC<{ practitionerSlug: string }> = ({ practitionerSlug }) => {
    const router = useRouter();

    const handleUpgrade = () => {
        router.push(`/p/${practitionerSlug}/manage/subscription`);
    };

    const benefits = [
        {
            icon: <Search className="h-5 w-5" />,
            title: "Browse paranormal cases",
            description: "Access a marketplace of investigation requests from clients seeking help with unexplained activity."
        },
        {
            icon: <MessageSquare className="h-5 w-5" />,
            title: "Submit proposals",
            description: "Apply to cases that match your expertise. Set your own pricing and describe your approach."
        },
        {
            icon: <Shield className="h-5 w-5" />,
            title: "Manage investigations",
            description: "Track assigned cases, communicate with clients, and deliver findings — all in one place."
        }
    ];

    return (
        <div className="flex items-center justify-center h-screen-minus-nav p-6" data-testid="spiri-assist-locked-preview">
            <div className="max-w-lg w-full text-center">
                <div className="mb-6 flex justify-center">
                    <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-5 border border-cyan-500/10">
                        <SpiriAssistLogo height={48} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">SpiriAssist</h1>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Connect with clients seeking paranormal investigations. Offer your expertise, manage cases, and grow your practice.
                </p>

                <div className="space-y-4 mb-8 text-left">
                    {benefits.map((benefit, i) => (
                        <div key={i} className="flex gap-4 items-start rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
                            <div className="mt-0.5 text-cyan-400 flex-shrink-0">
                                {benefit.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white">{benefit.title}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{benefit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleUpgrade}
                    data-testid="spiri-assist-upgrade-btn"
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                >
                    Upgrade to Illuminate
                    <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-slate-500 mt-3">Available on the Illuminate plan and above</p>
            </div>
        </div>
    );
};

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const { features } = useTierFeatures(props.merchantId);

    if (bl.merchantId == null) return null;

    if (!features.hasSpiriAssist) {
        return <SpiriAssistLockedPreview practitionerSlug={props.practitionerSlug} />;
    }

    return (
        <div className="flex flex-row h-screen-minus-nav space-x-2 mr-2">
            <AvailableCases
                className={"w-[300px] my-2"}
                merchantId={bl.merchantId}
                onSelect={bl.selectedCaseRef.set}
                onTriggerClicked={bl.triggerClicked.set}
            />
            {
                bl.selectedCaseRef.get != null ?
                    <CaseDetails
                        className="flex-grow my-2"
                        caseId={bl.selectedCaseRef.get.id}
                        merchantId={bl.merchantId} /> :
                    <Panel className="flex-grow my-2" >
                        <PanelHeader>
                            <PanelTitle> Details </PanelTitle>
                        </PanelHeader>
                        <span className="text-sm"> Please select a case first. </span>
                    </Panel>
            }
            <div className="w-[300px] flex flex-col space-y-2 my-2">
                <CaseApplications
                    className={"flex-grow"}
                    merchantId={bl.merchantId}
                />
                <AssignedCases
                    className={"flex-grow"}
                    onSelect={bl.selectedCaseRef.set}
                />
            </div>
        </div>
    )
}

export default UI;

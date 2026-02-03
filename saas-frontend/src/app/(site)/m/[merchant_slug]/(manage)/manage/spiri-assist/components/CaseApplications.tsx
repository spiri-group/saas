'use client'

import React, { useEffect, useState } from "react"
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { cn } from "@/lib/utils";
import UseCaseApplications from "../hooks/UseCaseApplications";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ViewCaseOffer from "./Offer/components/View";
import { caseOffer_type } from "@/utils/spiriverse";
import { useQueryClient } from "@tanstack/react-query";
import useRealTimeArrayState from "@/components/utils/useRealTimeArray";
import { omit } from "@/lib/functions";

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
    className?: string
}

const useBL = (props: BLProps) => {
    const queryClient = useQueryClient();

    const caseApplications_query = UseCaseApplications(props.merchantId)
    const caseApplications = useRealTimeArrayState<caseOffer_type>({
        idFields: ["id", "merchantId"],
        initialData: undefined as any,
        typeName: "caseApplications"
    })
    const [selectedApplication, setSelectedApplication] = useState<caseOffer_type | null>();

    useEffect(() => {
        if (caseApplications_query.data != undefined && caseApplications_query.data.length > 0) {
            const newlyCreatedApplication = caseApplications_query.data.find(x => (x as any).showDialog)
            if (newlyCreatedApplication) {
                setSelectedApplication(newlyCreatedApplication);
                queryClient.setQueryData(["case-applications", props.merchantId, undefined], (old: caseOffer_type[]) => {
                    return (old as any[]).map(record => omit(record, ['showDialog']))
                })
            } else if (caseApplications_query.data != null && caseApplications.get == undefined) {
                caseApplications.set(caseApplications_query.data)
            }
        } 
    }, [caseApplications_query.data])

    return {
        caseApplications,
        selectedApplication, setSelectedApplication
    }
}

const CaseApplications : React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (  
        <> 
            <Panel className={cn("flex flex-col", props.className)}>
                <PanelHeader>
                    <PanelTitle>My Offers</PanelTitle>
                </PanelHeader>
                <PanelContent>
                    <span className="text-sm">Below are your offers for the open help requests.</span>
                    { <ul className="space-y-2 mt-2">
                        {bl.caseApplications.get != undefined && bl.caseApplications.get.map((caseApplication) => {
                                return (
                                    <li key={caseApplication.id}>
                                        <Panel className="flex flex-col">
                                            <div className="flex flex-row items-center justify-between">
                                                <div className="grid grid-rows-2 gap-2">
                                                    <span>Offer {caseApplication.code} </span>
                                                    <span className="text-sm text-slate-400">Case {caseApplication.case.code}</span>
                                                </div>
                                                <Button type="button" variant="default"
                                                    onClick={() => bl.setSelectedApplication(caseApplication)}>View Offer</Button>
                                            </div>
                                        </Panel>
                                    </li> 
                                )
                            })
                        }
                    </ul> }
                </PanelContent>
            </Panel>
            <Dialog open={bl.selectedApplication != null}>
                <DialogContent className="min-h-[490px] min-w-[650px]">
                    {bl.selectedApplication != null && 
                        <>
                            <ViewCaseOffer
                                caseOffer={bl.selectedApplication} 
                                page={"case"} 
                                type={"APPLICATION"} />
                            <Button type="button" variant={"default"} onClick={() => bl.setSelectedApplication(null)}>Close</Button>
                        </>
                    }
                </DialogContent>
            </Dialog>
        </>
    )
}

export default CaseApplications;
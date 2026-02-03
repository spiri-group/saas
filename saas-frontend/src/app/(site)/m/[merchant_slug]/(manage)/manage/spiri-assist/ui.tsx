'use client'

import React, { useState } from "react"
import { recordref_type } from "@/utils/spiriverse";
import CaseDetails from "./components/CaseDetails";
import AssignedCases from "./components/AssignedCases";
import AvailableCases from "./components/AvailableCases";
import CaseApplications from "./components/CaseApplications";
import { Panel, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import withPaymentsEnabled from "../../../../_components/Banking/_components/WithPaymentsEnabled";

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
}

const useBL = (props: BLProps) => {
    
    const [selectedCaseRef, setSelectedCaseRef] = useState<recordref_type | null>(null)
    const [triggerClicked, setTriggerClicked] = useState<boolean>(false);

    // Step 2: Handler to update the state
    const handleTriggerClick = () => {
        setTriggerClicked(prevState => !prevState); // Toggle for simplicity
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

const UI : React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (bl.merchantId == null) return null;

    return (
        <>
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
        </>
    )
}

export default withPaymentsEnabled(UI);
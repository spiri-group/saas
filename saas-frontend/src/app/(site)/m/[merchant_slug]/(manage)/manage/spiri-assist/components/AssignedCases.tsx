'use client'

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import UseAssignedCases, { required_attributes } from "../hooks/UseAssignedCases";
import { case_type, recordref_type } from "@/utils/spiriverse";
import { cn } from "@/lib/utils";
import CaseStatusBadge from "@/components/ux/CaseStatusBadge";
import useRealTimeArrayState from "@/components/utils/useRealTimeArray";
import { gql } from "@/lib/services/gql";

type Props = {
    className?: string,
    onSelect: (selected: recordref_type) => void
}

const useBL = () => {
    
    const assignedCases_query = UseAssignedCases()
    const assignedCases = useRealTimeArrayState<case_type>({
        idFields: ["id"],
        initialData: undefined as any,
        typeName: "assignedCases",
        getRecord: (async (ids) => {
            const resp = await gql<{
                case: case_type
            }>( `query get_case($caseId: String) {
                    case(caseId: $caseId) {
                        ${required_attributes}
                    }
                }
                `,
                {
                    caseId: ids[0]
                }
            )
            return resp.case;
        })
    })

    useEffect(() => {
        if (assignedCases_query.data != null && assignedCases.get == undefined) {
            assignedCases.set(assignedCases_query.data)
        }
    }, [assignedCases_query])

    return {
        assignedCases
    }
}

const AssignedCases : React.FC<Props> = (props) => {
    const bl = useBL();
    const [selectedCase, setSelectedCase] = useState<recordref_type | null>(null)
    const [caseStatus, setCaseStatus] = useState(true);

  return (
        <Panel className={cn("flex flex-col", props.className)}>
            <PanelHeader>
                <PanelTitle>My Cases</PanelTitle>
            </PanelHeader>
            <PanelContent>
            <span className="text-sm">Below are the cases you&apos;ve taken from help requests.</span>
            <div className="grid grid-cols-2 items-center justify-center">
                <Button variant="link" type="button" onClick={() => setCaseStatus(true)} className={caseStatus ? 'underline' : ''}> Active </Button>
                <Button variant="link" type="button" onClick={() => setCaseStatus(false)} className={!caseStatus ? 'underline' : ''}> Historical </Button>
            </div>
            <ul className="space-y-2 mt-2">
                {(caseStatus
                ? bl.assignedCases.get?.filter(c => c.caseStatus === 'ACTIVE') 
                : bl.assignedCases.get?.filter(c => c.caseStatus === 'CLOSED')
                )?.map(assignedCase => (
                    <li key={assignedCase.id}>
                        <Panel className="flex flex-col">
                        <div className="flex flex-row items-center justify-between">
                            <span> Case {assignedCase.code} </span>
                            <CaseStatusBadge status={assignedCase.caseStatus}>{assignedCase.caseStatus}</CaseStatusBadge>
                        </div>
                        <Button 
                            type="button"
                            aria-label="button-see-casedetails"
                            variant={selectedCase === assignedCase.ref ? "outline" : "default"}
                            onClick={() => {
                            setSelectedCase(assignedCase.ref);
                            props.onSelect(assignedCase.ref);
                            }}
                            disabled={selectedCase === assignedCase.ref}>
                            {selectedCase === assignedCase.ref ? "Selected" : "See Details"}
                        </Button>
                        </Panel>
                    </li> 
                ))}
            </ul>
            </PanelContent>
        </Panel>
  )
}


export default AssignedCases;
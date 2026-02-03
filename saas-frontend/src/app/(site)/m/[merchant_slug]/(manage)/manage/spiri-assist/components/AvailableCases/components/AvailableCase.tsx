'use client'

import { Panel } from "@/components/ux/Panel"
import React from "react"
import { case_type, recordref_type } from "@/utils/spiriverse"
import { HomeIcon, UsersIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import UpsertCaseOffer from "../../Offer/components/Upsert"

type Props = {
    merchantId: string
    case: case_type
    onSelect: (selected: recordref_type) => void
}

function getFirst30Chars(htmlString: string) {
    const div = document.createElement('div');
    div.innerHTML = htmlString;
    if (div.textContent == null) div.textContent = "";
    return div.textContent.length > 30 ? `${div.textContent?.substring(0, 30)} ...` : div.textContent;
}

const AvailableCase : React.FC<Props> = (props) => {

    return (   
        <>
            <Panel className="flex flex-col">
                <div className="flex flex-col space-y-2 p-2" > 
                    <div className="flex flex-row w-full items-center">
                    <span className="text-sm">({props.case.locatedFromMe.value}{props.case.locatedFromMe.units})</span>
                        <ul className="ml-auto grid grid-cols-3 grid-rows-1 gap-2 pl-3">
                            <li className="grid grid-cols-2 gap-2">
                                <span className=""><UsersIcon height={16} /></span>
                                <span className="text-xs"> {props.case.affectedPeople.length} </span>
                            </li>
                            <li className="grid grid-cols-2 gap-2">
                                <span className=""><HomeIcon height={16} /></span>
                                <span className="text-xs"> {props.case.affectedAreas.length} </span>
                            </li>
                        </ul>
                    </div>
                    <p className="text-xs" dangerouslySetInnerHTML={{ __html: getFirst30Chars(props.case.description) }} /> 
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="link" onClick={() => {props.onSelect(props.case.ref)}}> See Details </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button 
                                type="button" 
                                variant="default" 
                                aria-label={`button-apply-to-case-${props.case.trackingCode}`}> 
                                Apply 
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <UpsertCaseOffer 
                                type={"APPLICATION"} 
                                merchantId={props.merchantId} 
                                caseId={props.case.ref.id}
                                caseBalance={props.case.balance}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </Panel>
         </>
    )
}

export default AvailableCase;
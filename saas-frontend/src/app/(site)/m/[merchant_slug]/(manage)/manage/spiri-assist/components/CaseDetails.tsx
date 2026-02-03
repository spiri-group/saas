'use client'

import React, { useEffect, useState } from "react"
import UseCaseDetails from "../hooks/UseCaseDetails";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { cn } from "@/lib/utils";
import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import Interactions from "./Interactions";
import ViewCaseOffer from "./Offer/components/View";
import { useQueryClient } from "@tanstack/react-query";
import { case_type } from "@/utils/spiriverse";
import UpsertCaseOffer from "./Offer/components/Upsert";
import CloseCaseButton from "./CloseCase";
import { isNullOrUndefined } from "@/lib/functions";

type BLProps = {
    caseId: string
}

type Props = BLProps & {
    style?: React.CSSProperties,
    className?: string,
    merchantId: string
}

const useBL = (props: BLProps) => {
    const queryClient = useQueryClient();

    const caseDetails = UseCaseDetails(props.caseId)
    const [showOffer, setShowOffer] = useState<boolean>(false)

    useEffect(() => {
        if (caseDetails.data != null) {
            if (caseDetails.data.releaseOffer != null) {
                if ((caseDetails.data.releaseOffer as any).showDialog) {
                    setShowOffer(true);
                    queryClient.setQueryData(["details-for-case", props.caseId], (old: case_type) => {
                        delete (old.releaseOffer as any).showDialog;
                    })
                }
            } else if (caseDetails.data.closeOffer != null) {
                if ((caseDetails.data.closeOffer as any).showDialog) {
                    setShowOffer(true);
                    queryClient.setQueryData(["details-for-case", props.caseId], (old: case_type) => {
                        delete (old.closeOffer as any).showDialog;
                    })
                }
            }
        }
    }, [caseDetails.data?.releaseOffer, caseDetails.data?.closeOffer])

    return {
        caseDetails: {
            get: caseDetails.data 
        },
        showOffer, setShowOffer
    }
}

const CaseDetails : React.FC<Props> = (props) => {
    
    const bl = useBL(props as BLProps)

    return (  
        <>
            <Panel style={props.style} className={cn("flex flex-col", props.className)}>
                <PanelHeader className="flex flex-row">
                    <PanelTitle> Details </PanelTitle>
                </PanelHeader>
                <PanelContent className="flex flex-col flex-grow min-h-0">
                    {bl.caseDetails.get ? (
                        <>
                            <div className="flex flex-row items-center">
                                <div className="flex flex-col ml-2 font-bold">
                                    <span> {bl.caseDetails.get.code} </span>
                                    <span> Status: {bl.caseDetails.get.caseStatus} </span>
                                </div>
                                <div className="ml-auto flex flex-row space-x-2">
                                    {bl.caseDetails.get.caseStatus == "ACTIVE" &&
                                        bl.caseDetails.get.releaseOffer == null &&
                                        bl.caseDetails.get.closeOffer == null && (
                                            <>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button 
                                                            className="flex-none w-32" 
                                                            type="button" 
                                                            variant="destructive">
                                                        Release case
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <UpsertCaseOffer 
                                                            merchantId={props.merchantId}
                                                            caseId={bl.caseDetails.get.id} 
                                                            caseBalance={bl.caseDetails.get.balance}
                                                            type={"RELEASE"}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                {bl.caseDetails.get.release_status != "PENDING"
                                                    && <CloseCaseButton 
                                                        disabled={!isNullOrUndefined(bl.caseDetails.get.balance) && bl.caseDetails.get.balance.amount > 0}
                                                        caseRef={bl.caseDetails.get.ref} />
                                                }
                                                
                                            </>
                                        )
                                    }
                                    {bl.caseDetails.get.caseStatus == "ACTIVE" &&
                                        (bl.caseDetails.get.releaseOffer != null || bl.caseDetails.get.closeOffer != null) && (
                                            <>
                                                <Dialog open={bl.showOffer}>
                                                    <DialogTrigger>
                                                        <Button 
                                                            onClick={() => bl.setShowOffer(true)}
                                                            className="flex-none w-32" type="button"> 
                                                            View Offer 
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <ViewCaseOffer 
                                                            caseOffer={bl.caseDetails.get.releaseOffer ?? bl.caseDetails.get.closeOffer} 
                                                            page={"case"} 
                                                            type={(bl.caseDetails.get.releaseOffer != null ? 
                                                                    bl.caseDetails.get.releaseOffer.type.toUpperCase() : 
                                                                    bl.caseDetails.get.closeOffer.type.toUpperCase()) as "APPLICATION" | "RELEASE" | "CLOSE" } />
                                                        <DialogFooter>
                                                            <Button 
                                                                variant="destructive" 
                                                                onClick={() => bl.setShowOffer(false)} 
                                                                className="w-full"
                                                                aria-label="button-close-offer">
                                                                Close
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-row space-x-2 ml-2">
                                {(props.merchantId == null && bl.caseDetails.get.caseStatus == "NEW") || bl.caseDetails.get.caseStatus == "ACTIVE" ? (
                                    <>
                                    <div className="flex flex-col">
                                        <span className="font-bold"> Contact </span>
                                        <div className="flex flex-col">
                                            <span> {bl.caseDetails.get?.contact.name} </span>
                                            <Link href={`mailto:${bl.caseDetails.get.contact.email}`} className="flex flex-row items-center space-x-3 hover:underline hover:text-primary"> 
                                                <Mail size={14} /> 
                                                <span className="text-foreground"> {bl.caseDetails.get.contact.email} </span> 
                                            </Link>
                                            <Link href={`tel:${bl.caseDetails.get.contact.phoneNumber.value}`} className="flex flex-row items-center space-x-3 hover:underline hover:text-primary"> 
                                                <Phone size={14}/> 
                                                <span className="text-foreground"> {bl.caseDetails.get.contact.phoneNumber.displayAs} </span> 
                                            </Link>
                                        </div>
                                    </div>
                                    <Separator orientation="vertical" />
                                    </>
                                ) : <></>}
                                <div className="flex flex-col">
                                    <span className="font-bold"> Started from </span>
                                    <span> {bl.caseDetails.get.startedFrom.descriptor} </span> 
                                </div>
                                {(props.merchantId == null && bl.caseDetails.get.caseStatus == "NEW") || bl.caseDetails.get.caseStatus == "ACTIVE" ?
                                    <>
                                    <Separator orientation="vertical" />
                                    <div className="flex flex-col">
                                        <span className="font-bold"> Location </span>
                                        <span> {bl.caseDetails.get.location.formattedAddress} </span>
                                    </div>
                                    </> : <></>
                                }
                            </div>
                            {    
                                <div className="flex flex-col mt-2 flex-grow min-h-0">
                                    <Interactions 
                                        merchantId={props.merchantId}
                                        caseRef={bl.caseDetails.get.ref}
                                        caseId={props.caseId}
                                        caseDetails={bl.caseDetails.get} 
                                    />
                                </div>
                            }
                        </>
                    ) : (
                        <></>
                    )}
                    
                </PanelContent>
            </Panel>
            {bl.caseDetails.get?.releaseOffer?.clientRequested && (
                <Dialog open={true}>
                    <DialogContent className="flex flex-col flex-grow">
                        {!bl.caseDetails.get?.releaseOffer?.merchantResponded ? (
                            <UpsertCaseOffer 
                                merchantId={props.merchantId}
                                caseId={bl.caseDetails.get.id} 
                                type={"RELEASE"}
                                offer={bl.caseDetails.get.releaseOffer}
                                caseBalance={bl.caseDetails.get.balance}
                            />
                        ) : (
                            <ViewCaseOffer 
                                caseOffer={bl.caseDetails.get.releaseOffer} 
                                page={"case"} 
                                type={"RELEASE"} 
                            />
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </> 
    )
}

export default CaseDetails;
'use client';

import React, { useState } from "react";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { case_type, CommunicationModeType } from "@/utils/spiriverse";
import { Mail, Phone } from "lucide-react";
import { DateTime } from "luxon";
import { UpdateHelpRequestButton } from "../../../components/HelpRequest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ChatControl from "@/components/ux/ChatControl";
import FeeSummary from "./FeeSummary";
import Link from "next/link";
import UseRequestReleaseCase from "../hooks/UseRequestReleaseCase";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UseCaseDetails from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/hooks/UseCaseDetails";
import UseCaseInteractions from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/Interactions/hooks/UseCaseInteractions";
import UseCaseApplications from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/hooks/UseCaseApplications";
import ViewCaseOffer from "@/app/(site)/m/[merchant_slug]/(manage)/manage/spiri-assist/components/Offer/components/View";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";

type BLProps = {
    caseId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const caseDetails = UseCaseDetails(props.caseId)
    const caseInteractions = UseCaseInteractions(props.caseId, ["ACTIVITY"])
    const caseApplications = UseCaseApplications(undefined, props.caseId)
    const reqReleaseCase = UseRequestReleaseCase(props.caseId)

    return {
        caseDetails: {
            isLoading: caseDetails.isLoading,
            get: caseDetails.data 
        },
        caseInteractions: {
            isLoading: caseInteractions.isLoading,
            get: caseInteractions.data ?? []
        },
        caseApplications: {
            get: caseApplications.data ?? [],
            isLoading: caseApplications.isLoading
        },
        reqReleaseCase
    }
}

const ViewCase: React.FC<Props> = (props) => {
    const bl = useBL(props);
    const [dialogOpen, setDialogOpen] = useState(false)

    return (
        <>
            <div>
                {bl.caseDetails.get?.caseStatus === 'ACTIVE' && (
                    <>
                        {bl.caseDetails.get?.release_status === 'PENDING' && (
                            <>
                                <Button 
                                    aria-label="button-request-new-investigator"
                                    className="w-full" 
                                    type="button"
                                    onClick={async () => {
                                        const caseSelected = bl.caseDetails.get as case_type
                                        await bl.reqReleaseCase.mutation.mutateAsync(caseSelected.ref)
                                        setDialogOpen(true)
                                    }}> 
                                    Request new investigator
                                </Button>
                                {dialogOpen && (
                                    <Dialog open={true} onOpenChange={setDialogOpen}>
                                        <DialogContent className="flex flex-col flex-grow">
                                            <ViewCaseOffer 
                                                caseOffer={bl.caseDetails.get.releaseOffer}
                                                page={"trackCase"}
                                                type={"RELEASE"}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </>
                        )}
                        {bl.caseDetails.get?.releaseOffer != null && (
                            <Dialog open={true}>
                                <DialogContent className="flex flex-col flex-grow">
                                    <ViewCaseOffer
                                        caseOffer={bl.caseDetails.get.releaseOffer}
                                        page={"trackCase"}
                                        type={"RELEASE"}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                        {bl.caseDetails.get?.closeOffer != null && (
                            <Dialog open={true}>
                                <DialogContent className="flex flex-col flex-grow">
                                    <DialogTitle>Investigator has requested to close</DialogTitle>
                                    <ViewCaseOffer 
                                        caseOffer={bl.caseDetails.get.closeOffer}
                                        page={"trackCase"}
                                        type={"CLOSE"} 
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                    </>
                )}
            </div>
            {bl.caseDetails.isLoading ? (
                    <span className="text-xs m-2">Loading...</span>
                ) : ( 
                bl.caseDetails.get != null || bl.caseDetails.get != undefined ? (
                    <div className="flex flex-col space-y-2 md:flex-row space-x-2 flex-grow mb-3 mr-2">
                        {bl.caseDetails.get?.caseStatus === 'NEW' && (
                            <div className="block flex flex-row space-x-2 md:hidden">
                                <Link href="#viewDetails">
                                    <Button className="text-xs md:text-base"> Details </Button>
                                </Link>
                                <Link href="#viewOffers">
                                    <Button className="text-xs md:text-base"> Offers </Button>
                                </Link>
                            </div>
                        )}
                        {bl.caseDetails.get.caseStatus === "ACTIVE" && (
                            <div className="block flex flex-row space-x-2 md:hidden">
                                <Link href="#viewDetails">
                                    <Button className="text-xs md:text-base"> Details </Button>
                                </Link>
                                <Link href="#viewFeeSummary">
                                    <Button className="text-xs md:text-base"> Fee summary </Button>
                                </Link>
                                <Link href="#viewActivities">
                                    <Button className="text-xs md:text-base"> Activities </Button>
                                </Link>
                                <Drawer>
                                    <DrawerTrigger> <Button className="text-xs md:text-base"> Chat </Button> </DrawerTrigger>
                                    <DrawerContent className="p-4">
                                        <ChatControl
                                            allowResponseCodes={false}
                                            vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                                            forObject={bl.caseDetails.get.ref}
                                            withDiscussion={true}
                                            withAttachments={true}
                                            defaultMode={CommunicationModeType.PLATFORM}                            
                                        />   
                                        <DrawerClose className="mt-2 w-full">
                                            <Button variant="link">Cancel</Button>
                                        </DrawerClose>
                                    </DrawerContent>
                                </Drawer>
                            </div>
                        )}
                        <Panel className="w-[300px]">
                            <PanelHeader className="flex flex-row">
                                <PanelTitle> Details </PanelTitle>
                                <div className="ml-auto">
                                    <UpdateHelpRequestButton
                                        caseDetails={bl.caseDetails.get} />
                                </div>
                            </PanelHeader>
                            <PanelContent className="flex flex-col flex-grow">
                                <span>{bl.caseDetails.get.code}</span>
                                <div className="flex flex-row">
                                    <span> {bl.caseDetails.get.category.defaultLabel} </span>
                                    <span className="font-bold ml-auto"> {bl.caseDetails.get.caseStatus} </span>
                                </div>
                                { bl.caseDetails.get.caseStatus != "NEW" ?
                                    <span className="text-sm"> Managed by: {bl.caseDetails.get.merchants.map(x => x.name).join(",")} </span>
                                    : <></>
                                }
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Contact</AccordionTrigger>
                                        <AccordionContent>
                                            <span> {bl.caseDetails.get?.contact.name} </span>
                                            <Link href={`mailto:${bl.caseDetails.get.contact.email}`} className="flex flex-row items-center space-x-3 hover:underline hover:text-primary"> 
                                                <Mail size={14} /> 
                                                <span className="text-foreground"> {bl.caseDetails.get.contact.email} </span> 
                                            </Link>
                                            <Link href={`tel:${bl.caseDetails.get.contact.phoneNumber}`} className="flex flex-row items-center space-x-3 hover:underline hover:text-primary"> 
                                                <Phone size={14}/> 
                                                <span className="text-foreground"> {bl.caseDetails.get.contact.phoneNumber.displayAs} </span> 
                                            </Link>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Location </AccordionTrigger>
                                        <AccordionContent>
                                            {bl.caseDetails.get.location.formattedAddress}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>Started From</AccordionTrigger>
                                        <AccordionContent>
                                            {bl.caseDetails.get.startedFrom.descriptor} 
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-4">
                                        <AccordionTrigger>Affected Areas</AccordionTrigger>
                                        <AccordionContent>
                                            <p>
                                                {bl.caseDetails.get.affectedAreas.map((affectedArea) => affectedArea.name).join(", ")}
                                            </p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-5">
                                        <AccordionTrigger>Affected People</AccordionTrigger>
                                        <AccordionContent>
                                                <p>
                                                {bl.caseDetails.get?.affectedPeople.map((affectedPerson) => affectedPerson.name).join(", ")}
                                                </p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-6">
                                        <AccordionTrigger>Religion</AccordionTrigger>
                                        <AccordionContent>
                                            <span> {bl.caseDetails.get.religion.defaultLabel} </span>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-7">
                                        <AccordionTrigger>What&apos;s Happening?</AccordionTrigger>
                                        <AccordionContent>
                                            <p className="leading-6" dangerouslySetInnerHTML={{ __html: bl.caseDetails.get.description }} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </PanelContent>
                        </Panel>
                        {bl.caseDetails.get.caseStatus === "NEW" && !bl.caseApplications.isLoading && (
                            bl.caseApplications.get.length > 0 ? (
                            <ul className="flex-row space-x-2">
                                {bl.caseApplications.get.map((caseApplication) => (
                                    <li key={caseApplication.id}>
                                        <Panel className="flex flex-col">
                                            <ViewCaseOffer 
                                                caseOffer={caseApplication} 
                                                page="trackCase" 
                                                type={"APPLICATION"} />
                                        </Panel>
                                    </li>
                                ))}
                            </ul>
                            )
                            : (
                                <Panel className="flex-grow">
                                    <PanelContent className="w-full h-full flex flex-col space-y-4 items-center justify-center">
                                        <p className="prose-xl w-80 text-center"> We are currently searching our network of Spiritual Investigators we hope to secure some applications for your review soon.</p>
                                        <span className="prose-xl">Stay tuned!</span>
                                    </PanelContent>
                                </Panel>
                            )
                        )}
                        {bl.caseDetails.get.caseStatus === "ACTIVE" && (
                            <>
                                {/* desktop screen */}
                                <div className="hidden md:grid grid-cols-2 gap-2 flex-grow">
                                    <div className="grid grid-rows-2 grid-cols-1 gap-2">
                                        <Panel className="h-full min-h-0">
                                            <PanelContent className="h-full min-h-0">
                                                <FeeSummary forObject={bl.caseDetails.get.ref} />
                                            </PanelContent>
                                        </Panel>
                                        <Panel className="h-full min-h-0">
                                            <PanelContent className="h-full w-full min-h-0">
                                                <ChatControl
                                                    allowResponseCodes={false}
                                                    vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                                                    forObject={bl.caseDetails.get.ref}
                                                    withDiscussion={true}
                                                    withAttachments={true}
                                                    defaultMode={CommunicationModeType.PLATFORM}                            
                                                />
                                            </PanelContent>
                                        </Panel>
                                    </div>
                                    <Panel className="flex-grow">
                                        <PanelHeader>
                                            <PanelTitle>Activities</PanelTitle>
                                        </PanelHeader>
                                        <PanelContent>
                                            <ul>
                                                {bl.caseInteractions.isLoading ? (
                                                    <span className="text-xs">Loading...</span>
                                                ) : (
                                                    bl.caseInteractions.get !== undefined && bl.caseInteractions.get.length > 0 ? (
                                                        bl.caseInteractions.get.map((caseInteraction) => (
                                                            <li key={caseInteraction.id} className="flex flex-col">
                                                                <span className="text-gray-500">{DateTime.fromISO(caseInteraction.conductedAtDate).toLocaleString(DateTime.DATETIME_MED)}</span>
                                                                <span>{caseInteraction.message}</span>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <>
                                                            <span className="p-2"> The investigator will log their activities that they conduct on your case here. </span>
                                                        </>
                                                    )
                                                )}
                                            </ul>
                                        </PanelContent>
                                    </Panel>
                                </div>
                                {/* mobile screen */}
                                <div className="block md:hidden flex flex-col">
                                    <Panel className="h-full">
                                        <PanelContent>
                                            <FeeSummary forObject={bl.caseDetails.get.ref} />
                                        </PanelContent>
                                    </Panel>
                                    <Panel className="flex-grow">
                                        <PanelHeader>
                                            <PanelTitle>Activities</PanelTitle>
                                        </PanelHeader>
                                        <PanelContent>
                                            <ul>
                                                {bl.caseInteractions.isLoading ? (
                                                    <span className="text-xs">Loading...</span>
                                                ) : (
                                                    bl.caseInteractions.get !== undefined && bl.caseInteractions.get.length > 0 ? (
                                                        bl.caseInteractions.get.map((caseInteraction) => (
                                                            <>
                                                                <li key={caseInteraction.id} className="hidden md:flex flex-col">
                                                                    <span className="text-gray-500">{DateTime.fromISO(caseInteraction.conductedAtDate).toLocaleString(DateTime.DATETIME_MED)}</span>
                                                                    <span>{caseInteraction.message}</span>
                                                                </li>
                                                                <li key={caseInteraction.id} className="block md:hidden flex flex-col">
                                                                    <div className="flex flex-col space-y-2 border-2 border-black p-2 rounded-md">
                                                                        <span className="text-gray-500">{DateTime.fromISO(caseInteraction.conductedAtDate).toLocaleString(DateTime.DATETIME_MED)}</span>
                                                                        <span>{caseInteraction.message}</span>
                                                                    </div>
                                                                    <Drawer>
                                                                        <DrawerTrigger>
                                                                            <Button variant="link" className="items-center"> See details </Button>
                                                                        </DrawerTrigger>
                                                                        <DrawerContent className="p-4 h-[95%]">
                                                                            <DrawerHeader>
                                                                                <span> Activity </span>
                                                                                <span className="text-gray-500">{DateTime.fromISO(caseInteraction.conductedAtDate).toLocaleString(DateTime.DATETIME_MED)}</span>
                                                                                <span>{caseInteraction.message}</span>
                                                                            </DrawerHeader>
                                                                            <DrawerFooter>
                                                                                <DrawerClose>
                                                                                    <Button variant="outline">Close</Button>
                                                                                </DrawerClose>
                                                                            </DrawerFooter>
                                                                        </DrawerContent>
                                                                    </Drawer>
                                                                </li>
                                                            </>
                                                        ))
                                                    ) : (
                                                        <span> No activities for this case </span>
                                                    )
                                                )}
                                            </ul>
                                        </PanelContent>
                                    </Panel>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <span> No details for this case </span> 
                )
            )}
        </>
    )
}

export default ViewCase
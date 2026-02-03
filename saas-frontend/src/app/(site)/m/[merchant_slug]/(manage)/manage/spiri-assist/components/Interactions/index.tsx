'use client'

import React, { useState } from "react"
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { case_type, CommunicationModeType, recordref_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import ChatControl from "@/components/ux/ChatControl";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown } from "lucide-react";
import UseCaseInteractions from "./hooks/UseCaseInteractions";
import UseCaseMerchants from "../../hooks/UseCaseMerchants";
import CreateActivityLog from "./components/CreateActivityLog";
import CreateCommentCase from "./components/CreateCommentCase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CreateOrder from "../../../../../../_components/Order/components/CreateOrder";
import UseCaseDetails from "../../hooks/UseCaseDetails";
import UseOrders from "../../../../../../_components/Order/hooks/UseOrders";
import OrderRow from "../../../../../../_components/Order/components/OrderRow";
import { Separator } from "@/components/ui/separator";
import { isNullOrUndefined } from "@/lib/functions";

type BLProps = {
    merchantId: string
    caseId: string
    caseRef: recordref_type,
    caseDetails: case_type
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {

    const caseInteractions = UseCaseInteractions(props.caseId)
    const caseMerchants = UseCaseMerchants(props.caseId)
    const caseDetails = UseCaseDetails(props.caseId)
    const orders = UseOrders(undefined, undefined, props.caseRef, undefined)

    return {
        interactions: {
            isLoading: caseInteractions.isLoading,
            get: caseInteractions.data ?? []
        },
        case: {
            get: caseDetails.data
        },
        payments: {
            get: caseMerchants.data && orders.data ? caseMerchants.data.map((merchant) => {
                return {
                    merchant,
                    invoices: orders.data.filter(x => 
                        x.lines && x.lines.some(y => y.merchantId == merchant.id)
                    )
                }
            }) : []
        },
        orders: {
            get: orders.data ?? []
        }
    }
}

const Interactions : React.FC<Props> = (props) => {
    const bl = useBL(props)
    const [viewCase, setViewCase] = useState(!isNullOrUndefined(bl.case.get) && bl.case.get.caseStatus != "NEW" ? "activities" : 'details')

    return (   
        <div className="min-h-0 relative flex flex-col h-full w-full"> 
            <div className="flex flex-row w-full min-h-[36px]">
                <div className="flex flex-row space-x-3 ml-2">
                    {bl.case.get != null && bl.case.get.caseStatus != "NEW" && (
                        <>
                            <Button variant={viewCase === 'activities' ? 'outline' : 'default'} type="button" onClick={() => setViewCase('activities')}> Activities & Notes </Button>
                            <Button variant={viewCase === 'payments' ? 'outline' : 'default'} type="button" onClick={() => setViewCase('payments')}> Payments </Button>
                            <Button variant={viewCase === 'chat' ? 'outline' : 'default'} type="button" onClick={() => setViewCase('chat')}> Chat </Button>
                        </>
                    )}
                    <Button variant={viewCase == 'details' ? "outline" : "default"} type="button" onClick={() => setViewCase('details')}> Details </Button>
                </div>
                {bl.case.get != null && bl.case.get.caseStatus != "CLOSED" && viewCase === 'activities' && (
                    <div className="space-x-2 ml-auto">
                        <Dialog>
                            <DialogTrigger asChild >
                                <Button> Log Client Activity </Button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col">
                                <CreateActivityLog caseRef={props.caseRef} merchantId={props.merchantId} />
                            </DialogContent>
                        </Dialog>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button> Team Note </Button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col">
                                <CreateCommentCase caseRef={props.caseRef} merchantId={props.merchantId}/>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
                {bl.case.get != null && bl.case.get.caseStatus != "CLOSED" && viewCase === 'payments' && (
                    <div className="space-x-2 ml-auto">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button disabled={bl.case.get.releaseOffer != null}> Create Order </Button>
                            </DialogTrigger>
                            <DialogContent className="flex flex-col h-4/5">
                                <CreateOrder
                                    merchantId={props.merchantId} 
                                    customerEmail={bl.case.get?.contact.email as string} 
                                    forObject={bl.case.get?.ref}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>
            {viewCase === 'details' && (
                <div className="flex-grow flex flex-col space-y-3 min-h-0">
                    <div className="flex flex-row space-x-2 ">
                        <div className="flex flex-col">
                            <span className="font-bold"> Category </span>
                            <span> {props.caseDetails.category.defaultLabel}  </span>
                        </div>
                        <Separator orientation="vertical" />
                        <div className="flex flex-col">
                            <span className="font-bold"> Religion </span>
                            <span> {props.caseDetails.religion.defaultLabel}  </span>
                        </div>
                        <Separator orientation="vertical" />
                        <div className="flex flex-col">
                            <span className="font-bold"> Affected Area </span>
                            {
                                props.caseDetails.affectedAreas.map((affectedArea) => (
                                        <span key={affectedArea.id}> {affectedArea.name} </span>
                                ))
                            }
                        </div>
                        <Separator orientation="vertical" />
                        <div className="flex flex-col">
                            <span className="font-bold"> Affected People </span>
                                {
                                    props.caseDetails.affectedPeople.map((affectedPerson) => (
                                        <span key={affectedPerson.id}> {affectedPerson.name} </span>
                                    ))
                                }
                        </div>
                    </div>
                    <div className="flex flex-col min-h-0">
                        <span className="font-bold mb-2"> What&apos;s Happening? </span>
                        <p className="leading-6 overflow-y-auto" dangerouslySetInnerHTML={{ __html: props.caseDetails.description }} />
                    </div>
                </div>
            )}
            {props.caseDetails.caseStatus !== "NEW" && viewCase === 'activities' && (
                <>
                    {bl.interactions.isLoading ? (
                        <span className="text-xs">Loading...</span>
                    ) : (
                        <>
                           {bl.interactions.get && bl.interactions.get.length > 0 ? (
                            <ul className="space-y-3 overflow-y-auto flex-grow mt-4 pr-2">
                                {bl.interactions.get.map((interaction) => (
                                    <li key={interaction.id} className="flex flex-col space-y-2">
                                        <Accordion type="single" collapsible>
                                        <AccordionItem value="items">
                                            <AccordionTrigger>
                                                <div className="flex flex-col space-y-2">
                                                    <div className="flex flex-row space-x-2">
                                                        <span className="text-muted-foreground text-sm">
                                                            {DateTime.fromISO(interaction.conductedAtDate).toLocaleString(DateTime.DATETIME_MED)}
                                                        </span>
                                                        <span className="text-xs mt-1">{interaction.code}</span>
                                                    </div>
                                                    <span>{interaction.message}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                {interaction.details ? (
                                                    <p dangerouslySetInnerHTML={{ __html: interaction.details }}></p>
                                                ) : interaction.comment ? (
                                                    <p dangerouslySetInnerHTML={{ __html: interaction.comment }}></p>
                                                ) : null}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>

                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <span className="text-muted-foreground text-base px-2 mt-4">No interactions or comments captured for this case</span>
                        )}
                        </>
                    )}
                </>
            )}
            {props.caseDetails.caseStatus !== "NEW" && viewCase === 'payments' && bl.case.get != null && (
                <div className="pr-2 flex flex-col min-h-0 overflow-y-auto mt-4"> 
                {
                    bl.case.get.releaseOffer != null ?
                        <p>Case is undergoing release process, payments will not be shown at this time.</p>
                        :
                        bl.payments.get.map(({ merchant, invoices }) => {
                            return (
                                    <Collapsible key={merchant.id} defaultOpen className="flex flex-col w-full mt-4">
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" className="flex flex-col h-auto items-start w-full p-2">
                                                <div className="flex flex-row justify-between space-x-3 w-full mb-2">
                                                    <span className="font-bold text-base">{merchant.name}</span>
                                                    { invoices.length > 0 && <ChevronsUpDown className="h-4 w-4" /> }
                                                </div>
                                                { invoices.length == 0 && (
                                                    <span className="text-base text-muted-foreground">No Payments lodged by this merchant</span>
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="flex flex-col space-y-2 overflow-y-auto">
                                            {
                                                invoices.map((order) => {
                                                    return (
                                                        <OrderRow 
                                                            key={order.id}
                                                            order={order}
                                                            page={"case"}                                               
                                                        />
                                                    )
                                                })
                                            }
                                        </CollapsibleContent>
                                    </Collapsible>
                            )
                        })
                }
                </div>
            )}
            {props.caseDetails.caseStatus !== "NEW" && bl.case.get != null && viewCase === 'chat' && (
                <ChatControl
                    className="flex-grow"
                    allowResponseCodes={false}
                    vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                    forObject={props.caseRef}
                    withDiscussion={true}
                    withTitle={false}
                    merchantId={props.merchantId}
                    defaultMode={CommunicationModeType.PLATFORM}
                    withAttachments={true}
                    readonly={bl.case.get.caseStatus == "CLOSED"}
                />
            )}
        </div>
    )
}

export default Interactions;
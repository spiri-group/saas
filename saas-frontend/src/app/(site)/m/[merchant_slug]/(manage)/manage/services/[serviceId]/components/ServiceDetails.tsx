'use client' 

import React from "react";
import { Panel } from "@/components/ux/Panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import UseViewServiceDetails from "../hooks/UseViewServiceDetails";

type BLProps = {
    merchantId: string,
    serviceId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const service = UseViewServiceDetails(props.merchantId, props.serviceId);

    return {
        service: {
            get: service.data
        }
    }
}

const ServiceDetails : React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.service.get) {
        return (
            <Panel className="flex-none w-full md:w-[450px]">
                <></>
            </Panel>
        )
    }

    return (
        <Panel className="flex-none space-y-2 w-full md:w-[400px]">
            <h1 className="text-sm md:text-2xl font-bold">{bl.service.get.name}</h1>
            <img src={bl.service.get.thumbnail.image.media.url} 
                className="w-full h-auto rounded-xl"
                alt={""}
            />
            <div className="grid grid-cols-2 grid-rows-auto gap-3 md:hidden">
                <Link href="#booktour"> <Button className="text-xs md:text-base w-full"> Book this service </Button> </Link>
                <Link href="#viewreview"> <Button className="text-xs md:text-base w-full"> View reviews </Button> </Link>
            </div>
            <Tabs defaultValue="description" className="w-full">
                <TabsList className="flex flex-row">
                    <TabsTrigger className="flex-grow text-xs md:text-base" value="description">Description</TabsTrigger>
                    {bl.service.get.terms != null && <TabsTrigger className="flex-grow text-xs md:text-base" value="terms">Terms</TabsTrigger> }
                    {bl.service.get.faq.length > 0 && <TabsTrigger className="flex-grow text-xs md:text-base" value="faq">FAQ</TabsTrigger> }
                </TabsList>
                <TabsContent value="description">
                    <div className="flex flex-col">
                        <p className="leading-6 p-2 text-xs md:text-base" dangerouslySetInnerHTML={{ __html: bl.service.get.description }} />
                    </div>
                </TabsContent>
                <TabsContent value="terms">
                    <div className="flex flex-col">
                        <p className="leading-6 p-2 text-xs md:text-base" dangerouslySetInnerHTML={{ __html: bl.service.get.terms }} />
                    </div>
                </TabsContent>
                <TabsContent value="faq">
                    <div className="flex flex-col">
                    {bl.service.get.faq.map((faq) => (
                        <>
                            <Accordion type="single" collapsible>
                                <AccordionItem value="items">
                                    <AccordionTrigger>
                                        <span className="font-bold text-left text-xs md:text-base">{faq.title}</span>
                                    </AccordionTrigger>
                                    <AccordionContent> <p className="leading-6 -mt-1 ml-2 text-xs md:text-base" dangerouslySetInnerHTML={{ __html: faq.description }} /> </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </>
                    ))}
                    </div>
                </TabsContent>
            </Tabs>
        </Panel>
    )

}

export default ServiceDetails;
'use client' 

import React from "react";
import { Panel } from "@/components/ux/Panel";
import UseViewTourDetails from "../hooks/UseViewTourDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type BLProps = {
    merchantId: string,
    tourId: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const tour = UseViewTourDetails(props.merchantId, props.tourId);

    return {
        tour: {
            get: tour.data
        }
    }
}

const TourDetails : React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.tour.get) {
        return (
            <Panel className="flex-none w-full md:w-[450px]">
                <></>
            </Panel>
        )
    }

    return (
        <Panel className="flex-none space-y-2 w-full md:w-[400px]">
            <h1 className="font-bold text-sm md:text-xl">{bl.tour.get.name}</h1>
            <img src={bl.tour.get.thumbnail.image.media.url} 
                className="w-full h-auto rounded-xl"
                alt={""}
            />
            <div className="grid grid-cols-2 grid-rows-auto gap-3 lg:hidden">
                <Link href="#booktour"> <Button className="text-xs md:text-base w-full"> Book this tour </Button> </Link>
                <Link href="#viewreview"> <Button className="text-xs md:text-base w-full"> View reviews </Button> </Link>
            </div>
            <Tabs defaultValue="description" className="w-full">
                <TabsList className="flex flex-row">
                    <TabsTrigger className="flex-grow text-xs md:text-base" value="description">Description</TabsTrigger>
                    {bl.tour.get.terms != null && <TabsTrigger className="flex-grow text-xs md:text-base" value="terms">Terms</TabsTrigger> }
                    {bl.tour.get.faq.length > 0 && <TabsTrigger className="flex-grow text-xs md:text-base" value="faq">FAQ</TabsTrigger> }
                </TabsList>
                <TabsContent value="description">
                    <div className="flex flex-col">
                        <p className="leading-6 p-2 text-xs md:text-base" dangerouslySetInnerHTML={{ __html: bl.tour.get.description }} />
                    </div>
                </TabsContent>
                <TabsContent value="terms">
                    <div className="flex flex-col">
                        <p className="leading-6 p-2 text-xs md:text-base" dangerouslySetInnerHTML={{ __html: bl.tour.get.terms }} />
                    </div>
                </TabsContent>
                <TabsContent value="faq">
                    <div className="flex flex-col">
                    {bl.tour.get.faq.map((faq) => (
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

export default TourDetails;
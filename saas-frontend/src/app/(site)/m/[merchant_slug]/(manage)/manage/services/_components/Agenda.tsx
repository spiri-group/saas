'use client';

import { Panel, PanelHeader } from "@/components/ux/Panel";
import React from "react"
import { useParams } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import UseMerchantService from "../hooks/UseMerchantService";

const useBL = () => {
    const params = useParams();
    if (params == null || params.merchantId == null) throw new Error("No merchantId provided in URL");

    const service = UseMerchantService(params.merchantId as string)

    return {
        merchantId: params != null && params.merchantId != null ? params.merchantId : null,
        services: {
            get: service.data ?? [],
            isLoading: service.isLoading
        }
    }
}

const Agenda: React.FC = () => {
    const params = useParams();
    if (params == null || params.merchantId == null) throw new Error("No merchantId provided in URL");

    const bl = useBL()

    return (
        <Panel className="w-full flex flex-none flex-col">
            <div className="flex flex-row">
                <PanelHeader>Agenda</PanelHeader>
                {/* <span className="ml-auto"> todays date </span> */}
            </div>
            <h2> Today&apos;s task </h2>
                {bl.services.isLoading ? (<span>Loading your tasks, give us a moment...</span>) : <></>}
                {!bl.services.isLoading && bl.services.get.length == 0 ? (<span>You have no tasks today</span>) :
                (
                    <ul>
                        {
                            bl.services.get.map((service) => {
                                return (
                                    <li key={service.id}>
                                        <div className="flex flex-row space-x-2">
                                            <span> {service.duration.amount} </span>
                                            <Separator orientation="vertical" />
                                            <div className="flex flex-col">
                                                <span className="font-bold"> {service.name} </span>
                                                <span>{service.description}</span>
                                            </div>
                                            <Separator orientation="vertical" />
                                            <div className="flex flex-col">
                                                <span className="font-bold"> Location </span>
                                            </div>
                                        </div>
                                    </li> 
                                )
                            })
                        }
                    </ul>
                )}
        </Panel>
    )
}

export default Agenda
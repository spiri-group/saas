'use client';

import { Panel } from "@/components/ux/Panel";
import React from "react"
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import ServicesCalendar from "./ServicesCalendar";
import { DateTime } from "luxon";


type Props = {
    gql_conn: gql_conn_type,
    merchantId: string
}

const MyServices: React.FC<Props> = (props) => {
    const params = useParams();
    const router = useRouter();
    
    if (params == null || params.merchantId == null) throw new Error("No merchantId provided in URL");

    return (
        <div>
            <Button onClick={async () => {router.push(`/m/${props.merchantId}/Services/Availability`)}} variant="default" className="mb-2 w-full"> 
                Configure Availability 
            </Button>
            <Panel className="flex flex-none flex-col">
                <ServicesCalendar
                    gql_conn={props.gql_conn}
                    merchantId={props.merchantId}
                    totalHeight={600}
                    startDt={DateTime.now().minus({ days: 3 })}
                    endDt={DateTime.now().plus({ days: 2 })}
                />
            </Panel>
        </div>
    )
}

export default MyServices
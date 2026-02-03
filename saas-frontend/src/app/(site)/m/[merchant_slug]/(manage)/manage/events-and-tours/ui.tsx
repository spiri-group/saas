'use client'

import React from "react"
import CreateScheduleComponent from "./components/Schedule";
import SessionsComponent from "./components/Sessions";
import WithPaymentsEnabled from "../../../../_components/Banking/_components/WithPaymentsEnabled";

type BLProps = {
    merchantId: string
}

type Props = BLProps & {
}

const useBL = (props: BLProps) => {
    console.log(props)
        
    return {
        
    }
}

const UI : React.FC<Props> = (props) => {
    const bl = useBL(props)
    console.log(bl)

    return (   
       <>
            <div className="flex w-full h-full flex-col flex-col-reverse space-y-2 md:flex flex-row space-x-2">
                <CreateScheduleComponent vendorId={props.merchantId} />
                <SessionsComponent />
            </div>
       </>
    )
}

export default WithPaymentsEnabled(UI);
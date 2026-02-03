'use client'

import React from "react"
import withPaymentsEnabled from "../../../../_components/Banking/_components/WithPaymentsEnabled";

// type BLProps = {
//     merchantId: string
// }

// type Props = BLProps & {
// }

// const useBL = (props: BLProps) => {

//     return {
//         ref: {
//             partition: props.merchantId
//         } as recordref_type
//     }
// }

const UI = () => {
// const UI : React.FC<Props> = (props) => {
//     const bl = useBL(props)

    return (   
        <div className="flex flex-col flex-grow space-y-2 md:flex flex-row space-x-2">
            {/* <div className="flex flex-col flex-none">
                <Agenda gql_conn={props.gql_conn}  />
            </div> */}
            {/* <div className="flex flex-col flex-grow">
                <MyServices gql_conn={props.gql_conn} merchantId={props.merchantId} />
            </div> */}
        </div>
    )
}

// Services don't require physical locations
export default withPaymentsEnabled(UI, { requireLocations: false });
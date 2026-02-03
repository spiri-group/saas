import React from "react";

// import UseTourTicketLists from "./hooks/UseTourTicketLists";

type BLProps = {
    merchantId: string
    tourId: string
}

type Props = BLProps & {
    
}

// const useBL = (props: BLProps) => {

//     const tourTicketLists = UseTourTicketLists(props.merchantId, props.tourId)

//     return {
//         tourTicketLists: {
//             get: tourTicketLists.data ?? [] 
//         }
//     }
// }

const ChooseTicketList: React.FC<Props> = (props) => {
    console.log(props)
    // const bl = useBL(props);

    return (
        <>

        </>
    )
}

export default ChooseTicketList;
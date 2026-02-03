import React from "react";

// import UseTourActivityLists from "./hooks/UseTourActivityLists";

type BLProps = {
    merchantId: string
    tourId: string
}

type Props = BLProps & {
    
}

// const useBL = (props: BLProps) => {

//     const tourActivityLists = UseTourActivityLists(props.merchantId, props.tourId)

//     return {
//         activityLists: {
//             get: tourActivityLists.data ?? [] 
//         },
//         form: tourActivityLists
//     }
// }

const ChooseActivityList: React.FC<Props> = () => {
    // const bl = useBL(props);

    return (
        <>
         <div className="flex flex-col">
            <h1 className="font-bold"> Select activity list </h1>
                {/* {bl.activityLists.get.length > 0 ? (
                    <Form>
                        <form> 
                        <FormControl>
                            <FormField>
                            <ComboBox
                                {...field}
                                items={bl.tourActivityLists.get}
                                objectName="Activity List"
                                fieldMapping={{
                                    keyColumn: "id",
                                    labelColumn: "name"
                                }}
                            />
                            </FormField>
                        </FormControl>
                        </form>
                    </Form>
                ) : (
                    <span className="text-sm">No activity lists available.</span>
                )} */}
        </div>
        </>
    )
}

export default ChooseActivityList;
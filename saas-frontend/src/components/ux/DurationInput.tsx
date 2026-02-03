// import { ControllerRenderProps } from "react-hook-form"
// import { Input, InputProps } from "../ui/input"
// import { choice_option_type } from "@/utils/spiriverse"
// import { useEffect, useState } from "react"

// type Props = ControllerRenderProps<{
//     [key: string]: number | undefined
// }, any> & InputProps & {
// }

// const DurationInput: React.FC<Props> = (props) => {
//     const [amount, setAmount] = useState<number | null>(null)
//     const [unit, setUnit] = useState<choice_option_type | null>(null)

//     useEffect(() => {
//         props.onChange({
//             amount, unit
//         })
//     }, [amount, unit])

//     return (
//         <div className="flex flex-row space-x-2">
//             <Input type="number" value={amount} onChange={(ev) => parseFloat(ev.target.value)} placeholder="Duration" />
//             <UnitCombobox 
//                 withSearch={true}
//                 objectName="unit"
//                 fieldMapping={{
//                     labelColumn: "value",
//                     keyColumn: "id"
//                 }}
//                 items={bl.unitOptions ?? []}                              
//             />
//     </div>   
//     )
// }

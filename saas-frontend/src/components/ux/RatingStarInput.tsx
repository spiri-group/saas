import { ControllerRenderProps } from "react-hook-form"
import { InputProps } from "../ui/input"
import RatingStarVisualizerComponent from "../ui/ratingstar"

type Props = 
    InputProps &
    ControllerRenderProps<{
        [key: string]: number
    }, string> &
{
}

const RatingStarInput: React.FC<Props> = ({...props}) => { 

    return (
        <RatingStarVisualizerComponent 
            onSelect={(rating) => { props.onChange(rating)}} 
            value={props.value}
        />
    )
}

export default RatingStarInput
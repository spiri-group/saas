import Thumbs from "@/icons/Thumbs";

import { useEffect, useState } from "react";

// const useBL = () => {
    
//     const mutation = useMutation({
//         mutationFn: async () => {
//           const resp = await gql(
//             `mutation addLike($forObject: RecordRefInput!) {
//                 add_like(ref: $forObject) {
//                     code
//                     message
//                     likeState {
//                         count
//                     }
//                 }
//             }
//           `, {

//             })
  
//           return resp
//         }
//     })

//     const query = useQuery({
//         queryKey: ["likes"],
//         queryFn: async () => {
//             const likeResp = await gql<{
//                 object: {
//                     liked: boolean
//                     likeCount: number
//                     ref: {
//                         id: string
//                         partition: string
//                         container: string
//                     }
//                 }
//             }>(
//                 `query object($ref: RecordRefInput!) {
//                     object(ref: $ref) {
//                         liked
//                         likeCount
//                         ref {
//                             id,
//                             partition,
//                             container
//                         }
//                     }
//                 }
//                 `,
//                 {
                    
//                 }
//             )

//             return likeResp
//         }
//     })
    
//     return {
//         submit: async () => {
//             await mutation.mutateAsync()
//         },
//         like: {
//             isLoading: query.isLoading,
//             get: query.data
//         }
//     }
    
// }

type Props = {
    className?: string
    iconSize?: number
    filledColor?: string
    value?: boolean
    onSelect?: (like: boolean) => void
}

const LikeAndDislike : React.FC<Props> = (props) => {
    // const bl =  useBL();

    const [like, setLike] = useState<boolean | null>(null)

    useEffect(() => {
        if (props.value != null) setLike(props.value);
    }, [props.value])

    const thumbsUpClick = async () => {
        setLike(true);
        if (props.onSelect) props.onSelect(true);
    }

    const thumbsDownClick = () => {
        setLike(false);
        if (props.onSelect) props.onSelect(false);
    }

    return (
        <div className="flex flex-row space-x-2">
            {like != null && 
                (like ? <Thumbs height={20} direction="up" onClick={thumbsUpClick} /> 
                      : <Thumbs height={20} direction="down" onClick={thumbsDownClick} />)}
        </div>
    )
}

export default LikeAndDislike
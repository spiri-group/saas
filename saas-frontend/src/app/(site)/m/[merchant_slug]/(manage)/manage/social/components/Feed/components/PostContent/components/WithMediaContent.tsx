'use client'


import { cn } from "@/lib/utils"
import { socialpost_type } from "@/utils/spiriverse"
import Image from "next/image"

type Props = {
    className?: string,
    socialPost: socialpost_type
}

const WithMediaContent : React.FC<Props> = (props) => {
    
    return (
        <div className={cn("flex flex-col", props.className)}>
           {props.socialPost.media != null && props.socialPost.media.length > 0
                && props.socialPost.media.map((media, idx) => (
                <div key={idx} className="flex flex-col h-full items-center justify-center">
                    <Image src={media.url} 
                        className="rounded-md"
                        width={600}
                        height={200}
                        alt={""}
                    /> 
                </div>
                )) 
            }
        </div>
    )
}

export default WithMediaContent; 
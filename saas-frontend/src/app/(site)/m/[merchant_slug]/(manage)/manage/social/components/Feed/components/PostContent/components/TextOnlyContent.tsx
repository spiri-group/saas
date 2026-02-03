'use client'


import { cn } from "@/lib/utils"
import { socialpost_type } from "@/utils/spiriverse"
import { QuoteIcon } from "lucide-react"
import { textOnlySocialPostSchema } from "../../../../Create/hooks/UseCreatePostForMerchant"
import { z } from "zod"

type Props = {
    className?: string,
    socialPost: socialpost_type
}

const TextOnlyContent : React.FC<Props> = (props) => {
    const content = props.socialPost.content as z.infer<typeof textOnlySocialPostSchema>;

    return (
        <div className={
            cn("aspect-square flex flex-col", 
            props.className,
            content.textVerticalAlignment == "top" && "justify-start",
            content.textVerticalAlignment == "center" && "justify-center",
            content.textVerticalAlignment == "bottom" && "justify-end" )}
            style={{
                backgroundColor: content.backgroundType == "color" ? content.backgroundColor : "transparent",
                backgroundImage: content.backgroundType == "image" ? `url(${content.backgroundImage?.url})` : "none",
            }}>
            {(props.socialPost.media == null || props.socialPost.media.length == 0) && (
                <div className="p-4 flex-none w-full">
                    <div style={{
                        backgroundColor: content.mainText.format.backgroundColor,
                        margin: `${content.mainText.format.margin.top}px ${content.mainText.format.margin.right}px ${content.mainText.format.margin.bottom}px ${content.mainText.format.margin.left}px`,
                        padding: `${content.mainText.format.padding.top}px ${content.mainText.format.padding.right}px ${content.mainText.format.padding.bottom}px ${content.mainText.format.padding.left}px`,
                        borderTopLeftRadius: `${content.mainText.format.borderRadius.topLeft}px`,
                        borderTopRightRadius: `${content.mainText.format.borderRadius.topRight}px`,
                        borderBottomLeftRadius: `${content.mainText.format.borderRadius.bottomLeft}px`,
                        borderBottomRightRadius: `${content.mainText.format.borderRadius.bottomRight}px`
                    }}>
                        { content.mainText.format.withQuotes && <QuoteIcon className="w-4 h-4" fill={content.mainText.format.color} /> }
                        <h1 className="mx-2 w-full"
                            style={{
                                maxHeight: 200,
                                fontFamily: content.mainText.format.family,
                                fontSize: content.mainText.format.size + "em",
                                fontWeight: content.mainText.format.bold ? "bold" : "normal",
                                fontStyle: content.mainText.format.italic ? "italic" : "normal",
                                color: content.mainText.format.color,
                                textDecoration: content.mainText.format.decoration,
                                textAlign: content.mainText.format.alignment,
                                overflow: "hidden"
                            }}
                        >{content.mainText.content}</h1>
                        { content.mainText.format.withQuotes && <QuoteIcon className="ml-auto w-4 h-4" fill={content.mainText.format.color} /> }
                    </div>
                    {   content.subText && (
                        <h2
                            style={{
                                maxHeight: 50,
                                fontFamily: content.subText.format.family,
                                fontSize: content.subText.format.size + "em",
                                fontWeight: content.subText.format.bold ? "bold" : "normal",
                                fontStyle: content.subText.format.italic ? "italic" : "normal",
                                color: content.subText.format.color,
                                textDecoration: content.subText.format.decoration,
                                textAlign: content.subText.format.alignment,
                                backgroundColor: content.subText.format.backgroundColor,
                                margin: `${content.subText.format.margin.top}px ${content.subText.format.margin.right}px ${content.subText.format.margin.bottom}px ${content.subText.format.margin.left}px`,
                                padding: `${content.subText.format.padding.top}px ${content.subText.format.padding.right}px ${content.subText.format.padding.bottom}px ${content.subText.format.padding.left}px`,
                                borderTopLeftRadius: `${content.subText.format.borderRadius.topLeft}px`,
                                borderTopRightRadius: `${content.subText.format.borderRadius.topRight}px`,
                                borderBottomLeftRadius: `${content.subText.format.borderRadius.bottomLeft}px`,
                                borderBottomRightRadius: `${content.subText.format.borderRadius.bottomRight}px`
                            }}>
                            {content.subText.content}
                        </h2>
                    )}
                </div>  
            )}
        </div>
    )
}

export default TextOnlyContent; 
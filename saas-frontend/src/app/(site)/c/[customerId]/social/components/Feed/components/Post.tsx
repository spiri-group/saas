'use client'

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import IconButton from "@/components/ui/iconbutton"
import { formatDateString } from "@/lib/functions"
import { cn } from "@/lib/utils"
import { socialpost_type } from "@/utils/spiriverse"
import { MenuIcon, MessagesSquareIcon, QuoteIcon, Share2Icon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

type Props = {
    className?: string,
    socialPost: socialpost_type
    disableInteraction?: boolean
}

const SocialPost : React.FC<Props> = (props) => {
    const [seeMoreDescription, setSeeMoreDescription] = useState(false)

    const showButton = () => { setSeeMoreDescription(!seeMoreDescription)}

    const maxCharacters = 80
  
    return (
        <div className={cn("flex flex-col", props.className)}>
            {props.socialPost.media != null && props.socialPost.media.length > 0
                && props.socialPost.media.map((media, idx) => (
                <div key={`socialpost-${props.socialPost.id}-media-${idx}`} className="flex flex-col">
                    <Image src={media.url} 
                        className="rounded-md items-center"
                        width={400}
                        height={200}
                        alt={""}
                    /> 
                    <div className="flex flex-row justify-between text-xs my-2">
                        <div className="flex flex-row space-x-2">
                            <span> 18 likes </span>
                            <ThumbsUpIcon className="w-4 h-4" />
                            <ThumbsDownIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-row space-x-2">
                            <h2 className="text-xs">{formatDateString(props.socialPost.availableAfter)}</h2>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <IconButton icon={<MenuIcon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="ghost" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem>
                                        <span>Update Social post</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <span>Delete Social post</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {/* <span>{seeMoreDescription ? props.socialPost.description : props.socialPost.description.slice(0, maxCharacters)}</span>
                    { seeMoreDescription && <p className="text-xs">{props.socialPost.hashtags}</p> } */}
                    <div className="grid grid-cols-3 grid-rows-1 mt-2">
                        {props.socialPost.description.length > maxCharacters && (<Button variant="ghost" disabled={props.disableInteraction ?? false} onClick={showButton} className="text-xs"> {seeMoreDescription ? 'See less' : 'See More'} </Button>)}
                        <IconButton icon={<MessagesSquareIcon className="w-4 h-4" />} disabled={props.disableInteraction ?? false} variant="ghost" className="text-xs"> Comment </IconButton>
                        <IconButton icon={<Share2Icon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="ghost" className="text-xs"> Share </IconButton>
                    </div> 
                </div>
                )) 
            }
            { (props.socialPost.media == null || props.socialPost.media.length == 0) && (
                <div className="flex flex-col items-center justify-center">
                    <div className="p-2 w-full">
                        <QuoteIcon className="w-4 h-4" fill="black" />
                        <div className="flex flex-row w-full items-center justify-center">
                            <p className="text-base md:text-2xl m-4"> {props.socialPost.description.slice(0,400)} </p>
                        </div>
                        <QuoteIcon className="ml-auto w-4 h-4" fill="black" />
                    </div>  
                    <div className="flex flex-row justify-between text-xs my-2 w-full">
                        <div className="flex flex-row space-x-2">
                            <span> 18 likes </span>
                            <ThumbsUpIcon className="w-4 h-4" />
                            <ThumbsDownIcon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-row space-x-2">
                            <h2 className="text-xs">{formatDateString(props.socialPost.availableAfter)}</h2>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <IconButton icon={<MenuIcon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="ghost" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem>
                                        <span>Update Social post</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <span>Delete Social post</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <ul className="flex flex-row justify-start space-x-3 w-full">
                        {props.socialPost.hashtags.map((hashtag) => (
                            <li key={hashtag} className="text-xs">#{hashtag}</li>
                        ))}
                    </ul>
                    <div className="grid grid-cols-2 grid-rows-1 mt-2 w-full">
                        {props.socialPost.description.length > maxCharacters && (<Button variant="ghost" onClick={showButton} className="text-xs"> {seeMoreDescription ? 'See less' : 'See More'} </Button>)}
                        <IconButton icon={<MessagesSquareIcon className="w-4 h-4" />} disabled={props.disableInteraction ?? false} variant="ghost" className="text-xs"> Comment </IconButton>
                        <IconButton icon={<Share2Icon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="ghost" className="text-xs"> Share </IconButton>
                    </div> 
                </div>
            )}
        </div>
    )
}

export default SocialPost; 
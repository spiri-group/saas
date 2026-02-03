'use client'


import { cn } from "@/lib/utils"
import { socialpost_type } from "@/utils/spiriverse"
import IconButton from "@/components/ui/iconbutton"
import { MessagesSquareIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import PostContent from "./PostContent"
import { Separator } from "@/components/ui/separator"
import AllComment from "../../../../../../../../components/Comment/Comments"
import NewComment from "../../../../../../../../components/Comment/Create/NewComment"
import PostDescription from "./PostDescription"

type Props = {
    className?: string,
    socialPost: socialpost_type,
    disableInteraction?: boolean
}

const SocialPost : React.FC<Props> = (props) => {
    
    return (
        <div className={cn("flex flex-col", props.className)}>
            {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <IconButton icon={<MoreVerticalIcon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="ghost" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>
                        <span>Update Social post</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <span>Delete Social post</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu> */}
            <PostContent post={props.socialPost} />
            <div className="flex-grow flex flex-col">
                <div className="flex flex-row justify-between text-xs">
                    <h1 className="text-md p-2">{props.socialPost.title?.slice(0, 400)}</h1>
                    {/* TODO: Should be change like to reaction */}
                    {!props.disableInteraction && <span className="flex text-xs p-2"> Reaction </span> }
                </div>
                <div className="flex flex-row">
                    <ul className="flex flex-row justify-start space-x-1 pl-1">
                        {props.socialPost.hashtags.slice(0, 5).map((hashtag) => (
                            <li key={hashtag} className="text-xs font-bold">#{hashtag}</li>
                        ))}
                    </ul>
                    {!props.disableInteraction && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <span className="text-xs text-blue-400 ml-auto cursor-pointer" > See more </span>
                            </DialogTrigger>
                            <DialogContent className="flex flex-row w-[900px] h-[600px]">
                                <PostContent 
                                    post={props.socialPost}/>
                                <div className="flex flex-col w-[300px] flex-none space-y-2 p-2">
                                    <PostDescription post={props.socialPost} /> 
                                    <Separator orientation="horizontal"/>
                                    <div className="scrollbar p-2 flex-grow" style={{ maxHeight: "600px", overflow: "auto" }}>
                                        <AllComment forObject={props.socialPost.ref}/>
                                    </div>
                                    <div className="mt-auto">
                                        <NewComment 
                                            className="mt-2"
                                            forObject={props.socialPost.ref} />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {/* <div className="flex-grow">
                    {props.socialPost.description.slice(0, 400)}
                </div> */}
                <div className="grid grid-cols-1 grid-rows-1 mt-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <IconButton icon={<MessagesSquareIcon className="w-4 h-4" />} disabled={props.disableInteraction ?? false} variant="link" className="text-xs" > Comment </IconButton>
                        </DialogTrigger>
                        <DialogContent className="flex flex-row w-[900px] h-[600px]">
                            <PostContent post={props.socialPost}/>
                            <div className="flex flex-col w-[300px] flex-none space-y-2">
                                <PostDescription post={props.socialPost} />
                                <Separator orientation="horizontal"/>
                                <div className="scrollbar p-2 flex-grow" style={{ maxHeight: "600px", overflow: "auto" }}>
                                    <AllComment forObject={props.socialPost.ref}/>
                                </div>
                                <div className="mt-auto">
                                    <NewComment forObject={props.socialPost.ref} />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    {/* <IconButton icon={<Share2Icon className="w-4 h-4"/>} disabled={props.disableInteraction ?? false} variant="link" className="text-xs"> Share </IconButton> */}
                </div> 
            </div>
        </div>
    )
}

export default SocialPost; 
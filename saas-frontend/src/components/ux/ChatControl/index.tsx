import { CommunicationModeType, message_type, recordref_type } from "@/utils/spiriverse";
import classNames from "classnames";
import UseMessagesForObject from "./hooks/UseMessagesForObject";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import NewMessage from "./NewMessage";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import MediaViewer from "../../../app/(site)/components/Media/components/MediaViewer";

type BLProps = {
    forObject: recordref_type
    scopedMessage?: message_type
}

export type ChatControlProps = BLProps & {
    title?: string,
    defaultMode: CommunicationModeType,
    allowResponseCodes?: boolean,
    readonly?: boolean,
    className?: string,
    userId?: string,
    merchantId?: string,
    vendorSettings: {
        withCompanyLogo: boolean
        withCompanyName: boolean
        withUserName: boolean
    },
    withDiscussion: boolean,
    withTitle?: boolean,
    withAttachments: boolean
}

const useBL = (props: BLProps) => {

    const [scopedMessage, setScopedMessage] = useState<message_type | null>(props.scopedMessage ?? null)
    const chatControlRef = useRef<HTMLUListElement>(null)

    const targetObject = scopedMessage ? scopedMessage.ref : props.forObject
    
    const messages = UseMessagesForObject(targetObject)

    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)

    // when we get a new message we need to scroll the chat control view to bottom
    // however if they've manually scrolled we want to turn off this feature
    useEffect(() => {
        if (chatControlRef.current && autoScrollEnabled) {
            chatControlRef.current.scrollTop = chatControlRef.current.scrollHeight
        }
    }, [messages.data, autoScrollEnabled])

    useEffect(() => {
        const el = chatControlRef.current;
        if (!el) return;

        const handler = () => {
            setAutoScrollEnabled(
                el.scrollHeight - el.scrollTop === el.clientHeight
            );
        };
        el.addEventListener('scroll', handler);
        return () => el.removeEventListener('scroll', handler); // 🔧 cleanup
    }, []);


    return {
        messages, 
        chatControlRef,
        autoScrollEnabled,
        toggleAutoScroll: (state?: boolean) => setAutoScrollEnabled(state != undefined ? state : !autoScrollEnabled),
        isLoading: messages.isLoading || messages.data == null,
        scopedMessage, 
        setScopedMessage
    }
}

const ChatControl : React.FC<ChatControlProps> = ({ title = "Chat", withTitle = true, ...props}) => {
    const bl = useBL(props)

    const format_time_string = (sentAt: string) => {
        const messageSent = DateTime.fromISO(sentAt)
        const now = DateTime.now()
        const postedAt = now.diff(messageSent, 'days').toObject().days ?? 0
    
        if (postedAt <= 6) {
            // less than 7 days
            return messageSent.toFormat("ccc, hh:mm a");
        } else {
            // more than 7 days
            return messageSent.toFormat("DD, hh:mm a");
        }
    }

    return (
        <div className={cn("flex flex-col items-start h-full w-full min-h-0", props.className)}>
            {(bl.scopedMessage != null || withTitle) && (
                <div className="flex flex-row items-center -mt-2 w-full">
                    {withTitle && <h2 className="text-lg font-bold"> {title} </h2>}
                </div>
            )}
            {bl.scopedMessage && (
                <div className="w-full border-b-2 border-primary rounded-md p-4">
                    <div className="flex flex-row items-center w-full">
                        <span className="text-sm text-muted-foreground">{format_time_string(bl.scopedMessage.sentAt)}</span> 
                        <span className="font-bold text-sm ml-2">{bl.scopedMessage.posted_by.name} </span>    
                        {bl.scopedMessage != null && <Button className="ml-auto" variant="link" onClick={() => bl.setScopedMessage(null)}>Back to top</Button> }                
                    </div>
                    <div className="flex flex-row pt-2">
                        {bl.scopedMessage.media && bl.scopedMessage.media.length > 0 && (
                            <MediaViewer 
                                merchantId={props.merchantId} 
                                files={bl.scopedMessage.media}
                                message={bl.scopedMessage}
                                />
                        )}
                        <span className="text-base text-wrap">{bl.scopedMessage.text}</span>
                    </div>
                </div>
            )}
            {<span className={cn(bl.autoScrollEnabled ? "text-primary" : "text-muted-foreground", "text-sm mt-2 cursor-pointer")} onClick={() => bl.toggleAutoScroll()}>{bl.autoScrollEnabled ? "auto-scroll enabled" : "auto-scroll disabled"}</span>}
            {bl.isLoading && <span className="text-muted-foreground text-sm mt-2">Loading...</span>}
            {!bl.isLoading && bl.messages.data != null &&
                <>
                {
                    bl.messages.data.length > 0 ?
                    <ul ref={bl.chatControlRef} className={cn("flex flex-col overflow-y-auto divide-y flex-grow w-full", bl.scopedMessage != null ? "pl-6" : "")}>
                        {bl.messages.data && bl.messages.data.map((message) => {
                                return (
                                    <li className={classNames("filter py-2")} key={message.id}>
                                        <div className="flex flex-col">
                                            <div className={classNames("flex flex-col")}>
                                                <div className="flex flex-row items-center">
                                                    <span className="text-sm text-muted-foreground">{format_time_string(message.sentAt)}</span> 
                                                    <span className="font-bold text-sm ml-2"> {message.posted_by.name} </span>                                            
                                                    {props.withDiscussion && <Button 
                                                        className="ml-auto" 
                                                        variant="link"
                                                        onClick={() => {
                                                            bl.setScopedMessage(message)
                                                        }}>Enter discussion</Button>}
                                                </div>
                                                <div className="flex flex-row pt-2">
                                                    {message.media && message.media.length > 0 && (
                                                        <MediaViewer className="mt-2" merchantId={props.merchantId} files={message.media} message={message}/>
                                                    )}
                                                    <p className="text-base">{message.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )
                            } 
                        )}
                    </ul> 
                    : <p className={cn("text-center text-muted-foreground text-base flex-grow", bl.scopedMessage != null ? "pl-6 pt-3" : "pt-3 pl-2")}>Hmm.... No messages found. {props.readonly ? '' : `Let's get it started. Send your message!`}</p>
                }
                {!props.readonly &&
                    <div className="mt-2 w-full">
                        <NewMessage
                            forObject={props.forObject} 
                            replyTo={bl.scopedMessage ? bl.scopedMessage.ref : undefined}
                            merchantId={props.merchantId}
                            withAttachments={props.withAttachments}
                            onSuccess={() => {
                                bl.toggleAutoScroll(true)
                            }}
                        />
                    </div>
                }
                </>
            }
        </div>
    )
}

export default ChatControl;
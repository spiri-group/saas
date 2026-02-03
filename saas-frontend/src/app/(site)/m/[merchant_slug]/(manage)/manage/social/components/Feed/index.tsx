'use client';

import { Panel } from "@/components/ux/Panel";
import React, {  } from "react";
import SocialPost from "./components/Post";
import UsePostsForMerchant from "./hooks/UsePostsForMerchant";

import { cn } from "@/lib/utils";

type Props = {
    merchantId: string,
    className?: string
}

const SocialFeed : React.FC<Props> = (props) => {
    const socialPosts = UsePostsForMerchant(props.merchantId)
    
    if (socialPosts.isLoading || socialPosts.data == null) return <div></div>

    if (socialPosts.data.length == 0) return (
        <Panel key={"socialFeed-NoItems"} className={cn("", props.className)}>
            <></>
        </Panel>
    )

    return (
        <>
            <ul className={cn("", props.className)}>
                {
                    socialPosts.data.map((post) => (
                        <Panel key={post.id} className=" mt-2">
                            <SocialPost socialPost={post} />
                        </Panel>
                    ))
                }
            </ul>
        </>
    )
}

export default SocialFeed;
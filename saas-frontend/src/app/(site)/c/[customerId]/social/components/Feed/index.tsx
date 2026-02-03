'use client';

import { Panel } from "@/components/ux/Panel";
import React, {  } from "react";
import SocialPost from "./components/Post";

import UsePostsForCustomer from "./components/hooks/UsePostsForCustomer";

type Props = {
    customerId: string,
    gql_conn: gql_conn_type,
}

const SocialFeed : React.FC<Props> = (props) => {
    const socialPosts = UsePostsForCustomer(props.customerId)
    
    if (socialPosts.isLoading || socialPosts.data == null) return <div></div>

    if (socialPosts.data.length == 0) return (<div></div>)

    return (
        <>
            <ul>
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
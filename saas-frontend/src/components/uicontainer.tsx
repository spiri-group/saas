'use client'

import { SignalRProvider } from "./utils/SignalRProvider";

import Notifications from "./notifications";
import { JSX } from "react";

type Props = {
    me: {id : string},
    children: JSX.Element | JSX.Element[]
}

// This is a container for the UI components
// it provides support for real time messages and then the notifications provider
const UIContainer : React.FC<Props> = ({ me,  children}) => {

    return (
        <>
            <SignalRProvider userId={me.id}>
                    <>{children}</>
                    <Notifications />
            </SignalRProvider>
        </>
    )
}

export default UIContainer;
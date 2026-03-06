import { Suspense } from "react";
import UIContainer from "@/components/uicontainer";
import SetupUI from "./ui";
import { auth } from "@/lib/auth";

export default async function SetupPage() {
    const session = await auth();

    if (session == null || !session.user) {
        return <></>
    }

    return (
        <UIContainer me={session.user}>
            <Suspense fallback={null}>
                <SetupUI />
            </Suspense>
        </UIContainer>
    );
}

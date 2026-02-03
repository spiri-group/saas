import UIContainer from "@/components/uicontainer";
import UI from "./ui"
import { auth } from "@/lib/auth";

async function SetupPage() {
    const session = await auth();
    
    if (session == null || !session.user) {
        return <></>
    }
    
    return (
        <UIContainer 
            me={session.user}>
            <UI/>
        </UIContainer>
    )
}

export default SetupPage;
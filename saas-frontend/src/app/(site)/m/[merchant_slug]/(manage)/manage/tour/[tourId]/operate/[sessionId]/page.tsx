import UI from "./ui";
import UIContainer from "@/components/uicontainer";
import { auth } from "@/lib/auth";

async function OperatePage() {
    const session = await auth();

    if (session == null || !session.user) {
        return <></>
    }
    
    return (
        <UIContainer me={session.user}>
            <UI />
        </UIContainer>
        
    )
}

export default OperatePage;
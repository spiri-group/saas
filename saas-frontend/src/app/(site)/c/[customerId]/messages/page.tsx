import { auth } from "@/lib/auth";
import UI from "./ui";

async function CustomerMessagesPage({ params }: { params: Promise<{ customerId: string }> }) {
    const customerId = (await params).customerId;
    const session = await auth();
    
    if (session == null || !session.user || session.user.id !== customerId) {
        return <></>;
    }
    
    return (
        <UI customerId={customerId} />
    );
}

export default CustomerMessagesPage;
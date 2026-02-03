import { SignalRProvider } from "@/components/utils/SignalRProvider";
import UI from "./ui"

async function TrackCasePage({ params } : { params: Promise<{ caseId: string }> }) {
    const { caseId } = await params;
    
    return (
        <SignalRProvider userId={caseId}>
            <UI caseId={caseId} />  
        </SignalRProvider>
    )
}

export default TrackCasePage;
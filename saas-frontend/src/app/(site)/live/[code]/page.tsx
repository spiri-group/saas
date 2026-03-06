import UI from "./ui";

async function LiveSessionPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    return <UI code={code} />;
}

export default LiveSessionPage;

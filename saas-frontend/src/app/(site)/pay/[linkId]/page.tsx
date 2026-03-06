import UI from "./ui";

async function PaymentLinkPage({ params }: { params: Promise<{ linkId: string }> }) {
    const { linkId } = await params;
    return <UI linkId={linkId} />;
}

export default PaymentLinkPage;

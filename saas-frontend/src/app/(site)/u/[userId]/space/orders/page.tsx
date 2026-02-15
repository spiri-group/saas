import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UI from "./ui";

async function OrdersPage({ params }: { params: Promise<{ userId: string }> }) {
    const session = await auth();
    const { userId } = await params;

    if (session == null || !session.user) {
        redirect('/');
    }

    if (session.user.id !== userId) {
        redirect('/');
    }

    return <UI userId={userId} userEmail={session.user.email} />;
}

export default OrdersPage;
